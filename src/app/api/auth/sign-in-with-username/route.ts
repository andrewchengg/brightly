// src/app/api/auth/sign-in-with-username/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient, type CookieOptions } from "@supabase/ssr"; // For setting auth cookies
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  console.log("[API_SIGN_IN] Starting username-based sign-in process");
  const { username, password } = await request.json();

  if (!username || !password) {
    return NextResponse.json(
      { error: "Username and password are required." },
      { status: 400 }
    );
  }

  const cookieStore = cookies();
  const supabaseAdmin = createAdminClient();

  let emailToTry: string | null = null;
  let userRole: string = "student";
  let userId: string | null = null;

  try {
    // Check Student table first (most common)
    console.log(
      `[API_SIGN_IN] Checking Student table for username: ${username}`
    );
    const { data: studentData, error: studentError } = await supabaseAdmin
      .from("Student")
      .select("id, email, name")
      .eq("username", username)
      .single();

    if (!studentError && studentData?.email) {
      emailToTry = studentData.email;
      userRole = "student";
      userId = studentData.id;
      console.log(`[API_SIGN_IN] Found Student: ${emailToTry}`);
    } else {
      // Check Parent table
      console.log(
        `[API_SIGN_IN] Checking Parent table for username: ${username}`
      );
      const { data: parentData, error: parentError } = await supabaseAdmin
        .from("Parent")
        .select("id, email, name")
        .eq("username", username)
        .single();

      if (!parentError && parentData?.email) {
        emailToTry = parentData.email;
        userRole = "parent";
        userId = parentData.id;
        console.log(`[API_SIGN_IN] Found Parent: ${emailToTry}`);
      } else {
        // Check Teacher table
        console.log(
          `[API_SIGN_IN] Checking Teacher table for username: ${username}`
        );
        const { data: teacherData, error: teacherError } = await supabaseAdmin
          .from("Teacher")
          .select("id, email, name")
          .eq("username", username)
          .single();

        if (!teacherError && teacherData?.email) {
          emailToTry = teacherData.email;
          userRole = "teacher";
          userId = teacherData.id;
          console.log(`[API_SIGN_IN] Found Teacher: ${emailToTry}`);
        } else {
          // Check Admin table
          console.log(
            `[API_SIGN_IN] Checking Admin table for username: ${username}`
          );
          const { data: adminData, error: adminError } = await supabaseAdmin
            .from("Admin")
            .select("id, username")
            .eq("username", username)
            .single();

          if (!adminError && adminData?.username) {
            // Admin table stores username, get their auth email
            const { data: adminAuthUser, error: getAdminAuthError } =
              await supabaseAdmin.auth.admin.getUserById(adminData.id);

            if (getAdminAuthError || !adminAuthUser?.user?.email) {
              console.error(
                `[API_SIGN_IN] Admin auth lookup failed for ID: ${adminData.id}`
              );
              return NextResponse.json(
                { error: "Admin authentication error." },
                { status: 400 }
              );
            }
            emailToTry = adminAuthUser.user.email;
            userRole = "admin";
            userId = adminData.id;
            console.log(`[API_SIGN_IN] Found Admin: ${emailToTry}`);
          }
        }
      }
    }

    if (!emailToTry) {
      console.log(`[API_SIGN_IN] Username "${username}" not found.`);
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    // Attempt authentication with found email
    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey =
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
      console.error(
        `[API_SIGN_IN] Auth error for email "${emailToTry}":`,
        signInError.message
      );
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    console.log(
      `[API_SIGN_IN] User ${userId} (${emailToTry}) signed in successfully as ${userRole}.`
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
    console.error("[API_SIGN_IN] Internal server error:", error.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
