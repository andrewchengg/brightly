import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { generateWeeklyQuests } from "@/lib/quest-service";
import { calculateLevel } from "@/lib/xp-utils";
import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

// POST /api/weekly-quests/generate - Generate quests for current student
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

    // Check student's level
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { level: true, xpPoints: true },
    });

    const studentLevel = calculateLevel(student?.xpPoints || 0);

    if (studentLevel < 2) {
      return NextResponse.json(
        {
          error: "Student level too low",
          level: studentLevel,
          requiredLevel: 2,
          message: "Reach level 2 to unlock weekly quests!",
        },
        { status: 403 }
      );
    }

    // Generate new quests
    const studentQuests = await generateWeeklyQuests(studentId);

    // Format for frontend
    const formattedQuests = studentQuests.map((studentQuest: any) => ({
      id: studentQuest.id,
      title: studentQuest.quest.title,
      description: studentQuest.quest.description,
      progress: studentQuest.progress,
      target: studentQuest.target,
      icon: studentQuest.quest.icon,
      color: studentQuest.quest.color,
      category: studentQuest.quest.category.toLowerCase(),
      isCompleted: studentQuest.isCompleted,
      completedAt: studentQuest.completedAt,
    }));

    return NextResponse.json({
      success: true,
      message: `Generated ${formattedQuests.length} weekly quests`,
      quests: formattedQuests,
    });
  } catch (error: any) {
    console.error("Error generating weekly quests:", error);
    return NextResponse.json(
      { error: "Failed to generate weekly quests", details: error.message },
      { status: 500 }
    );
  }
}
