// src/app/api/parent/regenerate-credentials/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const generatePin = (): string =>
  Math.floor(100000 + Math.random() * 900000).toString();

export async function POST(request: NextRequest) {
  try {
    const { childId } = await request.json();

    if (!childId) {
      return NextResponse.json(
        { error: "Child ID is required" },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Get the current user (parent)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify the child belongs to this parent
    const { data: child, error: childError } = await supabase
      .from("Student")
      .select("id, username, parentId, initialSetupComplete")
      .eq("id", childId)
      .eq("parentId", user.id)
      .single();

    if (childError || !child) {
      return NextResponse.json(
        { error: "Child not found or unauthorized" },
        { status: 404 }
      );
    }

    // Only allow regeneration for children who haven't completed setup
    if (child.initialSetupComplete) {
      return NextResponse.json(
        { error: "Cannot regenerate credentials for children who have completed setup" },
        { status: 400 }
      );
    }

    // Generate new PIN
    const newPin = generatePin();

    // Update the child's password using admin client
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      childId,
      { password: newPin }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      return NextResponse.json(
        { error: "Failed to update password" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      credentials: {
        username: child.username,
        pin: newPin,
      },
    });
  } catch (error) {
    console.error("Error regenerating credentials:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}