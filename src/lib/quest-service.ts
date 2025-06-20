import {
  PrismaClient,
  Quest,
  StudentQuest,
  QuestRarity,
} from "@/generated/prisma";
import { calculateLevel } from "@/lib/xp-utils";

const prisma = new PrismaClient();

// Helper function to get the start of the week (Monday)
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday-based week
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Helper function to get the end of the week (Sunday)
export function getWeekEnd(weekStart: Date): Date {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
}

// Calculate target value for a quest based on student level
function calculateQuestTarget(quest: Quest, studentLevel: number): number {
  const { baseTarget, targetFormula } = quest;

  if (!targetFormula || targetFormula === "base") {
    return baseTarget;
  }

  try {
    // Create a safe evaluation context
    const context = {
      base: baseTarget,
      level: studentLevel,
      Math: Math,
    };

    // Simple formula evaluation for common patterns
    if (targetFormula.includes("base + (level * ")) {
      const multiplierMatch = targetFormula.match(/base \+ \(level \* (\d+)\)/);
      if (multiplierMatch) {
        const multiplier = parseInt(multiplierMatch[1]);
        return baseTarget + studentLevel * multiplier;
      }
    }

    if (targetFormula.includes("base + Math.floor(level * ")) {
      const multiplierMatch = targetFormula.match(
        /base \+ Math\.floor\(level \* ([\d.]+)\)/
      );
      if (multiplierMatch) {
        const multiplier = parseFloat(multiplierMatch[1]);
        return baseTarget + Math.floor(studentLevel * multiplier);
      }
    }

    // Fallback to base target if formula parsing fails
    console.warn(
      `Failed to parse quest formula: ${targetFormula}, using base target`
    );
    return baseTarget;
  } catch (error) {
    console.error(
      `Error calculating quest target for ${quest.questType}:`,
      error
    );
    return baseTarget;
  }
}

// Simple quest types that are actually implemented
const IMPLEMENTED_QUEST_TYPES = [
  "earn-xp",
  "practice-sessions",
  "high-accuracy",
  "first-try-success",
  "morning-learner",
  "speedster",
  "weekend-warrior",
  "perfectionist",
  "no-mistakes",
  "daily-dedication",
];

// Get quests available for a student's level with rarity weighting
function selectQuestsForStudent(
  allQuests: Quest[],
  studentLevel: number,
  count: number = 2
): Quest[] {
  // Filter quests available for student's level AND only implemented quest types
  const availableQuests = allQuests.filter(
    (quest) =>
      quest.isActive &&
      quest.minLevel <= studentLevel &&
      (!quest.maxLevel || quest.maxLevel >= studentLevel) &&
      IMPLEMENTED_QUEST_TYPES.includes(quest.questType)
  );

  if (availableQuests.length === 0) {
    throw new Error(
      `No implemented quests available for student level ${studentLevel}`
    );
  }

  console.log(
    `Available quest types for level ${studentLevel}:`,
    availableQuests.map((q) => q.questType)
  );

  // Separate by category and rarity
  const coreQuests = availableQuests.filter((q) => q.category === "CORE");
  const otherQuests = availableQuests.filter((q) => q.category !== "CORE");

  // Ensure at least 1 core quest for 2-quest system
  const selectedQuests: Quest[] = [];
  const coreCount = Math.min(1, Math.min(coreQuests.length, count));

  // Shuffle and select core quests
  const shuffledCore = coreQuests.sort(() => Math.random() - 0.5);
  selectedQuests.push(...shuffledCore.slice(0, coreCount));

  // Fill remaining slots with other quests, weighted by rarity
  const remainingSlots = count - selectedQuests.length;
  if (remainingSlots > 0 && otherQuests.length > 0) {
    const weightedOtherQuests = applyRarityWeights(otherQuests);
    const shuffledOther = weightedOtherQuests.sort(() => Math.random() - 0.5);
    selectedQuests.push(...shuffledOther.slice(0, remainingSlots));
  }

  return selectedQuests;
}

// Apply rarity weights to quest selection
function applyRarityWeights(quests: Quest[]): Quest[] {
  const weighted: Quest[] = [];

  for (const quest of quests) {
    let weight = 1;
    switch (quest.rarity) {
      case QuestRarity.COMMON:
        weight = 10;
        break;
      case QuestRarity.UNCOMMON:
        weight = 6;
        break;
      case QuestRarity.RARE:
        weight = 3;
        break;
      case QuestRarity.EPIC:
        weight = 1;
        break;
    }

    // Add multiple copies based on weight
    for (let i = 0; i < weight; i++) {
      weighted.push(quest);
    }
  }

  return weighted;
}

// Get or generate weekly quests for a student (optimized)
export async function getStudentWeeklyQuests(
  studentId: string
): Promise<StudentQuest[]> {
  const weekStart = getWeekStart();

  // Single optimized query with all needed data
  const existingQuests = await prisma.studentQuest.findMany({
    where: {
      studentId,
      weekStart: {
        gte: weekStart,
        lt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
    },
    include: {
      quest: {
        select: {
          id: true,
          title: true,
          description: true,
          icon: true,
          color: true,
          category: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
    take: 2, // Only get 2 quests for performance
  });

  // Return existing quests immediately if found
  if (existingQuests.length >= 2) {
    return existingQuests;
  }

  // Only generate if absolutely necessary and no quests exist
  if (existingQuests.length === 0) {
    try {
      return await generateWeeklyQuests(studentId);
    } catch (error) {
      console.error("Quest generation failed:", error);
      return []; // Return empty array instead of failing
    }
  }

  return existingQuests;
}

// Generate weekly quests for a student
export async function generateWeeklyQuests(
  studentId: string
): Promise<StudentQuest[]> {
  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd(weekStart);

  // Get student's level
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { level: true, xpPoints: true },
  });

  if (!student) {
    throw new Error(`Student ${studentId} not found`);
  }

  // Use calculated level from XP for consistency
  const studentLevel = calculateLevel(student.xpPoints || 0);

  // Clean up existing quests for this week
  await prisma.studentQuest.deleteMany({
    where: {
      studentId,
      weekStart: {
        gte: weekStart,
        lt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
    },
  });

  // Get all available quests
  const allQuests = await prisma.quest.findMany({
    where: { isActive: true },
  });

  // Select appropriate quests for student
  const selectedQuests = selectQuestsForStudent(allQuests, studentLevel, 2);

  // Create StudentQuest records one by one to handle duplicates
  const studentQuests = [];
  for (const quest of selectedQuests) {
    try {
      const target = calculateQuestTarget(quest, studentLevel);

      // Check if this quest already exists for this student and week
      const existingQuest = await prisma.studentQuest.findFirst({
        where: {
          studentId,
          questId: quest.id,
          weekStart: {
            gte: weekStart,
            lt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
        },
        include: {
          quest: true,
        },
      });

      if (existingQuest) {
        console.log(
          `Quest ${quest.questType} already exists for student, skipping...`
        );
        studentQuests.push(existingQuest);
        continue;
      }

      const newQuest = await prisma.studentQuest.create({
        data: {
          studentId,
          questId: quest.id,
          target,
          weekStart,
          weekEnd,
        },
        include: {
          quest: true,
        },
      });

      studentQuests.push(newQuest);
    } catch (error) {
      console.error(`Failed to create quest ${quest.questType}:`, error);
    }
  }

  console.log(
    `🎯 Generated ${studentQuests.length} quests for student ${studentId} (Level ${studentLevel})`
  );
  return studentQuests;
}

// Update quest progress based on practice session
export async function updateQuestProgress(
  studentId: string,
  questType: string,
  progressIncrement: number
): Promise<void> {
  const weekStart = getWeekStart();

  const studentQuest = await prisma.studentQuest.findFirst({
    where: {
      studentId,
      weekStart: {
        gte: weekStart,
        lt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
      quest: {
        questType,
      },
      isCompleted: false,
    },
  });

  if (!studentQuest) {
    return; // Quest not found or already completed
  }

  const newProgress = Math.min(
    studentQuest.progress + progressIncrement,
    studentQuest.target
  );
  const isCompleted = newProgress >= studentQuest.target;

  await prisma.studentQuest.update({
    where: { id: studentQuest.id },
    data: {
      progress: newProgress,
      isCompleted,
      completedAt: isCompleted ? new Date() : null,
    },
  });

  if (isCompleted) {
    console.log(`🏆 Quest completed: ${questType} for student ${studentId}`);
  }
}

// Admin function: Generate quests for all eligible students
export async function generateQuestsForAllStudents(): Promise<{
  processed: number;
  failed: number;
}> {
  const students = await prisma.student.findMany({
    select: { id: true, username: true, level: true, xpPoints: true },
  });

  let processed = 0;
  let failed = 0;

  for (const student of students) {
    try {
      const studentLevel = calculateLevel(student.xpPoints || 0);
      if (studentLevel >= 2) {
        // Only generate for level 2+ students
        await generateWeeklyQuests(student.id);
        processed++;
      }
    } catch (error) {
      console.error(
        `Failed to generate quests for ${student.username}:`,
        error
      );
      failed++;
    }
  }

  return { processed, failed };
}

// Clean up old quest data (older than 2 weeks)
export async function cleanupOldQuests(): Promise<number> {
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const result = await prisma.studentQuest.deleteMany({
    where: {
      weekStart: {
        lt: twoWeeksAgo,
      },
    },
  });

  return result.count;
}

// Get quest statistics for analytics
export async function getQuestStatistics() {
  const weekStart = getWeekStart();

  const stats = await prisma.studentQuest.groupBy({
    by: ["questId"],
    where: {
      weekStart: {
        gte: weekStart,
        lt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
    },
    _count: {
      id: true,
    },
    _sum: {
      progress: true,
    },
    _avg: {
      progress: true,
    },
  });

  return stats;
}
