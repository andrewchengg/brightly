// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { routeAccessMap } from './lib/settings'

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const pathname = req.nextUrl.pathname

  try {
    const { data: { session } } = await supabase.auth.getSession()

    const publicPaths = [
      '/',
      '/sign-in',
      '/sign-up',
      '/auth/callback',
      '/auth/auth-code-error',
      '/test-xp-route' // If this is a public test page
    ];

    const isPublicPath = publicPaths.some(p => {
      // Exact match or startsWith for dynamic segments like /auth/:path*
      if (p.endsWith('/:path*')) {
        const base = p.replace('/:path*', '');
        return pathname.startsWith(base);
      }
      return pathname === p;
    });
    
    if (!session) {
      if (isPublicPath) {
        return response;
      }
      const redirectUrl = new URL('/sign-in', req.url);
      return NextResponse.redirect(redirectUrl);
    }

    // User is authenticated. For critical role checking, get the authenticated user.
    const { data: { user: authenticatedUser }, error: getUserError } = await supabase.auth.getUser();

    if (getUserError || !authenticatedUser) {
      console.warn("Middleware: getUser failed after getSession succeeded. Invalidating session.", getUserError);
      if (isPublicPath) return response; 
      const redirectUrl = new URL('/sign-in', req.url);
      // Optionally clear cookies if session is deemed invalid by getUser()
      // response.cookies.delete('sb-access-token'); // Check actual Supabase cookie names
      // response.cookies.delete('sb-refresh-token');
      return NextResponse.redirect(redirectUrl);
    }
    
    const userRole = (authenticatedUser.user_metadata?.role as string | undefined) || 'student';

    if ((pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up')) && pathname !== '/') {
        const dashboardUrl = new URL(`/${userRole}`, req.url);
        return NextResponse.redirect(dashboardUrl);
    }
    
    for (const [routePattern, allowedRoles] of Object.entries(routeAccessMap)) {
      const regex = new RegExp(`^${routePattern}(\\/.*|$)`)
      if (regex.test(pathname)) {
        if (!allowedRoles.includes(userRole)) {
          const redirectUrl = new URL(`/${userRole}`, req.url)
          return NextResponse.redirect(redirectUrl)
        }
        return response; 
      }
    }
    
    return response;

  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.next({
        request: {
            headers: req.headers,
        },
    });
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|images|favicon.ico|.*\\..*).*)',
  ],
}