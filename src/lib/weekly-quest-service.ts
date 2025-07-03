import { PrismaClient, PracticeSession } from "@/generated/prisma";
import { WEEKLY_QUEST_TEMPLATES } from "@/app/(dashboard)/student/practice/weekly-quests-config";

const prisma = new PrismaClient();

// Temporary enum until Prisma regenerates
enum WeeklyQuestCategory {
  CORE = "CORE",
  SUBJECT = "SUBJECT",
  CONSISTENCY = "CONSISTENCY",
  CHALLENGE = "CHALLENGE",
  PERFORMANCE = "PERFORMANCE",
  SOCIAL = "SOCIAL",
  LEARNING = "LEARNING",
}

// Helper function to get the start of the week (Monday)
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

// Helper function to get the end of the week (Sunday)
export function getWeekEnd(weekStart: Date): Date {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
}

// Get current week's quests for a student
export async function getCurrentWeekQuests(studentId: string) {
  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd(weekStart);

  let quests = await prisma.studentQuest.findMany({
    where: {
      studentId,
      weekStart: {
        gte: weekStart,
        lt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // If no quests exist for this week, generate them
  if (quests.length === 0) {
    quests = await generateWeeklyQuests(studentId);
  }

  return quests;
}

// Generate 5 weekly quests for a student
export async function generateWeeklyQuests(
  studentId: string,
  level: number = 1
) {
  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd(weekStart);

  // Check if quests already exist for this week
  const existingQuests = await prisma.studentQuest.findMany({
    where: {
      studentId,
      weekStart: {
        gte: weekStart,
        lt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
    },
  });

  if (existingQuests.length >= 5) {
    return existingQuests;
  }

  // Get student level
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { level: true },
  });

  const studentLevel = student?.level || 1;

  // Always include at least one core quest
  const coreQuests = WEEKLY_QUEST_TEMPLATES.filter(
    (q) => q.category === "core"
  );
  const otherQuests = WEEKLY_QUEST_TEMPLATES.filter(
    (q) => q.category !== "core"
  );

  // Shuffle arrays
  const shuffledCore = [...coreQuests].sort(() => Math.random() - 0.5);
  const shuffledOther = [...otherQuests].sort(() => Math.random() - 0.5);

  // Select quest templates (at least 1 core, rest random)
  const questsToGenerate = 5 - existingQuests.length;
  const coreCount = Math.min(2, questsToGenerate);
  const otherCount = questsToGenerate - coreCount;

  const selectedTemplates = [
    ...shuffledCore.slice(0, coreCount),
    ...shuffledOther.slice(0, otherCount),
  ];

  // Filter out existing quest types - need to include quest relation to access questType
  const existingQuestsWithQuest = await prisma.studentQuest.findMany({
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
  });

  const existingTypes = existingQuestsWithQuest.map((q) => q.quest.questType);
  const filteredTemplates = selectedTemplates.filter(
    (t) => !existingTypes.includes(t.id)
  );

  // Generate quest objects using Prisma ORM with proper relations
  if (filteredTemplates.length > 0) {
    for (const template of filteredTemplates) {
      const questData = template.template(studentLevel);

      // Convert React icon component to string name
      const iconName = questData.icon.name || "FaTrophy";

      // First, check if a Quest with this questType already exists
      let quest = await prisma.quest.findUnique({
        where: { questType: template.id },
      });

      // If quest doesn't exist, create it
      if (!quest) {
        quest = await prisma.quest.create({
          data: {
            questType: template.id,
            title: questData.title,
            description: questData.description,
            baseTarget: questData.target,
            icon: iconName,
            color: questData.color,
            category: template.category.toUpperCase() as WeeklyQuestCategory,
            xpReward: 25, // Default XP reward
          },
        });
      }

      // Create StudentQuest linking to the Quest
      await prisma.studentQuest.create({
        data: {
          studentId,
          questId: quest.id,
          target: questData.target,
          progress: 0,
          weekStart,
          weekEnd,
        },
      });
    }
  }

  // Return all quests for this week with quest relation
  return await prisma.studentQuest.findMany({
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
}

// Update quest progress when a practice session is completed
export async function updateQuestProgress(
  practiceSession: PracticeSession & {
    subject?: { name: string } | null;
    topic?: { name: string } | null;
    student: { level: number };
  }
) {
  const weekStart = getWeekStart(practiceSession.endTime || new Date());

  // Get active quests for this week
  const activeQuests = await prisma.studentQuest.findMany({
    where: {
      studentId: practiceSession.studentId,
      weekStart: {
        gte: weekStart,
        lt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
      isCompleted: false,
    },
    include: {
      quest: true,
    },
  });

  const updates = [];

  for (const quest of activeQuests) {
    let progressToAdd = 0;
    let shouldComplete = false;

    switch (quest.quest.questType) {
      case "earn-xp":
        progressToAdd = practiceSession.xpEarned || 0;
        break;

      case "high-accuracy":
        if (practiceSession.totalMarksEarned && practiceSession.totalPossibleMarks) {
          const accuracy = practiceSession.totalMarksEarned / practiceSession.totalPossibleMarks;
          if (accuracy >= 0.8) { // 80% or higher
            progressToAdd = 1;
          }
        }
        break;

      case "speed-demon":
        progressToAdd = 1; // Each completed session counts
        break;

      case "multi-subject":
        // Track unique subjects practiced this week
        const subjectCount = await getUniqueSubjectsThisWeek(
          practiceSession.studentId,
          weekStart
        );

        // Only update if we found more unique subjects than currently recorded
        if (subjectCount > quest.progress) {
          shouldComplete = subjectCount >= quest.target;
          progressToAdd = subjectCount - quest.progress;
        }
        break;

      case "subject-master":
        if (practiceSession.subject) {
          // Get number of sessions for this subject this week
          const subjectSessions = await getSubjectSessionsThisWeek(
            practiceSession.studentId,
            practiceSession.subjectId!,
            weekStart
          );

          // Only update if we found more sessions than currently recorded
          if (subjectSessions > quest.progress) {
            shouldComplete = subjectSessions >= quest.target;
            progressToAdd = subjectSessions - quest.progress;
          }
        }
        break;

      case "daily-practice":
        // Track unique days with practice this week
        const uniqueDays = await getUniqueDaysThisWeek(
          practiceSession.studentId,
          weekStart
        );

        // Only update if we found more unique days than currently recorded
        if (uniqueDays > quest.progress) {
          shouldComplete = uniqueDays >= quest.target;
          progressToAdd = uniqueDays - quest.progress;
        }
        break;

      case "practice-champion":
        // Track days with multiple practice sessions
        const daysWithMultiple = await getDaysWithMultipleSessionsThisWeek(
          practiceSession.studentId,
          weekStart
        );

        // Only update if we found more days than currently recorded
        if (daysWithMultiple > quest.progress) {
          shouldComplete = daysWithMultiple >= quest.target;
          progressToAdd = daysWithMultiple - quest.progress;
        }
        break;

      case "topic-explorer":
        // Track unique topics practiced this week
        const topicCount = await getUniqueTopicsThisWeek(
          practiceSession.studentId,
          weekStart
        );

        // Only update if we found more unique topics than currently recorded
        if (topicCount > quest.progress) {
          shouldComplete = topicCount >= quest.target;
          progressToAdd = topicCount - quest.progress;
        }
        break;

      case "perfect-score":
        if (practiceSession.totalMarksEarned && practiceSession.totalPossibleMarks) {
          const accuracy = practiceSession.totalMarksEarned / practiceSession.totalPossibleMarks;
          if (accuracy >= 1) { // 100%
            progressToAdd = 1;
          }
        }
        break;

      case "improvement":
        // This is handled separately in a weekly review
        break;

      case "learning-streak":
        // This is handled by the streak system
        break;

      default:
        console.log(`Unknown quest type: ${quest.quest.questType}`);
    }

    if (progressToAdd > 0 || shouldComplete) {
      updates.push(
        prisma.studentQuest.update({
          where: { id: quest.id },
          data: {
            progress: shouldComplete
              ? quest.target
              : quest.progress + progressToAdd,
            isCompleted: shouldComplete,
          },
        })
      );
    }
  }

  // Execute all updates in parallel
  if (updates.length > 0) {
    await Promise.all(updates);
  }
}

// Helper functions for complex quest calculations
async function getUniqueSubjectsThisWeek(
  studentId: string,
  weekStart: Date
): Promise<number> {
  const weekEnd = getWeekEnd(weekStart);
  const sessions = await prisma.practiceSession.findMany({
    where: {
      studentId,
      status: "COMPLETED",
      endTime: {
        gte: weekStart,
        lte: weekEnd,
      },
    },
    select: { subjectId: true },
    distinct: ["subjectId"],
  });
  return sessions.filter((s) => s.subjectId).length;
}

async function getSubjectSessionsThisWeek(
  studentId: string,
  subjectId: number,
  weekStart: Date
): Promise<number> {
  const weekEnd = getWeekEnd(weekStart);
  return await prisma.practiceSession.count({
    where: {
      studentId,
      subjectId,
      status: "COMPLETED",
      endTime: {
        gte: weekStart,
        lte: weekEnd,
      },
    },
  });
}

async function getUniqueDaysThisWeek(
  studentId: string,
  weekStart: Date
): Promise<number> {
  const weekEnd = getWeekEnd(weekStart);
  const sessions = await prisma.practiceSession.findMany({
    where: {
      studentId,
      status: "COMPLETED",
      endTime: {
        gte: weekStart,
        lte: weekEnd,
      },
    },
    select: { endTime: true },
  });

  const uniqueDays = new Set();
  sessions.forEach((session) => {
    if (session.endTime) {
      const day = session.endTime.toDateString();
      uniqueDays.add(day);
    }
  });

  return uniqueDays.size;
}

async function getDaysWithMultipleSessionsThisWeek(
  studentId: string,
  weekStart: Date
): Promise<number> {
  const weekEnd = getWeekEnd(weekStart);
  const sessions = await prisma.practiceSession.findMany({
    where: {
      studentId,
      status: "COMPLETED",
      endTime: {
        gte: weekStart,
        lte: weekEnd,
      },
    },
    select: { endTime: true },
  });

  const dayCount: { [key: string]: number } = {};
  sessions.forEach((session) => {
    if (session.endTime) {
      const day = session.endTime.toDateString();
      dayCount[day] = (dayCount[day] || 0) + 1;
    }
  });

  return Object.values(dayCount).filter((count) => count >= 2).length;
}

async function getUniqueTopicsThisWeek(
  studentId: string,
  weekStart: Date
): Promise<number> {
  const weekEnd = getWeekEnd(weekStart);
  const sessions = await prisma.practiceSession.findMany({
    where: {
      studentId,
      status: "COMPLETED",
      endTime: {
        gte: weekStart,
        lte: weekEnd,
      },
    },
    select: { topicId: true },
    distinct: ["topicId"],
  });
  return sessions.filter((s) => s.topicId).length;
}

// Refresh incomplete quests (generate new ones to replace incomplete ones)
export async function refreshIncompleteQuests(studentId: string) {
  const weekStart = getWeekStart();

  const currentQuests = await prisma.studentQuest.findMany({
    where: {
      studentId,
      weekStart: {
        gte: weekStart,
        lt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
    },
  });

  const incompleteQuests = currentQuests.filter((q) => !q.isCompleted);
  const completedCount = currentQuests.length - incompleteQuests.length;

  // If all quests are completed, don't generate new ones
  if (completedCount >= 5) {
    return currentQuests;
  }

  // Delete incomplete quests
  if (incompleteQuests.length > 0) {
    await prisma.studentQuest.deleteMany({
      where: {
        id: {
          in: incompleteQuests.map((q) => q.id),
        },
      },
    });
  }

  // Generate new quests to fill up to 5 total
  return await generateWeeklyQuests(studentId);
}

// Reset weekly quests (called at the start of each week)
export async function resetWeeklyQuests() {
  const lastWeekStart = new Date(getWeekStart());
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  // Archive or delete old quests (older than last week)
  await prisma.studentQuest.deleteMany({
    where: {
      weekStart: {
        lt: lastWeekStart,
      },
    },
  });
}
