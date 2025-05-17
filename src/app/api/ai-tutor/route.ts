import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client with API key from environment variable
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key is not set in environment variables');
  }
  
  return new OpenAI({
    apiKey: apiKey
  });
};

export async function POST(req: NextRequest) {
  try {
    // Get messages from request body
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Get OpenAI client with available API key
    let openai;
    try {
      openai = getOpenAIClient();
    } catch (error) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please contact administrator.' },
        { status: 500 }
      );
    }

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // You can adjust the model as needed
      messages: messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    // Extract assistant message
    const aiMessage = response.choices[0]?.message?.content || 'I apologize, but I couldn\'t generate a response.';

    // Return AI response
    return NextResponse.json({ message: aiMessage });

  } catch (error: any) {
    console.error('Error in AI tutor API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get AI tutor response' },
      { status: 500 }
    );
  }
} 