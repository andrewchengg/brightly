import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "../../../../../generated/prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json(
        { error: "Student ID is required" },
        { status: 400 }
      );
    }

    // Find all in-progress sessions for the student
    const inProgressSessions = await prisma.practiceSession.findMany({
      where: {
        studentId,
        status: "IN_PROGRESS",
      },
      select: {
        id: true,
        title: true,
        type: true,
        startTime: true,
        subjectId: true,
        topicId: true,
        totalQuestions: true,
        correctAnswers: true,
        totalMarksEarned: true,
      },
      orderBy: {
        startTime: "desc", // Most recent first
      },
    });

    return NextResponse.json({ sessions: inProgressSessions });
  } catch (error: any) {
    console.error("Error fetching in-progress sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch in-progress sessions" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
