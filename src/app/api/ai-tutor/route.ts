import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import {
  moderateUserContent,
  moderateAIResponse,
  checkRateLimit,
  generateEducationalSystemPrompt,
} from "@/lib/ai-moderation";
import {
  AITutorRequest,
  AITutorResponse,
} from "@/components/AILearningAssistant/types";

// Initialize OpenAI client with API key from environment variable
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OpenAI API key is not set in environment variables");
  }

  return new OpenAI({
    apiKey: apiKey,
  });
};

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check rate limiting
    if (!checkRateLimit(user.id, 50, 60 * 60 * 1000)) {
      // 50 requests per hour
      return NextResponse.json(
        {
          error:
            "Rate limit exceeded. Please wait before asking more questions.",
        },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const requestBody: AITutorRequest = await req.json();
    const { messages, context } = requestBody;

    // Debug logging to see what we're receiving
    console.log("AI Tutor API received request:", {
      messages: messages?.length || 0,
      hasContext: !!context,
      hasSession: !!context?.session,
      sessionType: context?.session?.sessionType,
      requestBody: JSON.stringify(requestBody, null, 2),
    });

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.log("ERROR: Messages validation failed", { messages });
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    if (!context || !context.session) {
      console.log("ERROR: Context validation failed", { context });
      return NextResponse.json(
        { error: "Session context is required" },
        { status: 400 }
      );
    }

    // Moderate the latest user message
    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage && lastUserMessage.role === "user") {
      const moderation = moderateUserContent(lastUserMessage.content);
      if (!moderation.isAllowed) {
        return NextResponse.json(
          {
            error:
              moderation.reason || "Message contains inappropriate content",
            flagged: true,
          },
          { status: 400 }
        );
      }

      // Use sanitized content
      lastUserMessage.content =
        moderation.sanitizedContent || lastUserMessage.content;
    }

    // Get OpenAI client
    let openai;
    try {
      openai = getOpenAIClient();
    } catch (error) {
      return NextResponse.json(
        {
          error:
            "AI service temporarily unavailable. Please contact administrator.",
        },
        { status: 500 }
      );
    }

    // Build context for the AI
    let contextString = "";

    if (context.passage) {
      contextString += `PASSAGE CONTEXT:\n`;
      contextString += `Title: "${context.passage.title || "Untitled"}"\n`;
      contextString += `Content: ${context.passage.content.substring(0, 800)}${
        context.passage.content.length > 800 ? "..." : ""
      }\n\n`;
    }

    if (context.question) {
      contextString += `CURRENT QUESTION:\n`;
      contextString += `Text: ${context.question.text}\n`;
      contextString += `Type: ${context.question.questionType}\n`;

      if (context.question.options && context.question.options.length > 0) {
        contextString += `Options:\n`;
        context.question.options.forEach((opt, index) => {
          const letter = String.fromCharCode(65 + index);
          const marker = context.question?.userAnswer === opt.id ? "→ " : "";
          contextString += `  ${marker}${letter}. ${opt.text}\n`;
        });
      }

      if (context.question.hint) {
        contextString += `Hint: ${context.question.hint}\n`;
      }

      if (
        context.session.isCompleted &&
        context.question.isCorrect !== undefined
      ) {
        contextString += `Student Result: ${
          context.question.isCorrect ? "CORRECT" : "INCORRECT"
        }\n`;
        if (context.question.explanation) {
          contextString += `Official Explanation: ${context.question.explanation}\n`;
        }
      }
      contextString += "\n";
    }

    contextString += `SESSION INFO:\n`;
    contextString += `Type: ${context.session.sessionType}\n`;
    contextString += `Progress: ${context.session.answeredQuestions}/${context.session.totalQuestions} questions\n`;
    contextString += `Correct Answers: ${context.session.correctAnswers}\n`;
    contextString += `Status: ${
      context.session.isCompleted ? "COMPLETED" : "IN PROGRESS"
    }\n`;

    // Generate educational system prompt
    const systemPrompt = generateEducationalSystemPrompt(
      context.session.sessionType,
      context.session.studentLevel,
      !!context.question,
      !!context.passage
    );

    const fullSystemPrompt = `${systemPrompt}\n\nCURRENT CONTEXT:\n${contextString}`;

    // Prepare messages for OpenAI
    const openAIMessages = [
      { role: "system" as const, content: fullSystemPrompt },
      ...messages.slice(-10), // Only send last 10 messages to avoid token limits
    ];

    // Call OpenAI API with safety parameters
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: openAIMessages,
      max_tokens: 400,
      temperature: 0.7,
      frequency_penalty: 0.3,
      presence_penalty: 0.3,
      user: user.id, // For OpenAI's safety monitoring
    });

    // Extract and moderate AI response
    const rawAIMessage =
      response.choices[0]?.message?.content ||
      "I apologize, but I couldn't generate a helpful response. Could you rephrase your question?";

    const moderatedAIMessage = moderateAIResponse(rawAIMessage);

    // Return moderated AI response
    const aiResponse: AITutorResponse = {
      message: moderatedAIMessage,
      flagged: false,
    };

    return NextResponse.json(aiResponse);
  } catch (error: any) {
    console.error("Error in AI tutor API:", error);

    // Don't expose internal errors to users
    const userFriendlyError = error.message?.includes("rate limit")
      ? "Too many requests. Please wait before asking again."
      : error.message?.includes("moderation")
      ? "Your message was flagged by our safety system. Please rephrase your question."
      : "I'm having trouble right now. Please try again in a moment.";

    return NextResponse.json(
      { error: userFriendlyError },
      { status: error.status || 500 }
    );
  }
}
