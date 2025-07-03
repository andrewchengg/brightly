import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { updateQuestProgressForSession } from "@/lib/quest-progress-tracker";
import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

// POST /api/weekly-quests/test-progress - Test quest progress tracking
export async function POST() {
  const cookieStore = cookies();
  const supabase = createClient();

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const studentId = user.id;

    // Get the most recent session
    const recentSession = await prisma.practiceSession.findFirst({
      where: {
        studentId: studentId,
        status: "COMPLETED",
      },
      orderBy: {
        endTime: "desc",
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        totalQuestions: true,
        correctAnswers: true,
        totalMarksEarned: true,
        totalPossibleMarks: true,
        durationSeconds: true,
        xpEarned: true,
      },
    });

    // Get all sessions for the student
    const allSessions = await prisma.practiceSession.findMany({
      where: {
        studentId: studentId,
        status: "COMPLETED",
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        totalQuestions: true,
        correctAnswers: true,
        totalMarksEarned: true,
        totalPossibleMarks: true,
        durationSeconds: true,
        xpEarned: true,
      },
      orderBy: {
        endTime: "desc",
      },
    });

    // Calculate accuracy for recent session
    const recentAccuracy = recentSession?.totalPossibleMarks
      ? Math.round((recentSession.totalMarksEarned / recentSession.totalPossibleMarks) * 100)
      : 0;

    // Calculate average accuracy for all sessions
    const totalAccuracy = allSessions.reduce((acc, session) => {
      if (!session.totalPossibleMarks) return acc;
      return acc + (session.totalMarksEarned / session.totalPossibleMarks) * 100;
    }, 0);
    const averageAccuracy = allSessions.length > 0
      ? Math.round(totalAccuracy / allSessions.length)
      : 0;

    // Calculate average marks per session
    const totalMarks = allSessions.reduce((acc, session) => acc + (session.totalMarksEarned || 0), 0);
    const averageMarks = allSessions.length > 0
      ? Math.round(totalMarks / allSessions.length)
      : 0;

    // Calculate total XP earned
    const totalXP = allSessions.reduce((acc, session) => acc + (session.xpEarned || 0), 0);

    // Return test data
    return NextResponse.json({
      recentSession: recentSession
        ? {
            id: recentSession.id,
            startTime: recentSession.startTime,
            endTime: recentSession.endTime,
            totalQuestions: recentSession.totalQuestions,
            correctAnswers: recentSession.correctAnswers,
            totalMarksEarned: recentSession.totalMarksEarned,
            totalPossibleMarks: recentSession.totalPossibleMarks,
            durationSeconds: recentSession.durationSeconds,
            xpEarned: recentSession.xpEarned,
            accuracy: recentAccuracy,
          }
        : null,
      allSessions: allSessions.map(session => ({
        id: session.id,
        startTime: session.startTime,
        endTime: session.endTime,
        totalQuestions: session.totalQuestions,
        correctAnswers: session.correctAnswers,
        totalMarksEarned: session.totalMarksEarned,
        totalPossibleMarks: session.totalPossibleMarks,
        durationSeconds: session.durationSeconds,
        xpEarned: session.xpEarned,
        accuracy: session.totalPossibleMarks
          ? Math.round((session.totalMarksEarned / session.totalPossibleMarks) * 100)
          : 0,
      })),
      averageAccuracy,
      averageMarks,
      totalXP,
    });
  } catch (error: any) {
    console.error("Error testing quest progress:", error);
    return NextResponse.json(
      { error: "Failed to test quest progress", details: error.message },
      { status: 500 }
    );
  }
}
