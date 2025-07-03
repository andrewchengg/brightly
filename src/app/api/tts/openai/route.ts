// src/app/api/tts/openai/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

// Initialize OpenAI client
// Ensure OPENAI_API_KEY is set in your .env.local
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OpenAI API Key is not configured.");
    return NextResponse.json(
      { error: "TTS service not configured." },
      { status: 503 }
    );
  }

  try {
    const {
      text,
      voice = "alloy",
      model = "tts-1",
      speed = 1.0,
    } = await req.json(); // Added voice, model, speed options

    if (!text) {
      return NextResponse.json(
        { error: "Text is required for TTS." },
        { status: 400 }
      );
    }

    // Validate voice - OpenAI has specific voices: alloy, echo, fable, onyx, nova, shimmer
    const validVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
    const selectedVoice = validVoices.includes(voice) ? voice : "alloy"; // Default to "alloy"

    // Validate model - tts-1 or tts-1-hd
    const selectedModel = model === "tts-1-hd" ? "tts-1-hd" : "tts-1";

    // Validate speed
    const selectedSpeed = Math.max(0.25, Math.min(4.0, Number(speed) || 1.0));

    console.log(
      `OpenAI TTS Request: Text length=${text.length}, Voice=${selectedVoice}, Model=${selectedModel}, Speed=${selectedSpeed}`
    );

    const LIKELY_OPTIMISTIC_TIMEOUT = 1000 * 28; // 28 seconds for timeout.
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      LIKELY_OPTIMISTIC_TIMEOUT
    );

    // Call OpenAI API for speech generation
    const mp3Response = await openai.audio.speech.create({
      model: selectedModel,
      voice: selectedVoice as
        | "alloy"
        | "echo"
        | "fable"
        | "onyx"
        | "nova"
        | "shimmer", // Cast to valid types
      input: text,
      response_format: "mp3", // OpenAI supports mp3, opus, aac, flac
      speed: selectedSpeed,
    });

    clearTimeout(timeoutId);

    if (!mp3Response.ok) {
      // OpenAI client responses have an `ok` property
      const errorBody = await mp3Response.text(); // Or .json() if it returns JSON error
      console.error("OpenAI TTS API Error:", mp3Response.status, errorBody);
      return NextResponse.json(
        {
          error: `OpenAI TTS API Error: ${mp3Response.statusText} - ${errorBody}`,
        },
        { status: mp3Response.status }
      );
    }

    const readableStream = mp3Response.body;
    if (!readableStream) {
      return NextResponse.json(
        { error: "Failed to get readable stream from OpenAI TTS." },
        { status: 500 }
      );
    }

    // Stream the audio back
    return new NextResponse(readableStream, {
      headers: {
        "Content-Type": "audio/mpeg", // Standard MIME type for MP3
      },
    });
  } catch (error: any) {
    console.error("Error in OpenAI TTS route:", error);
    if (error.name === "AbortError") {
      return NextResponse.json(
        { error: "TTS request timed out." },
        { status: 504 }
      );
    }
    let errorMessage = "Failed to process TTS request.";
    if (
      error.response &&
      error.response.data &&
      error.response.data.error &&
      error.response.data.error.message
    ) {
      errorMessage = error.response.data.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { error: errorMessage, details: error.stack },
      { status: 500 }
    );
  }
}
