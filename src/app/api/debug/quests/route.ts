import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { calculateLevel } from "@/lib/xp-utils";
import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

// GET /api/debug/quests - Debug quest and authentication status
export async function GET(request: NextRequest) {
  try {
    console.log("🔍 DEBUG: Starting quest debug check...");

    const cookieStore = cookies();
    const allCookies = cookieStore.getAll();
    const authCookies = allCookies.filter(
      (cookie) =>
        cookie.name.includes("supabase") ||
        cookie.name.includes("auth") ||
        cookie.name.includes("sb-")
    );

    console.log("🔍 DEBUG: Available cookies:", {
      total: allCookies.length,
      authRelated: authCookies.length,
      authCookieNames: authCookies.map((c) => c.name),
    });

    const supabase = createClient();

    // Test 1: Try getSession first
    let sessionResult;
    try {
      sessionResult = await supabase.auth.getSession();
      console.log("🔍 DEBUG: getSession result:", {
        hasSession: !!sessionResult.data.session,
        sessionId: sessionResult.data.session?.user?.id || "N/A",
        error: sessionResult.error?.message || "NONE",
      });
    } catch (sessionError: any) {
      console.log("🔍 DEBUG: getSession exception:", sessionError);
      return NextResponse.json({
        debug: "SESSION_EXCEPTION",
        error: sessionError.message,
        cookies: authCookies.map((c) => ({
          name: c.name,
          hasValue: !!c.value,
        })),
        success: false,
      });
    }

    // Test 2: Try getUser
    let authResult;
    try {
      authResult = await supabase.auth.getUser();
      console.log("🔍 DEBUG: getUser result:", {
        user: authResult.data.user ? "FOUND" : "NULL",
        userId: authResult.data.user?.id || "N/A",
        email: authResult.data.user?.email || "N/A",
        error: authResult.error ? authResult.error.message : "NONE",
      });
    } catch (authError: any) {
      console.log("🔍 DEBUG: getUser exception:", authError);
      return NextResponse.json({
        debug: "AUTH_EXCEPTION",
        error: authError.message,
        cookies: authCookies.map((c) => ({
          name: c.name,
          hasValue: !!c.value,
        })),
        success: false,
      });
    }

    if (authResult.error || !authResult.data.user) {
      return NextResponse.json({
        debug: "AUTH_FAILED",
        authError: authResult.error?.message || "No user found",
        sessionExists: !!sessionResult?.data.session,
        sessionError: sessionResult?.error?.message || "No session error",
        cookies: authCookies.map((c) => ({
          name: c.name,
          hasValue: !!c.value,
        })),
        success: false,
      });
    }

    const user = authResult.data.user;
    const studentId = user.id;

    console.log("🔍 DEBUG: Authenticated user ID:", studentId);

    // Check if student exists in database
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        level: true,
        xpPoints: true,
        username: true,
        name: true,
        createdAt: true,
      },
    });

    if (!student) {
      return NextResponse.json({
        debug: "STUDENT_NOT_FOUND",
        studentId,
        userEmail: user.email,
        success: false,
      });
    }

    const calculatedLevel = calculateLevel(student.xpPoints || 0);
    console.log("🔍 DEBUG: Student found:", {
      id: student.id,
      username: student.username,
      storedLevel: student.level,
      calculatedLevel,
      xpPoints: student.xpPoints,
    });

    // Check for weekly quests - use same week calculation as quest service
    const weekStart = new Date();
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // Monday-based week
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);

    const quests = await prisma.studentQuest.findMany({
      where: {
        studentId,
        weekStart: {
          gte: weekStart,
          lt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        quest: true,
      },
    });

    console.log("🔍 DEBUG: Found", quests.length, "quests for this week");

    return NextResponse.json({
      debug: "SUCCESS",
      session: {
        exists: !!sessionResult?.data.session,
        userId: sessionResult?.data.session?.user?.id || "N/A",
        expiresAt: sessionResult?.data.session?.expires_at || "N/A",
      },
      user: {
        id: user.id,
        email: user.email,
        role: user.user_metadata?.role,
      },
      student: {
        id: student.id,
        username: student.username,
        name: student.name,
        storedLevel: student.level,
        calculatedLevel,
        xpPoints: student.xpPoints,
        createdAt: student.createdAt,
      },
      questsCount: quests.length,
      weekStart: weekStart.toISOString(),
      levelRequirement: {
        current: calculatedLevel,
        required: 2,
        meetsRequirement: calculatedLevel >= 2,
      },
      cookies: authCookies.map((c) => ({ name: c.name, hasValue: !!c.value })),
      quests: quests.map((q) => ({
        id: q.id,
        title: q.quest.title,
        progress: q.progress,
        target: q.target,
        isCompleted: q.isCompleted,
      })),
      success: true,
    });
  } catch (error: any) {
    console.error("🔍 DEBUG: Error:", error);
    return NextResponse.json(
      {
        debug: "EXCEPTION",
        error: error.message,
        stack: error.stack,
        success: false,
      },
      { status: 500 }
    );
  }
}
