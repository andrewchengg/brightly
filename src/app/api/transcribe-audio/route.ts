// src/app/api/transcribe-audio/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client 
// Ensure OPENAI_API_KEY is set in your .env.local
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | null;
    // const language = formData.get('language') as string | null; // Example: 'zh' for Mandarin

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided.' }, { status: 400 });
    }
    
    console.log("Received audio file:", audioFile.name, audioFile.type, audioFile.size);

    // Use OpenAI's Whisper API for transcription
    // Note: OpenAI SDK expects a `File` object or a readable stream.
    // For older Node versions or certain environments, you might need to convert Blob to Buffer first
    // and then pass it as `file: { buffer: Buffer, name: string }`.
    // However, Next.js Edge/Node runtime with recent OpenAI SDK versions should handle `File` directly from FormData.
    
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1', // Or other models if available/preferred
      // language: language || undefined, // Optional: Specify language
      response_format: "json", // Get just text or more verbose output
    });

    console.log("OpenAI Transcription successful:", transcription.text);

    return NextResponse.json({ transcription: transcription.text });

  } catch (error: any) {
    console.error('Error in /api/transcribe-audio:', error.message);
    let errorMessage = 'Failed to transcribe audio.';
    if (error.response && error.response.data && error.response.data.error) {
        errorMessage = error.response.data.error.message;
    } else if (error.message) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage, details: error }, { status: 500 });
  }
}