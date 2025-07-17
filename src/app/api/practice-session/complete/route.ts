import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { PrismaClient, PracticeSessionStatus } from "@/generated/prisma";
import { updateQuestProgressForSession } from "@/lib/quest-progress-tracker-simple";
import { calculateLevel } from "@/lib/xp-utils";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
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

    const {
      sessionId,
      correctAnswers,
      xpEarned,
      totalMarksEarned: reqTotalMarksEarned,
      totalPossibleMarks: reqTotalPossibleMarks,
    } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    const studentId = user.id;

    // First get the session to calculate duration
    const existingSession = await prisma.practiceSession.findUnique({
      where: {
        id: sessionId,
        studentId: studentId,
      },
      select: {
        startTime: true,
        status: true,
        title: true,
      },
    });

    if (!existingSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Calculate duration in seconds
    const endTime = new Date();
    const durationSeconds = Math.floor(
      (endTime.getTime() - existingSession.startTime.getTime()) / 1000
    );

    // Calculate marks if not provided
    let totalMarksEarned = reqTotalMarksEarned;
    let totalPossibleMarks = reqTotalPossibleMarks;
    if (totalMarksEarned == null || totalPossibleMarks == null) {
      // Fetch student answers and calculate
      const answers = await prisma.studentAnswer.findMany({
        where: { practiceSessionId: sessionId },
        include: { question: true },
      });
      totalMarksEarned = answers
        .filter((a) => a.isCorrect)
        .reduce((sum, a) => sum + (a.question?.marks || 0), 0);
      totalPossibleMarks = answers.reduce(
        (sum, a) => sum + (a.question?.marks || 0),
        0
      );
    }

    // Update the practice session as completed
    const updatedSession = await prisma.practiceSession.update({
      where: {
        id: sessionId,
        studentId: studentId,
      },
      data: {
        status: PracticeSessionStatus.COMPLETED,
        endTime: endTime,
        durationSeconds: durationSeconds,
        correctAnswers: correctAnswers || 0,
        totalMarksEarned,
        totalPossibleMarks,
        xpEarned: xpEarned || 0,
      },
      include: {
        subject: { select: { id: true, name: true } },
        topic: { select: { id: true, name: true } },
        student: { select: { id: true, level: true } },
      },
    });

    // Update XP for the student
    if (xpEarned > 0) {
      // Get current student data to calculate new level
      const currentStudent = await prisma.student.findUnique({
        where: { id: studentId },
        select: {
          xpPoints: true,
        },
      });

      if (currentStudent) {
        const newXP = currentStudent.xpPoints + xpEarned;
        const newLevel = calculateLevel(newXP);

        await prisma.student.update({
          where: { id: studentId },
          data: {
            xpPoints: newXP,
            level: newLevel,
            lastActivityDate: new Date(),
            updatedAt: new Date(),
          },
        });

        console.log(
          `📈 Updated student XP: ${currentStudent.xpPoints} → ${newXP} (+${xpEarned}), Level: ${newLevel}`
        );
      }
    }

    // Update weekly quest progress
    try {
      await updateQuestProgressForSession(updatedSession);
    } catch (questError) {
      console.error("❌ Error updating quest progress:", questError);
      // Don't fail the session completion if quest update fails
    }

    return NextResponse.json({
      success: true,
      session: updatedSession,
    });
  } catch (error: any) {
    console.error("API: Error completing practice session:", error);
    return NextResponse.json(
      { error: "Failed to complete session", details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
