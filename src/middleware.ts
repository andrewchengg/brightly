// src/middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { routeAccessMap } from "./lib/settings";

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        req.cookies.set({ name, value, ...options });
        response = NextResponse.next({
          request: {
            headers: req.headers,
          },
        });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        req.cookies.set({ name, value: "", ...options });
        response = NextResponse.next({
          request: {
            headers: req.headers,
          },
        });
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  const pathname = req.nextUrl.pathname;

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const publicPaths = [
      "/",
      "/sign-in",
      "/sign-up",
      "/auth/callback",
      "/auth/auth-code-error",
      "/test-xp-route",
    ];

    const allowedDuringSetupPaths = [
      "/sign-up/parent-child-setup", // Parent adding first child
      "/student/complete-setup", // Student completing their profile
    ];

    const isPublicPath = publicPaths.some((p) => {
      if (p.endsWith("/:path*")) {
        const base = p.replace("/:path*", "");
        return pathname.startsWith(base);
      }
      return pathname === p;
    });
    const isSetupPath = allowedDuringSetupPaths.some((p) =>
      pathname.startsWith(p)
    );

    if (!session) {
      if (isPublicPath || isSetupPath) {
        // Allow unauthenticated access to setup paths if they are designed for it (e.g. initial PIN login for student)
        return response;
      }
      const redirectUrl = new URL("/sign-in", req.url);
      return NextResponse.redirect(redirectUrl);
    }

    // User IS authenticated
    const {
      data: { user: authenticatedUser },
      error: getUserError,
    } = await supabase.auth.getUser();

    if (getUserError || !authenticatedUser) {
      console.warn(
        "Middleware: getUser failed despite session. Invalidating.",
        getUserError
      );
      if (isPublicPath || isSetupPath) return response;
      const redirectUrl = new URL("/sign-in", req.url);
      // Consider explicitly deleting cookies on `response` here
      return NextResponse.redirect(redirectUrl);
    }

    const userRole =
      (authenticatedUser.user_metadata?.role as string | undefined) ||
      "student";

    // If user is authenticated and is on a setup path, allow them.
    if (isSetupPath) {
      // Further checks can be done on the page itself if needed (e.g. student trying parent setup)
      return response;
    }

    // If authenticated user tries to access general sign-in/sign-up, redirect them.
    if (
      (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) &&
      pathname !== "/"
    ) {
      const dashboardUrl = new URL(`/${userRole}`, req.url);
      return NextResponse.redirect(dashboardUrl);
    }

    // Role-based access for other protected routes
    for (const [routePattern, allowedRoles] of Object.entries(routeAccessMap)) {
      const regex = new RegExp(`^${routePattern}(\\/.*|$)`);
      if (regex.test(pathname)) {
        if (!allowedRoles.includes(userRole)) {
          const redirectUrl = new URL(`/${userRole}`, req.url);
          return NextResponse.redirect(redirectUrl);
        }
        return response;
      }
    }

    // If no specific rule matched, but user is authenticated, allow (e.g., default dashboard)
    // This also implies that if a user is on their dashboard (e.g., /student), and their role matches an entry in routeAccessMap,
    // the loop above would have already returned `response`. If not, this final return handles it.
    return response;
  } catch (error) {
    console.error("Middleware error:", error);
    return NextResponse.next({
      request: {
        headers: req.headers,
      },
    });
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|images|favicon.ico|.*\\..*).*)"],
};
