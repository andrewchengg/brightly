import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { PrismaClient, PracticeSessionStatus } from "@/generated/prisma";
import { updateQuestProgressForSession } from "@/lib/quest-progress-tracker-simple";

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

    const { sessionId, score, correctAnswers, xpEarned } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    const studentId = user.id;

    // Update the practice session as completed
    const updatedSession = await prisma.practiceSession.update({
      where: {
        id: sessionId,
        studentId: studentId,
      },
      data: {
        status: PracticeSessionStatus.COMPLETED,
        endTime: new Date(),
        score: score || 0,
        correctAnswers: correctAnswers || 0,
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
      await prisma.student.update({
        where: { id: studentId },
        data: {
          xpPoints: {
            increment: xpEarned,
          },
        },
      });
    }

    // Update weekly quest progress
    try {
      console.log(
        `🎯 About to update quest progress for session ${sessionId}, student ${studentId}`
      );
      console.log(
        `Session details: score=${score}, correctAnswers=${correctAnswers}, xpEarned=${xpEarned}`
      );
      await updateQuestProgressForSession(updatedSession);
      console.log(`✅ Quest progress updated successfully`);
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
