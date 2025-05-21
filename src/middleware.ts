import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { routeAccessMap } from './lib/settings'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  
  // Get the pathname from the URL
  const pathname = req.nextUrl.pathname
  
  try {
    // Get the user session
    const { data: { session } } = await supabase.auth.getSession()
    
    // If the user is not authenticated and trying to access a protected route,
    // redirect them to the sign-in page
    if (!session) {
      // Allow access to sign-in and sign-up routes
      if (pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up') || pathname === '/') {
        return res
      }
      
      // Redirect to sign-in for all other routes
      const redirectUrl = new URL('/sign-in', req.url)
      return NextResponse.redirect(redirectUrl)
    }
    
    // If the user is authenticated, check their role for access to protected routes
    const userRole = session.user?.user_metadata?.role as string
    
    // Check if the current path requires specific roles
    for (const [routePattern, allowedRoles] of Object.entries(routeAccessMap)) {
      const regex = new RegExp(`^${routePattern}$`)
      if (regex.test(pathname)) {
        // If the user's role is not in the allowed roles, redirect to the appropriate dashboard
        if (!allowedRoles.includes(userRole)) {
          const redirectUrl = new URL(`/${userRole || 'student'}`, req.url)
          return NextResponse.redirect(redirectUrl)
        }
        break
      }
    }
    
    return res
  } catch (error) {
    console.error('Middleware error:', error)
    return res
  }
}

// Update the matcher to include all protected routes including admin routes
export const config = {
  matcher: [
    '/',
    '/sign-in',
    '/sign-up',
    '/auth/:path*',
    '/student/:path*',
    '/parent/:path*',
    '/teacher/:path*',
    '/admin/:path*',
    '/list/:path*',
  ],
}
