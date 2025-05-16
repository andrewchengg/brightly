import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    // Check if the environment variables needed for supabase admin are set
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    // Check service role key format (without revealing the actual key)
    const serviceKeyFormat = serviceRoleKey 
      ? `${serviceRoleKey.substring(0, 3)}...${serviceRoleKey.substring(serviceRoleKey.length - 3)}` 
      : 'not set';
    
    const anonKeyFormat = anonKey 
      ? `${anonKey.substring(0, 3)}...${anonKey.substring(anonKey.length - 3)}` 
      : 'not set';
    
    return NextResponse.json({
      status: 'ok',
      environment: {
        nodeEnv: process.env.NODE_ENV,
        supabaseUrl,
        serviceKeyFormat,
        anonKeyFormat,
        hasSupabaseUrl: !!supabaseUrl,
        hasServiceRoleKey: !!serviceRoleKey,
        hasAnonKey: !!anonKey
      }
    })
  } catch (error: any) {
    console.error("Debug API error:", error);
    return NextResponse.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    )
  }
} 