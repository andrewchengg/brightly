import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PrismaClient, PracticeSessionStatus } from "@/generated/prisma";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get parent ID from user
    const parent = await prisma.parent.findUnique({
      where: { id: user.id },
      include: {
        students: true,
      },
    });

    if (!parent) {
      return NextResponse.json({ error: "Parent not found" }, { status: 404 });
    }

    const childrenIds = parent.students.map((child) => child.id);

    // Parse query parameters for date range
    const url = new URL(request.url);
    const startDateParam = url.searchParams.get("startDate");
    const endDateParam = url.searchParams.get("endDate");
    const period = url.searchParams.get("period") || "7d";

    // Set default date range based on period if not provided
    let startDate: Date;
    let endDate: Date;

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
    } else {
      // Default to current period
      const today = new Date();
      
      switch (period) {
        case "30d":
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          break;
        case "3m":
          const quarterStart = Math.floor(today.getMonth() / 3) * 3;
          startDate = new Date(today.getFullYear(), quarterStart, 1);
          endDate = new Date(today.getFullYear(), quarterStart + 3, 0);
          break;
        default: // "7d"
          endDate = new Date();
          startDate = new Date();
          startDate.setDate(endDate.getDate() - 7);
          break;
      }
    }

    const sessions = await prisma.practiceSession.findMany({
      where: {
        studentId: { in: childrenIds },
        status: "COMPLETED",
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        startTime: true,
        totalQuestions: true,
        correctAnswers: true,
        totalMarksEarned: true,
        totalPossibleMarks: true,
        durationSeconds: true,
        student: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        startTime: "asc",
      },
    });

    // Group sessions by date (overall)
    const overallPracticeDates = sessions.reduce((acc: any, session) => {
      const dateKey = new Date(session.startTime).toISOString().split("T")[0];

      // Initialize or update the date's stats
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

      // Update stats
      acc[dateKey].totalQuestions += session.totalQuestions || 0;
      acc[dateKey].correctAnswers += session.correctAnswers || 0;
      acc[dateKey].totalMarksEarned += session.totalMarksEarned || 0;
      acc[dateKey].totalPossibleMarks += session.totalPossibleMarks || 0;
      acc[dateKey].timeSpent += session.durationSeconds || 0;
      acc[dateKey].sessionsCompleted += 1;

      return acc;
    }, {});

    // Group sessions by child and date
    const childrenPracticeDates: Record<string, Record<string, any>> = {};

    sessions.forEach((session) => {
      const dateKey = new Date(session.startTime).toISOString().split("T")[0];
      const childId = session.student.id;

      // Initialize child's dates object if not exists
      if (!childrenPracticeDates[childId]) {
        childrenPracticeDates[childId] = {};
      }

      // Initialize or update the child's date stats
      if (!childrenPracticeDates[childId][dateKey]) {
        childrenPracticeDates[childId][dateKey] = {
          date: dateKey,
          totalQuestions: 0,
          correctAnswers: 0,
          totalMarksEarned: 0,
          totalPossibleMarks: 0,
          timeSpent: 0,
          sessionsCompleted: 0,
        };
      }

      // Update child's stats
      childrenPracticeDates[childId][dateKey].totalQuestions += session.totalQuestions || 0;
      childrenPracticeDates[childId][dateKey].correctAnswers += session.correctAnswers || 0;
      childrenPracticeDates[childId][dateKey].totalMarksEarned += session.totalMarksEarned || 0;
      childrenPracticeDates[childId][dateKey].totalPossibleMarks += session.totalPossibleMarks || 0;
      childrenPracticeDates[childId][dateKey].timeSpent += session.durationSeconds || 0;
      childrenPracticeDates[childId][dateKey].sessionsCompleted += 1;
    });

    // Calculate averages for overall data
    const overallPracticeDatesArray = Object.values(overallPracticeDates).map(
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

    // Calculate averages for each child
    Object.keys(childrenPracticeDates).forEach((childId) => {
      const childDates = childrenPracticeDates[childId];
      Object.keys(childDates).forEach((date) => {
        const dayData = childDates[date];
        dayData.avgAccuracy =
          dayData.totalQuestions > 0
            ? Math.round((dayData.correctAnswers / dayData.totalQuestions) * 100)
            : 0;
        dayData.avgScore =
          dayData.sessionsCompleted > 0
            ? Math.round(dayData.totalMarksEarned / dayData.sessionsCompleted)
            : 0;
      });
    });

    return NextResponse.json({
      practiceDates: overallPracticeDatesArray,
      childrenPracticeDates,
      children: parent.students,
      totalDaysWithPractice: overallPracticeDatesArray.length,
    });
  } catch (error) {
    console.error("Error fetching practice dates:", error);
    return NextResponse.json(
      { error: "Failed to fetch practice dates" },
      { status: 500 }
    );
  }
}
