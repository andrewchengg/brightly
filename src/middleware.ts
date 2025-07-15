// src/middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { routeAccessMap } from "./lib/settings";
import { getFallbackUserRole } from "./lib/secure-auth-fallback";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        res.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        res.cookies.set({ name, value: "", ...options });
      },
    },
  });

  const pathname = req.nextUrl.pathname;

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

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

    if (!user || authError) {
      if (isPublicPath || isSetupPath) {
        return res;
      }
      const redirectUrl = new URL("/sign-in", req.url);
      return NextResponse.redirect(redirectUrl);
    }

    // SECURITY FIX: Use secure database lookup instead of user_metadata
    const userRole =
      (await getFallbackUserRole(req, supabaseUrl, supabaseAnonKey)) ||
      "student";

    if (isSetupPath) {
      return res;
    }

    // Check if student needs to complete setup BEFORE checking route access
    if (userRole === "student" && !isSetupPath && !isPublicPath) {
      console.log(
        `[MIDDLEWARE] Checking setup for student ${user.id} on path ${pathname}`
      );
      try {
        const { data: student } = await supabase
          .from("Student")
          .select("initialSetupComplete")
          .eq("id", user.id)
          .single();

        console.log(`[MIDDLEWARE] Student setup data:`, student);

        if (student && student.initialSetupComplete === false) {
          console.log(
            `[MIDDLEWARE] Redirecting student ${user.id} to setup page`
          );
          const setupUrl = new URL("/student/complete-setup", req.url);
          return NextResponse.redirect(setupUrl);
        }
      } catch (error) {
        console.error("Error checking student setup status:", error);
        // Continue with normal flow if there's an error
      }
    }

    // Handle sign-in/sign-up redirects
    if (
      (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) &&
      pathname !== "/"
    ) {
      const dashboardUrl = new URL(`/${userRole}`, req.url);
      return NextResponse.redirect(dashboardUrl);
    }

    // Check route access permissions
    for (const [routePattern, allowedRoles] of Object.entries(routeAccessMap)) {
      const regex = new RegExp(`^${routePattern}(\\/.*|$)`);
      if (regex.test(pathname)) {
        if (!allowedRoles.includes(userRole)) {
          const redirectUrl = new URL(`/${userRole}`, req.url);
          return NextResponse.redirect(redirectUrl);
        }
        return res;
      }
    }

    return res;
  } catch (error) {
    console.error("Middleware error:", error);
    return res;
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|images|favicon.ico|.*\\..*).*)"],
};
