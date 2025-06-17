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

    // Get the most recent practice session for this student
    const recentSession = await prisma.practiceSession.findFirst({
      where: { studentId },
      orderBy: { createdAt: "desc" },
      include: {
        subject: { select: { id: true, name: true } },
        topic: { select: { id: true, name: true } },
        student: { select: { id: true, level: true } },
      },
    });

    if (!recentSession) {
      return NextResponse.json(
        {
          error: "No practice sessions found for this student",
        },
        { status: 404 }
      );
    }

    // Test quest progress update
    console.log(`🧪 Testing quest progress for session ${recentSession.id}`);
    await updateQuestProgressForSession(recentSession);

    // Get updated quest progress
    const weekStart = new Date();
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);

    const updatedQuests = await prisma.studentQuest.findMany({
      where: {
        studentId,
        weekStart: {
          gte: weekStart,
          lt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        quest: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      message: "Quest progress test completed",
      sessionTested: {
        id: recentSession.id,
        title: recentSession.title,
        score: recentSession.score,
        xpEarned: recentSession.xpEarned,
      },
      questProgress: updatedQuests.map((sq) => ({
        questType: sq.quest.questType,
        title: sq.quest.title,
        progress: sq.progress,
        target: sq.target,
        isCompleted: sq.isCompleted,
      })),
    });
  } catch (error: any) {
    console.error("Error testing quest progress:", error);
    return NextResponse.json(
      { error: "Failed to test quest progress", details: error.message },
      { status: 500 }
    );
  }
}
