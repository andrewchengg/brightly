import { PrismaClient } from "@/generated/prisma";
// import { generateWeeklyQuests } from "./weekly-quest-service-raw"; // Temporarily disabled - needs schema update
import { calculateLevel } from "./xp-utils";

const prisma = new PrismaClient();

/**
 * Check if a student just reached level 2 and needs their first weekly quests
 * This should be called whenever a student's level is updated
 */
export async function checkAndGenerateFirstQuests(
  studentId: string,
  newLevel: number,
  oldLevel?: number
) {
  // If student just reached level 2, generate their first quests
  if (newLevel >= 2 && (oldLevel === undefined || oldLevel < 2)) {
    try {
      // Check if they already have quests for this week
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of this week (Sunday)
      weekStart.setHours(0, 0, 0, 0);

      const existingQuests = await prisma.studentQuest.findMany({
        where: {
          studentId,
          weekStart: {
            gte: weekStart,
            lt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
        },
      });

      if (existingQuests.length === 0) {
        // await generateWeeklyQuests(studentId, newLevel); // Temporarily disabled - needs schema update
        return {
          questsGenerated: true,
          message: "Congratulations! You've unlocked weekly quests!",
        };
      } else {
        return {
          questsGenerated: false,
          message: "Weekly quests already exist",
        };
      }
    } catch (error: any) {
      console.error(
        `❌ Failed to generate first quests for student ${studentId}:`,
        error
      );
      return { questsGenerated: false, error: error.message };
    }
  }

  return { questsGenerated: false, message: "No quest generation needed" };
}

/**
 * Update student level and automatically handle quest generation
 */
export async function updateStudentLevelWithQuestCheck(
  studentId: string,
  newLevel: number
) {
  try {
    // Get current XP and calculate level instead of using stored level
    const currentStudent = await prisma.student.findUnique({
      where: { id: studentId },
      select: { level: true, xpPoints: true },
    });

    const oldLevel = calculateLevel(currentStudent?.xpPoints || 0);

    // Update the level
    await prisma.student.update({
      where: { id: studentId },
      data: { level: newLevel },
    });

    // Check and generate quests if needed
    const questResult = await checkAndGenerateFirstQuests(
      studentId,
      newLevel,
      oldLevel
    );

    return {
      levelUpdated: true,
      oldLevel,
      newLevel,
      ...questResult,
    };
  } catch (error) {
    console.error(`❌ Failed to update level for student ${studentId}:`, error);
    throw error;
  }
}
