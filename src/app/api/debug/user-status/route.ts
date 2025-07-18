import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json(
        {
          error: "Auth error",
          details: authError.message,
        },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json({
        status: "No user found",
        message: "User is not authenticated",
      });
    }

    // Get student data
    const { data: student, error: studentError } = await supabase
      .from("Student")
      .select("id, username, initialSetupComplete, walkthroughComplete, email")
      .eq("id", user.id)
      .single();

    return NextResponse.json({
      status: "success",
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.email_confirmed_at ? true : false,
      },
      student: student || null,
      studentError: studentError ? studentError.message : null,
    });
  } catch (error) {
    console.error("Error in debug endpoint:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
