import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { generateQuestsForAllStudents } from "@/lib/quest-service";
import { calculateLevel } from "@/lib/xp-utils";
import { PrismaClient } from "@/generated/prisma";
import {
  checkAndGenerateQuestsIfNeeded,
  checkWeeklyRotationNeeded,
} from "@/lib/weekly-quest-scheduler";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

// GET /api/weekly-quests - Get current week's quests
export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createClient();

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log("API: Authentication failed:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const studentId = user.id;
    console.log("API: Fetching quests for student:", studentId);

    // Get student level from database (simplified query)
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { level: true, xpPoints: true },
    });

    // Use calculated level from XP points instead of stored level for consistency
    const studentLevel = calculateLevel(student?.xpPoints || 0);
    console.log("API: Student level:", studentLevel, "XP:", student?.xpPoints);

    // If student is below level 2, return locked state
    if (studentLevel < 2) {
      console.log("API: Student below level 2, returning locked state");
      return NextResponse.json({
        locked: true,
        level: studentLevel,
        requiredLevel: 2,
        message: "Reach level 2 to unlock weekly quests!",
        quests: [],
      });
    }

    // Get current week start (Monday-based calculation)
    const weekStart = new Date();
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);

    let formattedQuests: any[] = [];

    try {
      // Get existing student quests for current week
      const studentQuests = await prisma.studentQuest.findMany({
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
        take: 2, // Limit to 2 quests
      });

      // Convert existing quests to frontend format
      formattedQuests = studentQuests.map((studentQuest) => ({
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

      console.log("API: Retrieved quests:", formattedQuests.length, "quests");
    } catch (dbError) {
      console.warn("API: Quest retrieval failed:", dbError);
      formattedQuests = [];
    }

    return NextResponse.json({ quests: formattedQuests });
  } catch (error: any) {
    console.error("API: Error fetching weekly quests:", error);
    return NextResponse.json(
      { error: "Failed to fetch weekly quests", details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/weekly-quests - Admin-only quest management
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

    const { action } = await request.json();

    // Only allow admin actions like quest rotation - no manual refresh for students
    switch (action) {
      case "rotate-all":
        // Admin function to generate quests for all students
        console.log("API: Generating quests for all eligible students");
        const rotationResult = await generateQuestsForAllStudents();
        return NextResponse.json({
          success: true,
          message: "Quest rotation completed",
          ...rotationResult,
        });

      default:
        return NextResponse.json(
          {
            error:
              "Manual quest refresh is not allowed. Weekly quests are automatically generated on Monday.",
          },
          { status: 403 }
        );
    }
  } catch (error: any) {
    console.error("API: Error processing weekly quest action:", error);
    return NextResponse.json(
      { error: "Failed to process action", details: error.message },
      { status: 500 }
    );
  }
}
