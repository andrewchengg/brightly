import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Refresh the user's session if it exists
  await supabase.auth.getSession()

  return res
}

// Only run middleware on auth-related routes, the root page, and protected routes
export const config = {
  matcher: [
    '/',
    '/sign-in',
    '/sign-up',
    '/auth/:path*',
    '/student/:path*',
    '/parent/:path*',
    '/teacher/:path*',
  ],
}
