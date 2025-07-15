import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PracticeSessionStatus } from "@/generated/prisma";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    console.log("🔐 Practice dates API - Starting authentication check...");
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

    // Get URL params for date range (optional)
    const url = new URL(request.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    // Default to last 6 months if no range provided
    const defaultStartDate = new Date();
    defaultStartDate.setMonth(defaultStartDate.getMonth() - 6);

    const whereClause: any = {
      studentId: user.id,
      status: PracticeSessionStatus.COMPLETED,
    };

    if (startDate && endDate) {
      whereClause.endTime = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else {
      whereClause.endTime = {
        gte: defaultStartDate,
      };
    }

    // Fetch completed practice sessions
    const completedSessions = await prisma.practiceSession.findMany({
      where: whereClause,
      select: {
        id: true,
        endTime: true,
        startTime: true,
        type: true,
        totalQuestions: true,
        correctAnswers: true,
        totalMarksEarned: true,
        totalPossibleMarks: true,
        durationSeconds: true,
      },
      orderBy: {
        endTime: "desc",
      },
    });

    // Group sessions by date and calculate daily stats
    const practiceDates = completedSessions.reduce((acc: any, session) => {
      if (!session.endTime) return acc;

      const dateKey = session.endTime.toISOString().split("T")[0]; // YYYY-MM-DD

      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          totalQuestions: 0,
          correctAnswers: 0,
          totalMarksEarned: 0,
          totalPossibleMarks: 0,
          timeSpent: 0,
          sessionsCompleted: 0,
        };
      }

      acc[dateKey].totalQuestions += session.totalQuestions || 0;
      acc[dateKey].correctAnswers += session.correctAnswers || 0;
      acc[dateKey].totalMarksEarned += session.totalMarksEarned || 0;
      acc[dateKey].totalPossibleMarks += session.totalPossibleMarks || 0;
      acc[dateKey].timeSpent += session.durationSeconds || 0;
      acc[dateKey].sessionsCompleted += 1;

      return acc;
    }, {});

    // Calculate averages and convert to array
    const practiceDatesArray = Object.values(practiceDates).map(
      (dayData: any) => {
        dayData.avgAccuracy =
          dayData.totalQuestions > 0
            ? Math.round((dayData.correctAnswers / dayData.totalQuestions) * 100)
            : 0;
        dayData.avgScore =
          dayData.sessionsCompleted > 0
            ? Math.round(dayData.totalMarksEarned / dayData.sessionsCompleted)
            : 0;
        return dayData;
      }
    );

    return NextResponse.json({
      practiceDates: practiceDatesArray,
      totalDaysWithPractice: practiceDatesArray.length,
    });
  } catch (error) {
    console.error("Error fetching practice dates:", error);
    return NextResponse.json(
      { error: "Failed to fetch practice dates" },
      { status: 500 }
    );
  }
}
