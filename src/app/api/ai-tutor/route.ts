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

// Initialize OpenRouter client (using OpenAI SDK with OpenRouter endpoints)
const getOpenRouterClient = () => {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OpenRouter API key is not set in environment variables");
  }

  return new OpenAI({
    apiKey: apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": process.env.SITE_URL || "http://localhost:3000",
      "X-Title": "Brightly - Educational Learning Platform",
    },
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

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    if (!context || !context.session) {
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
      openai = getOpenRouterClient();
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

    // Add selected text context if available
    if (context.selectedText) {
      contextString += `SELECTED TEXT:\n${context.selectedText}\n\n`;
    }

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
      !!context.passage,
      context.session.subjectId,
      context.session.subjectName
    );

    // Enhanced prompt when selected text is present
    let enhancedSystemPrompt = systemPrompt;
    if (context.selectedText) {
      enhancedSystemPrompt += `\n\nIMPORTANT: The student has selected the text "${context.selectedText}" from the passage. If they ask questions like "What does this mean?", "Explain this", "What is this?", or similar, they are referring to this selected text: "${context.selectedText}". Provide a clear explanation of this specific text including its meaning, pronunciation (pinyin if Chinese), and context within the passage.`;
    }

    const fullSystemPrompt = `${enhancedSystemPrompt}\n\nCURRENT CONTEXT:\n${contextString}`;

    // Prepare messages for OpenAI
    const openAIMessages = [
      { role: "system" as const, content: fullSystemPrompt },
      ...messages.slice(-10), // Only send last 10 messages to avoid token limits
    ];

    // Call OpenRouter API with safety parameters
    const response = await openai.chat.completions.create({
      model: "anthropic/claude-3.5-haiku", // Using Claude 3.5 Haiku for educational content
      messages: openAIMessages,
      max_tokens: 400,
      temperature: 0.7,
      // Remove frequency_penalty and presence_penalty as they may not be supported by all models
    });

    // Extract and moderate AI response
    const rawAIMessage =
      response.choices[0]?.message?.content ||
      "I apologize, but I couldn't generate a helpful response. Could you rephrase your question?";

    // Moderate the AI response
    const moderatedMessage = moderateAIResponse(rawAIMessage);

    return NextResponse.json({
      message: moderatedMessage,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "An unexpected error occurred. Please try again.",
      },
      { status: 500 }
    );
  }
}
