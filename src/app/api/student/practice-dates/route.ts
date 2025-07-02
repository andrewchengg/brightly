import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PrismaClient, PracticeSessionStatus } from "@/generated/prisma";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get student ID from user
    const student = await prisma.student.findFirst({
      where: { email: user.email! },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Get URL params for date range (optional)
    const url = new URL(request.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    // Default to last 6 months if no range provided
    const defaultStartDate = new Date();
    defaultStartDate.setMonth(defaultStartDate.getMonth() - 6);

    const whereClause: any = {
      studentId: student.id,
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
        score: true,
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
          sessionCount: 0,
          totalQuestions: 0,
          totalCorrect: 0,
          totalScore: 0,
          avgAccuracy: 0,
          hasPracticed: true,
        };
      }

      acc[dateKey].sessionCount += 1;
      acc[dateKey].totalQuestions += session.totalQuestions || 0;
      acc[dateKey].totalCorrect += session.correctAnswers || 0;
      acc[dateKey].totalScore += session.score || 0;

      return acc;
    }, {});

    // Calculate averages and convert to array
    const practiceDatesArray = Object.values(practiceDates).map(
      (dayData: any) => {
        dayData.avgAccuracy =
          dayData.totalQuestions > 0
            ? Math.round((dayData.totalCorrect / dayData.totalQuestions) * 100)
            : 0;
        dayData.avgScore =
          dayData.sessionCount > 0
            ? Math.round(dayData.totalScore / dayData.sessionCount)
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
