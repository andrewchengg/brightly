import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { generateQuestsForAllStudents } from "@/lib/quest-service";
import { calculateLevel } from "@/lib/xp-utils";
import { PrismaClient, WeeklyQuestCategory } from "@/generated/prisma";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

// In-memory cache for quest data (simple optimization)
const questCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 30 * 1000; // 30 seconds cache

// GET /api/weekly-quests - Get current week's quests (with better debugging)
export async function GET(request: NextRequest) {
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

    // Check cache first
    const cacheKey = `quests-${studentId}`;
    const cached = questCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json(cached.data);
    }

    // Single optimized query to get student data and quests
    const weekStart = new Date();
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Get student info and current quests
    const [student, studentQuests, allQuests] = await Promise.all([
      prisma.student.findUnique({
        where: { id: studentId },
        select: { level: true, xpPoints: true, name: true },
      }),
      prisma.studentQuest.findMany({
        where: {
          studentId,
          weekStart: {
            gte: weekStart,
            lt: weekEnd,
          },
        },
        include: {
          quest: {
            select: {
              title: true,
              description: true,
              icon: true,
              color: true,
              category: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      // Debug: Get all quests to see what's available
      prisma.quest.findMany({
        select: {
          id: true,
          questType: true,
          title: true,
          isActive: true,
          minLevel: true,
          maxLevel: true,
        },
      }),
    ]);

    // Calculate actual level from XP for consistency
    const studentLevel = calculateLevel(student?.xpPoints || 0);

    // Check what quests are available for this student's level
    const availableQuests = allQuests.filter(
      (quest) =>
        quest.isActive &&
        quest.minLevel <= studentLevel &&
        (!quest.maxLevel || quest.maxLevel >= studentLevel)
    );

    if (studentLevel < 2) {
      const result = {
        locked: true,
        level: studentLevel,
        requiredLevel: 2,
        message: "Reach level 2 to unlock weekly quests!",
        quests: [],
        debug: {
          studentLevel,
          totalQuestsInDB: allQuests.length,
          availableQuests: availableQuests.length,
          studentQuestsThisWeek: studentQuests.length,
        },
      };

      questCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return NextResponse.json(result);
    }

    // If no quests exist for this week, auto-generate them
    if (studentQuests.length === 0) {
      try {
        // Auto-generate quests for this week
        const { generateWeeklyQuests } = await import("@/lib/quest-service");
        const newStudentQuests = await generateWeeklyQuests(studentId);

        // Format the newly generated quests
        const formattedQuests = newStudentQuests.map((sq: any) => ({
          id: sq.id,
          title: sq.quest.title,
          description: sq.quest.description,
          progress: sq.progress,
          target: sq.target,
          icon: sq.quest.icon,
          color: sq.quest.color,
          category: sq.quest.category.toLowerCase(),
          isCompleted: sq.isCompleted,
          completedAt: sq.completedAt,
        }));

        const result = { quests: formattedQuests };
        questCache.set(cacheKey, { data: result, timestamp: Date.now() });
        return NextResponse.json(result);
      } catch (generateError) {
        console.error(`❌ Failed to auto-generate quests:`, generateError);

        const result = {
          quests: [],
          message: "No quests assigned for this week.",
          debug: {
            studentLevel,
            totalQuestsInDB: allQuests.length,
            availableQuests: availableQuests.length,
            studentQuestsThisWeek: studentQuests.length,
            weekStart: weekStart.toISOString(),
            availableQuestTitles: availableQuests.map((q) => q.title),
            generateError:
              generateError instanceof Error
                ? generateError.message
                : String(generateError),
          },
        };

        return NextResponse.json(result);
      }
    }

    // Format existing quests
    const formattedQuests = studentQuests.map((sq) => ({
      id: sq.id,
      title: sq.quest.title,
      description: sq.quest.description,
      progress: sq.progress,
      target: sq.target,
      icon: sq.quest.icon,
      color: sq.quest.color,
      category: sq.quest.category.toLowerCase(),
      isCompleted: sq.isCompleted,
      completedAt: sq.completedAt,
    }));

    const result = { quests: formattedQuests };
    questCache.set(cacheKey, { data: result, timestamp: Date.now() });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("❌ API: Error fetching weekly quests:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch weekly quests",
        details: error.message,
        quests: [], // Always return quests array to prevent UI crashes
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
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

    switch (action) {
      case "rotate-all":
        // Clear cache when rotating
        questCache.clear();
        const rotationResult = await generateQuestsForAllStudents();
        return NextResponse.json({
          success: true,
          message: "Quest rotation completed",
          ...rotationResult,
        });
      case "clear-cache":
        // Admin function to clear cache
        questCache.clear();
        return NextResponse.json({
          success: true,
          message: "Cache cleared",
        });
      default:
        return NextResponse.json(
          {
            error: "Invalid action. Use 'rotate-all' or 'clear-cache'.",
          },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("API: Error processing weekly quest action:", error);
    return NextResponse.json(
      { error: "Failed to process action" },
      { status: 500 }
    );
  }
}
