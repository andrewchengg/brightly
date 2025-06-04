// src/app/api/user/award-xp/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

interface XpRequestBody {
  xpAmount: number;
  activityType?: string;
}

export async function POST(req: NextRequest) {
  const cookieStore = cookies();

  // Use createServerClient from @supabase/ssr for API routes
  const supabase = createClient();

  try {
    // Get the authenticated user directly for security
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized: " + (authError?.message || "No user session") },
        { status: 401 }
      );
    }

    const userId = user.id;

    const { xpAmount, activityType } = (await req.json()) as XpRequestBody;

    if (xpAmount == null || typeof xpAmount !== "number") {
      // Check for null or undefined explicitly
      return NextResponse.json({ error: "Invalid XP amount" }, { status: 400 });
    }

    const { data: studentData, error: studentError } = await supabase
      .from("Student")
      .select("xpPoints")
      .eq("id", userId)
      .single();

    if (studentError) {
      console.error("Error fetching student data:", studentError);
      return NextResponse.json(
        {
          error: "Failed to fetch student data",
          details: studentError.message,
        },
        { status: 500 }
      );
    }

    const currentXP = studentData?.xpPoints || 0;
    const newXP = currentXP + xpAmount;

    const oldLevel = Math.floor(currentXP / 1000) + 1;
    const newLevel = Math.floor(newXP / 1000) + 1;
    const leveledUp = newLevel > oldLevel;

    const { error: updateError } = await supabase
      .from("Student")
      .update({ xpPoints: newXP, updatedAt: new Date().toISOString() })
      .eq("id", userId);

    if (updateError) {
      console.error("Error updating XP:", updateError);
      return NextResponse.json(
        { error: "Failed to update XP", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      currentXp: newXP,
      awarded: xpAmount,
      level: newLevel,
      leveledUp: leveledUp,
      previousLevel: oldLevel,
      nextLevelXp: newLevel * 1000,
      progressToNextLevel: Math.max(
        0,
        Math.min(100, ((newXP - (newLevel - 1) * 1000) / 1000) * 100)
      ), // Ensure progress is between 0-100
    });
  } catch (error: any) {
    console.error("Error in award-xp endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
