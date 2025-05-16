import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { cookies } from 'next/headers';

// This is for development purposes only - in production, use proper environment variables
let tempApiKey: string | null = null;

export async function POST(req: NextRequest) {
  try {
    const { apiKey } = await req.json();
    
    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }
    
    // Store in memory for this server instance
    tempApiKey = apiKey;
    
    // Store in a cookie for persistence across server restarts
    // Note: In a real app, you would never store API keys in cookies
    // This is just for development purposes
    cookies().set('temp_openai_key', apiKey, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 86400, // 1 day
      path: '/',
    });
    
    return NextResponse.json({ success: true, message: 'API key set successfully' });
    
  } catch (error) {
    console.error('Error setting API key:', error);
    return NextResponse.json(
      { error: 'Failed to set API key' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // For testing if a key is set
  const isKeySet = tempApiKey || cookies().get('temp_openai_key');
  return NextResponse.json({ 
    keySet: Boolean(isKeySet),
    message: isKeySet ? 'API key is set' : 'No API key set'
  });
}

// Export for other server components to use
export function getTemporaryApiKey() {
  return tempApiKey || cookies().get('temp_openai_key')?.value || null;
} 