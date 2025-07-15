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

    // Get URL params for date range
    const url = new URL(request.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate and endDate are required" },
        { status: 400 }
      );
    }

    // Fetch practice sessions for the specified date range
    const practiceSessions = await prisma.practiceSession.findMany({
      where: {
        studentId: student.id,
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
  } finally {
    await prisma.$disconnect();
  }
} 