// src/app/api/analyze-oral-response/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface AnalysisRequestBody {
  transcription: string;
  promptTitle: string;
  promptType: "picture" | "video" | "passage";
  promptDetails?: string; 
  guidingQuestions?: string[];
  originalPassageText?: string; // Specifically for passage reading
}

// Helper for structured feedback
interface PassageReadingFeedback {
  overallImpression?: string;
  wordAccuracy?: {
    correctWords?: number;
    misreadWords?: Array<{ original: string; transcribedAs: string }>;
    omittedWords?: string[];
    addedWords?: string[];
    comments?: string;
  };
  fluency?: {
    textBasedObservations?: string; // e.g., about hesitations, repetitions if transcribed
    generalAdvice?: string;
  };
  pronunciationAndIntonation?: {
    generalAdvice?: string;
    // Potentially: commonPitfallsMentioned?: string[]; // If we add keyword checking
  };
}


async function analyzeWithLLM(systemMessage: string, userMessage: string): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview", 
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage }
      ],
      temperature: 0.2, // Lower temperature for more factual, less creative analysis
      // response_format: { type: "json_object" }, // If we want structured JSON output directly
    });
    return completion.choices[0]?.message?.content || "Could not get analysis.";
  } catch (error) {
    console.error("Error calling OpenAI for analysis:", error);
    return `Error during analysis: ${(error as Error).message}`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: AnalysisRequestBody = await req.json();
    const { transcription, promptTitle, promptType, promptDetails, guidingQuestions, originalPassageText } = body;

    if (!transcription) {
      return NextResponse.json({ error: 'Transcription is required.' }, { status: 400 });
    }

    let feedbackResponse: PassageReadingFeedback | Record<string, string> = {};

    if (promptType === "passage" && originalPassageText) {
      // --- Specific Analysis for Passage Reading ---
      const systemMessagePassage = `You are an expert PSLE Chinese Oral examiner specializing in "Passage Reading" (朗读短文). Your task is to analyze a student's transcribed reading against the original passage. Focus on:
1.  **Word Accuracy**: Identify misread words (substitutions), omitted words, and added words.
2.  **Fluency (Text-based)**: Comment on textual indicators of fluency like hesitations (if transcribed as "呃", "那个"), self-corrections, or unnatural breaks.
3.  **Pronunciation and Intonation (General Advice)**: Provide general advice on clear pronunciation, correct tones, and appropriate intonation for different sentence types (statements, questions, exclamations) as per PSLE standards. Do NOT attempt to judge actual pronunciation from text.

Provide feedback in a structured manner. Be specific and constructive.
The student was reading a passage titled "${promptTitle}".`;

      const userMessagePassage = `Original Passage:
---
${originalPassageText}
---
Student's Transcribed Reading:
---
${transcription}
---
Please provide your analysis focusing on Word Accuracy, Text-based Fluency, and general advice for Pronunciation & Intonation.
For Word Accuracy, list specific examples of misread, omitted, or added words if any.
For Fluency, comment on any textual evidence of dysfluency.
For Pronunciation & Intonation, offer general PSLE-relevant advice.
Give an "Overall Impression" first.
Structure your response clearly. Example for Word Accuracy:
Misread: "高兴" read as "开心"
Omitted: "非常"
Added: "真的"
`;

      const rawAnalysis = await analyzeWithLLM(systemMessagePassage, userMessagePassage);
      
      // Attempt to parse the rawAnalysis into a more structured format.
      // This is a simple parsing attempt; more robust parsing might be needed.
      feedbackResponse = {
        overallImpression: rawAnalysis.match(/Overall Impression:([\s\S]*?)(Word Accuracy:|Fluency:|Pronunciation and Intonation:|$)/i)?.[1]?.trim() || "Analysis did not provide an overall impression.",
        wordAccuracy: { comments: rawAnalysis.match(/Word Accuracy:([\s\S]*?)(Fluency:|Pronunciation and Intonation:|$)/i)?.[1]?.trim() || "No specific comments on word accuracy provided." },
        fluency: { textBasedObservations: rawAnalysis.match(/Fluency:([\s\S]*?)(Pronunciation and Intonation:|$)/i)?.[1]?.trim() || "No specific comments on text-based fluency provided." },
        pronunciationAndIntonation: { generalAdvice: rawAnalysis.match(/Pronunciation and Intonation:([\s\S]*?)$/i)?.[1]?.trim() || "Remember to read clearly with correct tones and appropriate expression." }
      };
      // You could further refine parsing for misread, omitted, added words if the LLM consistently formats them.

    } else { // For Picture/Video Conversation (existing logic)
      const comprehensionPrompt = `You are an expert PSLE Chinese Oral examiner.
      The student was given an oral prompt titled "${promptTitle}" (${promptType}).
      ${promptDetails ? `Details of the prompt: "${promptDetails}"` : ''}
      ${guidingQuestions && guidingQuestions.length > 0 ? `Guiding questions were: ${guidingQuestions.join(", ")}` : ''}
      The student's transcribed response is: "${transcription}"

      Analyze the following:
      1. Comprehension & Relevance: Did the student understand the prompt/picture/video and respond relevantly to guiding questions?
      2. Vocabulary & Structure: Assess the range and appropriateness of vocabulary and sentence structures for a PSLE student.
      3. Fluency & Coherence (Text-based): Comment on logical flow, organization, and any textual signs of dysfluency.
      Provide specific examples and constructive feedback. Keep feedback concise and actionable.
      Format your response clearly under distinct headings for each aspect.`;
      
      const rawAnalysis = await analyzeWithLLM(
          "You are an expert PSLE Chinese Oral examiner providing feedback.",
          comprehensionPrompt
      );
      // Simple split for conversation feedback, assuming LLM provides distinct sections
      feedbackResponse = {
          comprehensionAndResponse: rawAnalysis.match(/Comprehension & Relevance:([\s\S]*?)(Vocabulary & Structure:|Fluency & Coherence|$)/i)?.[1]?.trim() || "N/A",
          vocabularyAndStructure: rawAnalysis.match(/Vocabulary & Structure:([\s\S]*?)(Fluency & Coherence|$)/i)?.[1]?.trim() || "N/A",
          fluencyAndCoherence: rawAnalysis.match(/Fluency & Coherence:([\s\S]*?)$/i)?.[1]?.trim() || "N/A",
          pronunciationAndIntonation: "For conversation, focus on natural speech flow, clear articulation, and appropriate tones. Practice speaking spontaneously on various topics."
      };
    }

    return NextResponse.json({ feedback: feedbackResponse });

  } catch (error: any) {
    console.error('Error in /api/analyze-oral-response:', error);
    return NextResponse.json({ error: 'Failed to analyze oral response.', details: error.message }, { status: 500 });
  }
}