import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function GET() {
  try {
    // Check for API key
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'OPENAI_API_KEY is not set in environment variables',
          keyExists: false 
        },
        { status: 500 }
      );
    }
    
    // Try to initialize OpenAI client
    try {
      const openai = new OpenAI({
        apiKey: apiKey
      });
      
      // Try a simple completion to test the connection
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Say 'Connection successful!' if you can read this message." }
        ],
        max_tokens: 20
      });
      
      return NextResponse.json({
        status: 'success',
        message: 'OpenAI connection is working',
        keyExists: true,
        response: response.choices[0]?.message?.content
      });
      
    } catch (openaiError: any) {
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'Error connecting to OpenAI API',
          keyExists: true,
          error: openaiError.message 
        },
        { status: 500 }
      );
    }
    
  } catch (error: any) {
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Internal server error',
        error: error.message 
      },
      { status: 500 }
    );
  }
} 