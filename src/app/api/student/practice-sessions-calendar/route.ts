import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PracticeSessionStatus } from "@/generated/prisma";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    console.log("🔐 Practice sessions calendar API - Starting authentication check...");
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log("🔐 Auth result:", { user: user?.id, error: authError });

    if (!user) {
      console.log("❌ No user found - returning 401");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ User authenticated:", user.id);

    // Get URL params for date range
    const url = new URL(request.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    console.log("📅 Practice sessions calendar API called:");
    console.log("   Student ID:", user.id);
    console.log("   Start Date:", startDate);
    console.log("   End Date:", endDate);

    if (!startDate || !endDate) {
      console.error("❌ Missing date parameters");
      return NextResponse.json(
        { error: "startDate and endDate are required" },
        { status: 400 }
      );
    }

    // Fetch practice sessions for the specified date range
    console.log("🔍 Querying practice sessions from database...");
    const practiceSessions = await prisma.practiceSession.findMany({
      where: {
        studentId: user.id,
        status: PracticeSessionStatus.COMPLETED,
        endTime: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
        topic: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        endTime: "desc",
      },
    });

    console.log(`📊 Found ${practiceSessions.length} practice sessions in date range`);
    practiceSessions.forEach((session, index) => {
      console.log(`   ${index + 1}. ${session.subject?.name || 'Unknown'} - ${session.topic?.name || 'General'} (${session.endTime})`);
    });

    // Group sessions by date
    const sessionsByDate = practiceSessions.reduce((acc: any, session) => {
      if (!session.endTime) return acc;

      const dateKey = session.endTime.toISOString().split("T")[0]; // YYYY-MM-DD

      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }

      acc[dateKey].push({
        id: session.id,
        title: session.title,
        type: session.type,
        startTime: session.startTime,
        endTime: session.endTime,
        durationSeconds: session.durationSeconds,
        totalQuestions: session.totalQuestions,
        correctAnswers: session.correctAnswers,
        totalMarksEarned: session.totalMarksEarned,
        totalPossibleMarks: session.totalPossibleMarks,
        subject: session.subject,
        topic: session.topic,
      });

      return acc;
    }, {});

    console.log("📅 Grouped sessions by date:", Object.keys(sessionsByDate));
    console.log("✅ Returning response with", practiceSessions.length, "total sessions");

    return NextResponse.json({
      sessionsByDate,
      totalSessions: practiceSessions.length,
    });
  } catch (error) {
    console.error("Error fetching practice sessions for calendar:", error);
    return NextResponse.json(
      { error: "Failed to fetch practice sessions" },
      { status: 500 }
    );
  }
} 