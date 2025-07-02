// src/app/api/auth/sign-in-with-username/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient, type CookieOptions } from "@supabase/ssr"; // For setting auth cookies
import { cookies } from "next/headers";

// Rate limiting map (in memory - consider using Redis for production)
const loginAttempts = new Map<string, { count: number; timestamp: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function isRateLimited(identifier: string): boolean {
  const now = Date.now();
  const userAttempts = loginAttempts.get(identifier);

  // Clean up old entries
  for (const [key, value] of loginAttempts.entries()) {
    if (now - value.timestamp > WINDOW_MS) {
      loginAttempts.delete(key);
    }
  }

  if (!userAttempts) {
    loginAttempts.set(identifier, { count: 1, timestamp: now });
    return false;
  }

  if (now - userAttempts.timestamp > WINDOW_MS) {
    loginAttempts.set(identifier, { count: 1, timestamp: now });
    return false;
  }

  if (userAttempts.count >= MAX_ATTEMPTS) {
    return true;
  }

  userAttempts.count++;
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    const ip =
      request.headers.get("x-forwarded-for") || request.ip || "unknown";

    if (!username || !password) {
      console.warn("[AUTH] Missing credentials attempt from IP:", ip);
      return NextResponse.json(
        { error: "Username and password are required." },
        { status: 400 }
      );
    }

    // Check rate limiting
    const rateLimitKey = `${username}:${ip}`;
    if (isRateLimited(rateLimitKey)) {
      console.warn("[AUTH] Rate limit exceeded for:", rateLimitKey);
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429 }
      );
    }

    const cookieStore = cookies();
    const supabaseAdmin = createAdminClient();

    let emailToTry: string | null = null;
    let userRole: string = "student";
    let userId: string | null = null;

    // Check Student table first (most common)
    const { data: studentData, error: studentError } = await supabaseAdmin
      .from("Student")
      .select("id, email, name")
      .eq("username", username)
      .single();

    if (!studentError && studentData?.email) {
      emailToTry = studentData.email;
      userRole = "student";
      userId = studentData.id;
    } else {
      // Check Parent table
      const { data: parentData, error: parentError } = await supabaseAdmin
        .from("Parent")
        .select("id, email, name")
        .eq("username", username)
        .single();

      if (!parentError && parentData?.email) {
        emailToTry = parentData.email;
        userRole = "parent";
        userId = parentData.id;
      } else {
        // Check Teacher table
        const { data: teacherData, error: teacherError } = await supabaseAdmin
          .from("Teacher")
          .select("id, email, name")
          .eq("username", username)
          .single();

        if (!teacherError && teacherData?.email) {
          emailToTry = teacherData.email;
          userRole = "teacher";
          userId = teacherData.id;
        } else {
          // Check Admin table
          const { data: adminData, error: adminError } = await supabaseAdmin
            .from("Admin")
            .select("id, username")
            .eq("username", username)
            .single();

          if (!adminError && adminData?.username) {
            const { data: adminAuthUser, error: getAdminAuthError } =
              await supabaseAdmin.auth.admin.getUserById(adminData.id);

            if (!getAdminAuthError && adminAuthUser?.user?.email) {
              emailToTry = adminAuthUser.user.email;
              userRole = "admin";
              userId = adminData.id;
            }
          }
        }
      }
    }

    if (!emailToTry) {
      console.warn(
        "[AUTH] Invalid username attempt:",
        username,
        "from IP:",
        ip
      );
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    // Attempt authentication with found email
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabaseServerClientForAuth = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get: (name: string) => cookieStore.get(name)?.value,
          set: (name: string, value: string, options: CookieOptions) => {
            cookieStore.set({ name, value, ...options });
          },
          remove: (name: string, options: CookieOptions) => {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      }
    );

    const { data: signInData, error: signInError } =
      await supabaseServerClientForAuth.auth.signInWithPassword({
        email: emailToTry,
        password: password,
      });

    if (signInError) {
      console.warn(
        "[AUTH] Failed login attempt for user:",
        username,
        "from IP:",
        ip
      );
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    // Clear rate limiting on successful login
    loginAttempts.delete(rateLimitKey);

    console.log(
      `[AUTH] Successful login for ${userRole} ${userId} (${emailToTry}) from IP: ${ip}`
    );

    return NextResponse.json(
      {
        message: "Sign-in successful",
        user: signInData.user,
        session: signInData.session,
        role: userRole,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[AUTH] Internal server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
