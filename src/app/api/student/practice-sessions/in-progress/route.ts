// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

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

    console.log("🔍 DEBUG: API - Fetching in-progress sessions for student:", {
      studentId,
      timestamp: new Date().toISOString(),
    });

    // Find all resumable sessions for the student (only IN_PROGRESS, not PAUSED)
    // PAUSED sessions are typically abandoned sessions and should not be resumable
    // Also exclude sessions created very recently (within last 2 seconds) to prevent race conditions
    const twoSecondsAgo = new Date(Date.now() - 2000);

    const inProgressSessions = await prisma.practiceSession.findMany({
      where: {
        studentId,
        status: "IN_PROGRESS", // Only include truly in-progress sessions
        startTime: {
          lt: twoSecondsAgo, // Exclude sessions created in the last 2 seconds
        },
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
        studentAnswers: {
          select: {
            id: true,
            isCorrect: true,
            submittedAnswer: true,
          },
        },
      },
      orderBy: {
        startTime: "desc", // Most recent first
      },
    });

    // Calculate actual progress for each session
    const sessionsWithProgress = inProgressSessions.map((session) => {
      // Only count answers that actually have a submittedAnswer (not just placeholder records)
      const answeredQuestions = session.studentAnswers.filter(
        (answer) => answer.submittedAnswer !== null
      ).length;
      const correctAnswers = session.studentAnswers.filter(
        (answer) => answer.submittedAnswer !== null && answer.isCorrect
      ).length;

      return {
        id: session.id,
        title: session.title,
        type: session.type,
        startTime: session.startTime,
        subjectId: session.subjectId,
        topicId: session.topicId,
        totalQuestions: session.totalQuestions,
        correctAnswers: correctAnswers, // Use calculated value instead of stored value
        totalMarksEarned: session.totalMarksEarned,
        answeredQuestions: answeredQuestions, // Add this field for better progress tracking
      };
    });

    console.log("🔍 DEBUG: API - Found in-progress sessions:", {
      count: sessionsWithProgress.length,
      sessions: sessionsWithProgress.map((s) => ({
        id: s.id,
        type: s.type,
        title: s.title,
        topicId: s.topicId,
        subjectId: s.subjectId,
        status: "IN_PROGRESS", // We know this from the query
        progress: `${s.answeredQuestions}/${s.totalQuestions}`,
        correctAnswers: s.correctAnswers,
      })),
    });

    return NextResponse.json({ sessions: sessionsWithProgress });
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
