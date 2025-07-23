// src/app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const roleFromQuery = searchParams.get("role"); // Get role from URL params
  const nextPathFromQuery = searchParams.get("next"); // Get next path from URL params
  const modeFromQuery = searchParams.get("mode"); // Get mode (signin vs signup)

  if (code) {
    const supabase = createClient();
    const { error: exchangeError, data: sessionData } =
      await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError && sessionData?.session?.user) {
      const user = sessionData.session.user;
      let userRole = user.user_metadata?.role as string | undefined;
      let finalRedirectPath = "/"; // Default redirect

      // If this is a sign-in attempt (not sign-up), check if user exists in our database
      if (modeFromQuery === "signin") {
        // Check if user exists in either Parent or Student table
        const [parentCheck, studentCheck] = await Promise.all([
          supabase.from("Parent").select("id").eq("id", user.id).single(),
          supabase.from("Student").select("id").eq("id", user.id).single(),
        ]);

        const userExists =
          (!parentCheck.error && parentCheck.data) ||
          (!studentCheck.error && studentCheck.data);

        if (!userExists) {
          // User doesn't exist in our database, redirect to sign-up
          console.log(
            `Auth Callback: User ${user.email} not found in database, redirecting to sign-up`
          );

          // Sign out the user since they don't have an account
          await supabase.auth.signOut();

          const forwardedHost = request.headers.get("x-forwarded-host");
          let redirectBaseUrl = origin;
          if (forwardedHost) {
            redirectBaseUrl = `https://${forwardedHost}`;
          }
          if (redirectBaseUrl.includes("localhost")) {
            redirectBaseUrl = redirectBaseUrl.replace("https://", "http://");
          }

          return NextResponse.redirect(
            `${redirectBaseUrl}/sign-up?error=account_not_found&email=${encodeURIComponent(
              user.email || ""
            )}`
          );
        }

        // User exists, determine their role from the database
        if (!parentCheck.error && parentCheck.data) {
          userRole = "parent";
        } else if (!studentCheck.error && studentCheck.data) {
          userRole = "student";
        }
      }

      // Use role from URL params if not in metadata (for OAuth flows during sign-up)
      if (!userRole && roleFromQuery) {
        userRole = roleFromQuery;
        console.log(`Auth Callback: Using role from URL params: ${userRole}`);

        // Update user metadata with the role
        try {
          const { error: updateError } = await supabase.auth.updateUser({
            data: {
              ...user.user_metadata,
              role: userRole,
              name:
                user.user_metadata?.full_name ||
                user.user_metadata?.name ||
                user.email?.split("@")[0] ||
                "New User",
            },
          });

          if (updateError) {
            console.warn(
              "Auth Callback: Could not update user metadata:",
              updateError.message
            );
          }
        } catch (updateErr) {
          console.warn(
            "Auth Callback: Error updating user metadata:",
            updateErr
          );
        }
      }

      userRole = userRole || "student"; // Default if still no role

      if (userRole === "parent") {
        const { data: existingParent, error: parentCheckError } = await supabase
          .from("Parent")
          .select("id")
          .eq("id", user.id)
          .single();

        if (parentCheckError && parentCheckError.code !== "PGRST116") {
          console.error(
            "Auth Callback: Error checking parent DB record:",
            parentCheckError
          );
          return NextResponse.redirect(`${origin}/auth/auth-code-error`);
        }

        if (!existingParent) {
          // Check if a parent with this email already exists (different user ID)
          const { data: existingParentByEmail, error: emailCheckError } =
            await supabase
              .from("Parent")
              .select("id, email")
              .eq("email", user.email)
              .single();

          if (emailCheckError && emailCheckError.code !== "PGRST116") {
            console.error(
              "Auth Callback: Error checking parent by email:",
              emailCheckError
            );
            return NextResponse.redirect(`${origin}/auth/auth-code-error`);
          }

          if (existingParentByEmail) {
            // Parent with this email exists but different user ID - this is a duplicate email issue
            console.error(
              "Auth Callback: Parent with email already exists:",
              user.email
            );
            await supabase.auth.signOut();
            return NextResponse.redirect(
              `${origin}/sign-up?error=email_already_exists&email=${encodeURIComponent(
                user.email || ""
              )}`
            );
          }

          // Create new parent record
          const { error: createParentError } = await supabase
            .from("Parent")
            .insert({
              id: user.id,
              name:
                user.user_metadata?.name ||
                user.user_metadata?.full_name ||
                user.email?.split("@")[0] ||
                "New Parent",
              username:
                user.user_metadata?.username ||
                user.email?.split("@")[0] ||
                `parent${Date.now().toString().slice(-5)}`,
              email: user.email,
              updatedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            });

          if (createParentError) {
            console.error(
              "Auth Callback: Error creating parent DB record:",
              createParentError
            );
            return NextResponse.redirect(`${origin}/auth/auth-code-error`);
          }

          // New parent, redirect to setup or specified next path
          finalRedirectPath =
            nextPathFromQuery || "/sign-up/parent-child-setup";
        } else {
          // Existing parent. Check if they have children.
          const { count: childrenCount, error: childrenError } = await supabase
            .from("Student")
            .select("id", { count: "exact", head: true })
            .eq("parentId", user.id);

          if (childrenError) {
            console.error(
              "Auth Callback: Error checking for parent's children:",
              childrenError
            );
            finalRedirectPath = "/parent"; // Default to parent dashboard on error
          } else if (childrenCount !== null && childrenCount > 0) {
            // Parent has children, redirect to parent dashboard
            finalRedirectPath = "/parent";
          } else {
            // Existing parent record, but no children, send to setup
            finalRedirectPath =
              nextPathFromQuery || "/sign-up/parent-child-setup";
          }
        }
      } else if (userRole === "student") {
        const { data: existingStudent, error: studentCheckError } =
          await supabase
            .from("Student")
            .select("id, initialSetupComplete, walkthroughComplete")
            .eq("id", user.id)
            .single();

        if (studentCheckError && studentCheckError.code !== "PGRST116") {
          console.error(
            "Auth Callback: Error checking student DB record:",
            studentCheckError
          );
          return NextResponse.redirect(`${origin}/auth/auth-code-error`);
        }

        if (!existingStudent) {
          // Check if a student with this email already exists (different user ID)
          const { data: existingStudentByEmail, error: emailCheckError } =
            await supabase
              .from("Student")
              .select("id, email")
              .eq("email", user.email)
              .single();

          if (emailCheckError && emailCheckError.code !== "PGRST116") {
            console.error(
              "Auth Callback: Error checking student by email:",
              emailCheckError
            );
            return NextResponse.redirect(`${origin}/auth/auth-code-error`);
          }

          if (existingStudentByEmail) {
            // Student with this email exists but different user ID - this is a duplicate email issue
            console.error(
              "Auth Callback: Student with email already exists:",
              user.email
            );
            await supabase.auth.signOut();
            return NextResponse.redirect(
              `${origin}/sign-up?error=email_already_exists&email=${encodeURIComponent(
                user.email || ""
              )}`
            );
          }

          // Create new student record
          const name =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split("@")[0] ||
            "New Student";
          const username =
            user.user_metadata?.username ||
            user.email?.split("@")[0] ||
            `student${Date.now().toString().slice(-5)}`;

          const { error: createStudentError } = await supabase
            .from("Student")
            .insert({
              id: user.id,
              username,
              name,
              email: user.email,
              initialSetupComplete: false,
              walkthroughComplete: false,
              schoolLevel: 1,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });

          if (createStudentError) {
            console.error(
              "Auth Callback: Error creating student DB record:",
              createStudentError
            );
            return NextResponse.redirect(`${origin}/auth/auth-code-error`);
          }

          // New student, redirect to dashboard to show walkthrough first
          finalRedirectPath = "/student";
        } else if (!existingStudent.initialSetupComplete) {
          if (!existingStudent.walkthroughComplete) {
            // If walkthrough is not complete, redirect to dashboard to show walkthrough first
            finalRedirectPath = "/student";
          } else {
            // Walkthrough complete but setup not complete, go to setup
            finalRedirectPath = "/student/complete-setup";
          }
        } else {
          finalRedirectPath = "/student";
        }
      } else if (userRole === "teacher") {
        finalRedirectPath = "/teacher";
      } else if (userRole === "admin") {
        finalRedirectPath = "/admin";
      } else {
        // Fallback for unknown roles
        finalRedirectPath = `/${userRole}`;
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      let redirectBaseUrl = origin; // Start with the origin of the callback request

      if (forwardedHost) {
        // If behind a proxy that sets x-forwarded-host, construct the base URL using it.
        // We assume the proxy handles SSL termination, so default to HTTPS for the forwarded host.
        redirectBaseUrl = `https://${forwardedHost}`;
      }

      // IMPORTANT: If the determined base URL is for localhost, ensure it's HTTP.
      // This handles cases where 'origin' might have been https://localhost due to browser auto-HTTPS attempts
      // or if 'forwardedHost' logic somehow resulted in https://localhost.
      if (redirectBaseUrl.includes("localhost")) {
        redirectBaseUrl = redirectBaseUrl.replace("https://", "http://");
      }

      console.log(`Auth Callback: Original request origin: ${origin}`);
      console.log(`Auth Callback: Forwarded host: ${forwardedHost}`);
      console.log(
        `Auth Callback: Determined redirectBaseUrl for final redirect: ${redirectBaseUrl}`
      );
      console.log(
        `Auth Callback: Redirecting ${userRole} user to: ${redirectBaseUrl}${finalRedirectPath}`
      );
      return NextResponse.redirect(`${redirectBaseUrl}${finalRedirectPath}`);
    } else {
      console.error(
        "Auth callback error (exchangeCodeForSession or no session/user):",
        exchangeError
      );
      // Ensure this redirect also respects HTTP for localhost if 'origin' was HTTPS
      let errorRedirectOrigin = origin;
      if (errorRedirectOrigin.includes("localhost")) {
        errorRedirectOrigin = errorRedirectOrigin.replace(
          "https://",
          "http://"
        );
      }
      return NextResponse.redirect(
        `${errorRedirectOrigin}/auth/auth-code-error`
      );
    }
  } else {
    console.error("Auth callback: No code found in searchParams.");
    // Ensure this redirect also respects HTTP for localhost
    // 'origin' is not in scope here, so we need to define a fallback or reconstruct it if possible.
    // For simplicity, using a hardcoded relative path if origin isn't available or a fixed http origin.
    // However, 'origin' from the initial new URL(request.url) should be accessible if structured correctly.
    // Assuming 'origin' from the top of the function is accessible here:
    let errorRedirectOrigin = origin; // This 'origin' is from the new URL(request.url) at the start of GET.
    if (errorRedirectOrigin && errorRedirectOrigin.includes("localhost")) {
      errorRedirectOrigin = errorRedirectOrigin.replace("https://", "http://");
    }
    const authErrorPath = "/auth/auth-code-error";
    return NextResponse.redirect(
      errorRedirectOrigin
        ? `${errorRedirectOrigin}${authErrorPath}`
        : authErrorPath
    ); // Fallback to relative if origin somehow undefined
  }
  // Fallback redirect, ensure it also respects HTTP for localhost.
  let fallbackRedirectOrigin = origin; // This 'origin' is from the new URL(request.url) at the start of GET.
  if (fallbackRedirectOrigin && fallbackRedirectOrigin.includes("localhost")) {
    fallbackRedirectOrigin = fallbackRedirectOrigin.replace(
      "https://",
      "http://"
    );
  }
  const finalAuthErrorPath = "/auth/auth-code-error";
  return NextResponse.redirect(
    fallbackRedirectOrigin
      ? `${fallbackRedirectOrigin}${finalAuthErrorPath}`
      : finalAuthErrorPath
  );
}
