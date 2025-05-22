// src/app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server' // Ensure this is your SSR client

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  
  if (code) {
    const supabase = createClient() // This uses your server client
    const { error: exchangeError, data: sessionData } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!exchangeError && sessionData?.session?.user) { // Check for session and user
      const user = sessionData.session.user;
      const role = user.user_metadata?.role || 'student';
      
      // Logic for creating student/parent DB records if they don't exist
      if (role === 'student') {
        const { data: existingStudent } = await supabase
          .from('Student')
          .select('id')
          .eq('id', user.id)
          .single();
            
        if (!existingStudent) {
          const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'New Student';
          const username = user.user_metadata?.username || user.email?.split('@')[0] || `student${Date.now()}`;
          await supabase.from('Student').insert([
            { id: user.id, username, name, email: user.email, initialSetupComplete: false, schoolLevel: 1 /* default */ },
          ]);
        }
      } else if (role === 'parent') {
        const { data: existingParent } = await supabase
          .from('Parent')
          .select('id')
          .eq('id', user.id)
          .single();
            
        if (!existingParent) {
          const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'New Parent';
          const username = user.user_metadata?.username || user.email?.split('@')[0] || `parent${Date.now()}`;
          // IMPORTANT: Parent creation in DB might be part of parent-child-setup
          // For now, we just ensure the redirect happens for new OAuth parents
          const forwardedHost = request.headers.get('x-forwarded-host');
          const redirectOrigin = forwardedHost ? `https://${forwardedHost}` : origin;
          if (user.id && user.email) {
            return NextResponse.redirect(
              `${redirectOrigin}/sign-up/parent-child-setup?parentId=${user.id}&email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(name)}`
            );
          } else {
             console.error("User ID or Email is missing after OAuth for parent.");
             return NextResponse.redirect(`${origin}/auth/auth-code-error`);
          }
        }
      }
      // End of record creation logic

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    } else {
      console.error("Auth callback error (exchangeCodeForSession or no session/user):", exchangeError);
    }
  } else {
    console.error("Auth callback: No code found in searchParams.");
  }
  
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}