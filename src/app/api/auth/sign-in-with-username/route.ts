// src/app/api/auth/sign-in-with-username/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient, type CookieOptions } from "@supabase/ssr"; // For setting auth cookies
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  const { username, password } = await request.json();
  const cookieStore = cookies();

  if (!username || !password) {
    return NextResponse.json(
      { error: "Username and password are required" },
      { status: 400 }
    );
  }

  // Use admin client for user lookup since we need to bypass RLS
  const supabaseAdmin = createAdminClient();

  let emailToTry: string | null = null;
  let userRole: string | null = null;
  let userId: string | null = null;
  let userData; // Declare userData here to be re-assignable
  let queryError; // Declare a generic queryError variable

  try {
    // 1. Look up username in Student table
    console.log(
      `[API_SIGN_IN] Checking Student table for username: ${username}`
    );
    ({ data: userData, error: queryError } = await supabaseAdmin
      .from("Student")
      .select("id, email, name")
      .eq("username", username)
      .single());

    if (queryError && queryError.code !== "PGRST116") {
      console.error("[API_SIGN_IN] Error Student lookup:", queryError.message);
    }

    if (userData?.email) {
      emailToTry = userData.email;
      userRole = "student";
      userId = userData.id;
      console.log(`[API_SIGN_IN] Found Student: ${emailToTry}`);
    } else {
      // 2. Look up username in Parent table
      console.log(
        `[API_SIGN_IN] Checking Parent table for username: ${username}`
      );
      ({ data: userData, error: queryError } = await supabaseAdmin
        .from("Parent")
        .select("id, email, name")
        .eq("username", username)
        .single());

      if (queryError && queryError.code !== "PGRST116") {
        console.error("[API_SIGN_IN] Error Parent lookup:", queryError.message);
      }

      if (userData?.email) {
        emailToTry = userData.email;
        userRole = "parent";
        userId = userData.id;
        console.log(`[API_SIGN_IN] Found Parent: ${emailToTry}`);
      } else {
        // 3. Look up username in Teacher table
        console.log(
          `[API_SIGN_IN] Checking Teacher table for username: ${username}`
        );
        ({ data: userData, error: queryError } = await supabaseAdmin
          .from("Teacher")
          .select("id, email, name")
          .eq("username", username)
          .single());

        if (queryError && queryError.code !== "PGRST116") {
          console.error(
            "[API_SIGN_IN] Error Teacher lookup:",
            queryError.message
          );
        }

        if (userData?.email) {
          emailToTry = userData.email;
          userRole = "teacher";
          userId = userData.id;
          console.log(`[API_SIGN_IN] Found Teacher: ${emailToTry}`);
        } else {
          // 4. Look up username in Admin table
          console.log(
            `[API_SIGN_IN] Checking Admin table for username: ${username}`
          );
          ({ data: userData, error: queryError } = await supabaseAdmin
            .from("Admin")
            .select("id, username")
            .eq("username", username)
            .single());

          if (queryError && queryError.code !== "PGRST116") {
            console.error(
              "[API_SIGN_IN] Error Admin lookup:",
              queryError.message
            );
          }

          if (userData?.username) {
            // Admin table stores username, not email directly
            const adminId = userData.id; // Get the admin's ID

            const { data: adminAuthUser, error: getAdminAuthError } =
              await supabaseAdmin.auth.admin.getUserById(adminId);

            if (getAdminAuthError || !adminAuthUser?.user?.email) {
              console.error(
                `[API_SIGN_IN] Admin username ${username} found (ID: ${adminId}), but could not retrieve their auth email. Error: ${getAdminAuthError?.message}`
              );
              return NextResponse.json(
                {
                  error:
                    "Admin configuration error or admin must use email for authentication.",
                },
                { status: 400 }
              );
            }
            emailToTry = adminAuthUser.user.email;
            userRole = "admin";
            userId = adminId; // Use the ID from the Admin table
            console.log(
              `[API_SIGN_IN] Found Admin: ${emailToTry} (Auth Email for Admin ID: ${adminId})`
            );
          }
        }
      }
    }

    if (!emailToTry) {
      console.log(
        `[API_SIGN_IN] Username "${username}" not found in any table.`
      );
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    // 5. Attempt to sign in with the found email and provided password
    // Use server-only variables for better security, with fallback to public ones
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

    // Sign-in successful
    console.log(
      `[API_SIGN_IN] User ${
        userId || signInData.user?.id
      } (${emailToTry}) signed in successfully as ${userRole}.`
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
    console.error("[API_SIGN_IN] Internal server error:", error, error.stack); // Log stack for reference errors
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
