import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'
  
  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Check if it's a new user and create a Student record if needed
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Check if user has a role in metadata (if not, default to 'student')
        const role = user.user_metadata?.role || 'student'
        
        if (role === 'student') {
          // Check if student record already exists
          const { data: existingStudent } = await supabase
            .from('Student')
            .select('id')
            .eq('id', user.id)
            .single()
            
          if (!existingStudent) {
            // Create a new student record with information from Google account
            const name = user.user_metadata?.full_name || user.email?.split('@')[0] || ''
            const username = user.email?.split('@')[0] || ''
            
            await supabase
              .from('Student')
              .insert([
                {
                  id: user.id,
                  username,
                  name,
                  email: user.email,
                }
              ])
          }
        } else if (role === 'parent') {
          // Check if parent has already set up a child account
          const { data: existingParent } = await supabase
            .from('Parent')
            .select('id')
            .eq('id', user.id)
            .single()
            
          if (!existingParent) {
            // Parent hasn't completed setup yet, redirect to parent-child setup
            const name = user.user_metadata?.full_name || user.email?.split('@')[0] || ''
            
            const forwardedHost = request.headers.get('x-forwarded-host')
            const redirectOrigin = forwardedHost ? `https://${forwardedHost}` : origin
            
            return NextResponse.redirect(
              `${redirectOrigin}/sign-up/parent-child-setup?parentId=${user.id}&email=${encodeURIComponent(user.email || '')}&name=${encodeURIComponent(name)}`
            )
          }
        }
      }
      
      const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }
  
  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
} 