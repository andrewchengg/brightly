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

    // First, check the student's level by calculating it from XP points
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { level: true, xpPoints: true },
    });

    // Use calculated level from XP points instead of stored level for consistency
    const studentLevel = calculateLevel(student?.xpPoints || 0);
    const storedLevel = student?.level || 1;
    console.log(
      "API: Student calculated level:",
      studentLevel,
      "(stored:",
      storedLevel,
      ", XP:",
      student?.xpPoints,
      ")"
    );

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

    // Check if weekly rotation is needed (automatic check)
    await checkWeeklyRotationNeeded();

    // Check if this student needs quest generation
    await checkAndGenerateQuestsIfNeeded(studentId);

    let formattedQuests: any[] = [];

    try {
      // Get or generate quests for the current week using simplified approach
      console.log("API: Getting student quests for current week...");

      // Use Monday-based week calculation
      const weekStart = new Date();
      const day = weekStart.getDay();
      const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
      weekStart.setDate(diff);
      weekStart.setHours(0, 0, 0, 0);

      // Check for existing student quests
      let studentQuests = await prisma.studentQuest.findMany({
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

      // If no quests exist, return empty array and let frontend handle it
      if (studentQuests.length === 0) {
        console.log("API: No quests found for current week");
        formattedQuests = [];
      } else {
        // Convert to frontend format
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
      }

      console.log("API: Retrieved quests:", studentQuests.length, "quests");
    } catch (dbError) {
      console.warn(
        "API: Quest generation/retrieval failed, using fallback:",
        dbError
      );

      // Fallback quests if database fails
      formattedQuests = [
        {
          id: "1",
          title: "Review 10 mistakes",
          description: "Learn from your previous incorrect answers",
          progress: 0,
          target: 10,
          icon: "FaExclamationTriangle",
          color: "orange",
          category: "core",
          isCompleted: false,
          completedAt: null,
        },
        {
          id: "2",
          title: "Score 80%+ in 3 sessions",
          description: "Achieve high accuracy in your practice sessions",
          progress: 0,
          target: 3,
          icon: "FaBullseye",
          color: "green",
          category: "core",
          isCompleted: false,
          completedAt: null,
        },
        {
          id: "3",
          title: "Subject Specialist",
          description:
            "Complete 5+ practice sessions in your chosen subject specialty",
          progress: 0,
          target: 5,
          icon: "FaGraduationCap",
          color: "blue",
          category: "subject",
          isCompleted: false,
          completedAt: null,
        },
        {
          id: "4",
          title: "Weekly Warrior",
          description: "Practice for at least 5 days this week",
          progress: 0,
          target: 5,
          icon: "FaCalendarCheck",
          color: "green",
          category: "consistency",
          isCompleted: false,
          completedAt: null,
        },
        {
          id: "5",
          title: "Speed Demon",
          description: "Complete 10 practice sessions within the week",
          progress: 0,
          target: 10,
          icon: "FaFire",
          color: "orange",
          category: "performance",
          isCompleted: false,
          completedAt: null,
        },
      ];
      console.log(
        "API: Using fallback quests:",
        formattedQuests.length,
        "quests"
      );
    }

    console.log("API: Final formatted quests:", formattedQuests);
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
