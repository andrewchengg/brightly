import { PrismaClient } from "@/generated/prisma";
import {
  generateQuestsForAllStudents,
  cleanupOldQuests,
} from "./quest-service";
import { calculateLevel } from "./xp-utils";

const prisma = new PrismaClient();

// Helper function to get Monday of current week
function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Helper function to check if it's Monday and early in the day
function isNewWeekRotationTime(): boolean {
  const now = new Date();
  const isMonday = now.getDay() === 1; // Monday
  const isEarlyMorning = now.getHours() >= 0 && now.getHours() < 6; // Between midnight and 6 AM
  return isMonday && isEarlyMorning;
}

// Main weekly quest rotation function
export async function performWeeklyQuestRotation(): Promise<{
  success: boolean;
  studentsProcessed: number;
  questsGenerated: number;
  oldQuestsCleanedUp: number;
  message: string;
}> {
  console.log("🔄 Starting weekly quest rotation...");

  try {
    // Step 1: Clean up old quests (older than 2 weeks)
    console.log("🧹 Cleaning up old quests...");
    const cleanedUpCount = await cleanupOldQuests();
    console.log(`🗑️ Cleaned up ${cleanedUpCount} old quests`);

    // Step 2: Archive completed quests from last week
    await archiveLastWeekQuests();

    // Step 3: Generate new quests for all eligible students
    console.log("🎯 Generating new weekly quests for all students...");
    const result = await generateQuestsForAllStudents();

    const totalQuests = result.processed * 2; // 2 quests per student

    console.log("✅ Weekly quest rotation completed successfully!");
    console.log(`   - ${result.processed} students processed`);
    console.log(`   - ${result.failed} students failed`);
    console.log(`   - ${totalQuests} new quests generated`);
    console.log(`   - ${cleanedUpCount} old quests cleaned up`);

    return {
      success: true,
      studentsProcessed: result.processed,
      questsGenerated: totalQuests,
      oldQuestsCleanedUp: cleanedUpCount,
      message: `Weekly rotation completed: ${result.processed} students processed, ${totalQuests} quests generated`,
    };
  } catch (error) {
    console.error("❌ Error during weekly quest rotation:", error);
    return {
      success: false,
      studentsProcessed: 0,
      questsGenerated: 0,
      oldQuestsCleanedUp: 0,
      message: `Weekly rotation failed: ${error}`,
    };
  }
}

// Archive completed quests from last week for statistics
async function archiveLastWeekQuests(): Promise<void> {
  const currentWeekStart = getWeekStart();
  const lastWeekStart = new Date(currentWeekStart);
  lastWeekStart.setDate(currentWeekStart.getDate() - 7);

  // Get completed quests from last week
  const completedQuests = await prisma.studentQuest.findMany({
    where: {
      weekStart: {
        gte: lastWeekStart,
        lt: currentWeekStart,
      },
      isCompleted: true,
    },
    include: {
      quest: true,
      student: true,
    },
  });

  console.log(
    `📊 Found ${completedQuests.length} completed quests from last week to archive`
  );

  // Here you could save to a separate analytics table or just log for now
  for (const quest of completedQuests) {
    console.log(
      `🏆 Student ${quest.student.username} completed: ${quest.quest.title}`
    );
  }

  // TODO: Could implement a QuestCompletionHistory table for analytics
}

// Check if new quests are needed (called when students access the system)
export async function checkAndGenerateQuestsIfNeeded(
  studentId: string
): Promise<boolean> {
  const weekStart = getWeekStart();

  // Check if student has quests for current week
  const existingQuests = await prisma.studentQuest.findMany({
    where: {
      studentId,
      weekStart: {
        gte: weekStart,
        lt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
    },
  });

  // If no quests exist, check if student is eligible and generate
  if (existingQuests.length === 0) {
    console.log(
      `🎯 No quests found for student ${studentId}, checking eligibility...`
    );

    // Check student level
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { level: true, xpPoints: true, username: true },
    });

    if (!student) {
      console.log(`❌ Student ${studentId} not found`);
      return false;
    }

    const studentLevel = calculateLevel(student.xpPoints || 0);

    if (studentLevel >= 2) {
      console.log(
        `✨ Generating quests for ${student.username} (Level ${studentLevel})`
      );
      const { generateWeeklyQuests } = await import("./quest-service");
      await generateWeeklyQuests(studentId);
      return true;
    } else {
      console.log(
        `⏳ Student ${student.username} is Level ${studentLevel}, needs Level 2+ for quests`
      );
      return false;
    }
  }

  return false; // Quests already exist
}

// Middleware function to check for weekly rotation
export async function checkWeeklyRotationNeeded(): Promise<boolean> {
  if (!isNewWeekRotationTime()) {
    return false;
  }

  // Check if rotation has already been done this week
  const currentWeekStart = getWeekStart();
  const recentQuests = await prisma.studentQuest.findFirst({
    where: {
      weekStart: {
        gte: currentWeekStart,
        lt: new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
    },
  });

  // If no quests exist for current week, rotation is needed
  if (!recentQuests) {
    console.log(
      "🗓️ New week detected and no current week quests found - rotation needed"
    );
    await performWeeklyQuestRotation();
    return true;
  }

  return false; // Rotation already done
}

// Get quest rotation status and next rotation time
export async function getQuestRotationStatus(): Promise<{
  currentWeek: string;
  nextRotation: string;
  questsThisWeek: number;
  completedQuestsThisWeek: number;
  studentsWithQuests: number;
}> {
  const weekStart = getWeekStart();
  const nextWeekStart = new Date(weekStart);
  nextWeekStart.setDate(weekStart.getDate() + 7);

  // Count quests for current week
  const questStats = await prisma.studentQuest.aggregate({
    where: {
      weekStart: {
        gte: weekStart,
        lt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
    },
    _count: {
      id: true,
    },
  });

  const completedQuestStats = await prisma.studentQuest.aggregate({
    where: {
      weekStart: {
        gte: weekStart,
        lt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
      isCompleted: true,
    },
    _count: {
      id: true,
    },
  });

  const studentsWithQuests = await prisma.studentQuest.groupBy({
    by: ["studentId"],
    where: {
      weekStart: {
        gte: weekStart,
        lt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
    },
  });

  return {
    currentWeek: weekStart.toDateString(),
    nextRotation: nextWeekStart.toDateString(),
    questsThisWeek: questStats._count.id || 0,
    completedQuestsThisWeek: completedQuestStats._count.id || 0,
    studentsWithQuests: studentsWithQuests.length,
  };
}

// Manual trigger for weekly rotation (admin use)
export async function triggerManualQuestRotation(): Promise<{
  success: boolean;
  message: string;
  details: any;
}> {
  console.log("🔧 Manual weekly quest rotation triggered");

  const result = await performWeeklyQuestRotation();

  return {
    success: result.success,
    message: result.message,
    details: {
      studentsProcessed: result.studentsProcessed,
      questsGenerated: result.questsGenerated,
      oldQuestsCleanedUp: result.oldQuestsCleanedUp,
      timestamp: new Date().toISOString(),
    },
  };
}
