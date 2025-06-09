import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PrismaClient, PracticeSessionStatus } from "@/generated/prisma";

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

    // Get parent's children
    const parent = await prisma.parent.findFirst({
      where: { email: user.email! },
      include: {
        students: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!parent || parent.students.length === 0) {
      return NextResponse.json({
        practiceDates: [],
        childrenPracticeDates: {},
        totalDaysWithPractice: 0,
      });
    }

    const childrenIds = parent.students.map((child) => child.id);

    // Get URL params for date range (optional)
    const url = new URL(request.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    // Default to last 6 months if no range provided
    const defaultStartDate = new Date();
    defaultStartDate.setMonth(defaultStartDate.getMonth() - 6);

    const whereClause: any = {
      studentId: { in: childrenIds },
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

    // Fetch completed practice sessions for all children
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
        studentId: true,
        student: {
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

    // Group sessions by date (overall)
    const overallPracticeDates = completedSessions.reduce(
      (acc: any, session) => {
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
            childrenWhoStudied: new Set(),
          };
        }

        acc[dateKey].sessionCount += 1;
        acc[dateKey].totalQuestions += session.totalQuestions || 0;
        acc[dateKey].totalCorrect += session.correctAnswers || 0;
        acc[dateKey].totalScore += session.score || 0;
        acc[dateKey].childrenWhoStudied.add(session.student.name);

        return acc;
      },
      {}
    );

    // Group sessions by child and date
    const childrenPracticeDates: any = {};
    parent.students.forEach((child) => {
      childrenPracticeDates[child.id] = {};
    });

    completedSessions.forEach((session) => {
      if (!session.endTime) return;

      const dateKey = session.endTime.toISOString().split("T")[0];
      const childId = session.studentId;

      if (!childrenPracticeDates[childId][dateKey]) {
        childrenPracticeDates[childId][dateKey] = {
          date: dateKey,
          sessionCount: 0,
          totalQuestions: 0,
          totalCorrect: 0,
          totalScore: 0,
          avgAccuracy: 0,
          hasPracticed: true,
          childName: session.student.name,
        };
      }

      childrenPracticeDates[childId][dateKey].sessionCount += 1;
      childrenPracticeDates[childId][dateKey].totalQuestions +=
        session.totalQuestions || 0;
      childrenPracticeDates[childId][dateKey].totalCorrect +=
        session.correctAnswers || 0;
      childrenPracticeDates[childId][dateKey].totalScore += session.score || 0;
    });

    // Calculate averages for overall data
    const overallPracticeDatesArray = Object.values(overallPracticeDates).map(
      (dayData: any) => {
        dayData.avgAccuracy =
          dayData.totalQuestions > 0
            ? Math.round((dayData.totalCorrect / dayData.totalQuestions) * 100)
            : 0;
        dayData.avgScore =
          dayData.sessionCount > 0
            ? Math.round(dayData.totalScore / dayData.sessionCount)
            : 0;
        dayData.childrenWhoStudied = Array.from(dayData.childrenWhoStudied);
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
            ? Math.round((dayData.totalCorrect / dayData.totalQuestions) * 100)
            : 0;
        dayData.avgScore =
          dayData.sessionCount > 0
            ? Math.round(dayData.totalScore / dayData.sessionCount)
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
