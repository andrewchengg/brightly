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
  promptDetails?: string; // e.g., text of passage, or description of picture if no image sent
  guidingQuestions?: string[];
  // audioDurationSeconds?: number; // For fluency metrics if calculated client-side
}

async function analyzeWithLLM(systemMessage: string, userMessage: string) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview", // Or gpt-3.5-turbo for cost, but gpt-4 better for analysis
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage }
      ],
      temperature: 0.3, // Lower temperature for more factual analysis
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
    const { transcription, promptTitle, promptType, promptDetails, guidingQuestions } = body;

    if (!transcription) {
      return NextResponse.json({ error: 'Transcription is required.' }, { status: 400 });
    }

    let analysisResults: Record<string, string> = {};

    // 1. Comprehension and Response
    const comprehensionPrompt = `You are an expert PSLE Chinese Oral examiner.
    The student was given an oral prompt titled "${promptTitle}" (${promptType}).
    ${promptDetails ? `Details of the prompt: "${promptDetails}"` : ''}
    ${guidingQuestions && guidingQuestions.length > 0 ? `Guiding questions were: ${guidingQuestions.join(", ")}` : ''}
    The student's transcribed response is: "${transcription}"

    Analyze the following:
    1. Comprehension: Did the student understand the prompt/picture/video?
    2. Relevance: Was the response relevant to the prompt and guiding questions?
    3. Appropriateness: Was the language and content appropriate?
    Provide specific examples and constructive feedback. Keep feedback concise and actionable for a student.
    Format your response clearly under headings: "Comprehension:", "Relevance:", "Appropriateness:".`;
    analysisResults.comprehensionAndResponse = await analyzeWithLLM(
        "You are an expert PSLE Chinese Oral examiner providing feedback.",
        comprehensionPrompt
    );
    
    // 2. Vocabulary and Sentence Structures
    const vocabStructurePrompt = `Analyze the vocabulary and sentence structures in this transcribed PSLE Chinese oral response: "${transcription}".
    Consider:
    - Range and appropriateness of vocabulary for a PSLE student.
    - Variety and correctness of sentence structures (for spoken Chinese).
    - Any notable strengths or areas for improvement.
    Provide concise feedback under headings "Vocabulary:" and "Sentence Structures:".`;
    analysisResults.vocabularyAndStructure = await analyzeWithLLM(
        "You are a language expert assessing vocabulary and sentence structure.",
        vocabStructurePrompt
    );

    // 3. Fluency and Coherence (based on transcription)
    const fluencyCoherencePrompt = `Analyze the fluency and coherence of this transcribed PSLE Chinese oral response: "${transcription}".
    Consider:
    - Logical flow of ideas.
    - Clear organization of thoughts.
    - Presence of many filler words (if apparent from text, e.g., "呃", "那个") or abrupt topic shifts.
    (Note: True fluency assessment requires audio, this is based on text structure.)
    Provide concise feedback under headings "Fluency (Text-based):" and "Coherence:".`;
    analysisResults.fluencyAndCoherence = await analyzeWithLLM(
        "You are analyzing the textual flow and organization of a spoken response.",
        fluencyCoherencePrompt
    );
    
    // Pronunciation & Intonation - Very hard to do from text alone.
    // We can add a placeholder or a very general comment.
    analysisResults.pronunciationAndIntonation = "Pronunciation and intonation are best assessed by listening to the recording. Ensure you speak clearly and with appropriate tones. Practice reading aloud regularly.";


    return NextResponse.json({ feedback: analysisResults });

  } catch (error: any) {
    console.error('Error in /api/analyze-oral-response:', error);
    return NextResponse.json({ error: 'Failed to analyze oral response.', details: error.message }, { status: 500 });
  }
}