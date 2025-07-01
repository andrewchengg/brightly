import { PrismaClient, PracticeSession } from "@/generated/prisma";
import { getWeekStart } from "./quest-service";

const prisma = new PrismaClient();

interface PracticeSessionWithDetails extends PracticeSession {
  subject?: { id: number; name: string } | null;
  topic?: { id: number; name: string } | null;
  student: { id: string; level: number };
}

// Helper function to calculate accuracy from practice session
function calculateAccuracy(session: PracticeSessionWithDetails): number | null {
  if (!session.totalQuestions || session.totalQuestions === 0) {
    return null;
  }
  const correctAnswers = session.correctAnswers || 0;
  return Math.round((correctAnswers / session.totalQuestions) * 100);
}

// Main function to update all quest progress when a practice session is completed
export async function updateQuestProgressForSession(
  practiceSession: PracticeSessionWithDetails
) {
  const { studentId } = practiceSession;
  const weekStart = getWeekStart();

  console.log(
    `🎯 Updating quest progress for student ${studentId} after practice session ${practiceSession.id}`
  );
  console.log(
    `   Session Type: ${practiceSession.type}, Subject: ${
      practiceSession.subject?.name || "None"
    }, Topic: ${practiceSession.topic?.name || "None"}`
  );
  console.log(
    `   Score: ${practiceSession.score}, Correct: ${practiceSession.correctAnswers}/${practiceSession.totalQuestions}, XP: ${practiceSession.xpEarned}`
  );

  // Get all active quests for this student for the current week
  const activeQuests = await prisma.studentQuest.findMany({
    where: {
      studentId,
      isCompleted: false,
      weekStart: {
        gte: weekStart,
        lt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
    },
    include: {
      quest: true,
    },
  });

  console.log(`   Found ${activeQuests.length} active quests to check:`);
  activeQuests.forEach((sq) => {
    console.log(
      `   - ${sq.quest.title} (${sq.quest.questType}): ${sq.progress}/${sq.target}`
    );
  });

  // Update each quest based on the practice session
  for (const studentQuest of activeQuests) {
    console.log(
      `\n   Checking quest: ${studentQuest.quest.title} (${studentQuest.quest.questType})`
    );
    await updateSpecificQuest(studentQuest, practiceSession);
  }

  console.log(`🎯 Finished updating quest progress for student ${studentId}\n`);
}

// Simplified quest update function
async function updateSpecificQuest(
  studentQuest: any,
  practiceSession: PracticeSessionWithDetails
) {
  const { quest } = studentQuest;
  let progressIncrement = 0;

  console.log(`     Evaluating quest type: ${quest.questType}`);

  switch (quest.questType) {
    case "earn-xp":
      // Award progress based on XP earned from the session
      progressIncrement = practiceSession.xpEarned || 0;
      break;

    case "practice-sessions":
      // Count all practice sessions
      progressIncrement = 1;
      break;

    case "high-accuracy":
      // Check if session had 80%+ accuracy
      const accuracy = calculateAccuracy(practiceSession);
      if (accuracy && accuracy >= 80) {
        progressIncrement = 1;
      }
      break;

    case "perfectionist":
      // Check if session had 95%+ accuracy
      const perfectAccuracy = calculateAccuracy(practiceSession);
      if (perfectAccuracy && perfectAccuracy >= 95) {
        progressIncrement = 1;
      }
      break;

    case "no-mistakes":
      // Check if session had 100% accuracy
      const flawlessAccuracy = calculateAccuracy(practiceSession);
      if (flawlessAccuracy && flawlessAccuracy >= 100) {
        progressIncrement = 1;
      }
      break;

    case "weekly-warrior":
      // Track unique days practiced this week
      progressIncrement = await updateDailyQuestProgress(
        studentQuest,
        practiceSession
      );
      break;

    case "speed-demon":
      // Count total practice sessions
      progressIncrement = 1;
      break;

    case "speedster":
      // Check if session was completed in under 10 minutes
      const durationSeconds = practiceSession.durationSeconds;
      if (durationSeconds && durationSeconds < 10 * 60) {
        progressIncrement = 1;
      }
      break;

    case "endurance-runner":
      // Check if session lasted over 20 minutes
      const sessionDuration = practiceSession.durationSeconds;
      if (sessionDuration && sessionDuration > 20 * 60) {
        progressIncrement = 1;
      }
      break;

    case "morning-learner":
      // Check if session was completed before 12 PM
      const sessionHour = new Date(
        practiceSession.endTime || new Date()
      ).getHours();
      if (sessionHour < 12) {
        progressIncrement = 1;
      }
      break;

    case "night-owl":
      // Check if session was completed after 8 PM
      const nightHour = new Date(
        practiceSession.endTime || new Date()
      ).getHours();
      if (nightHour >= 20) {
        progressIncrement = 1;
      }
      break;

    case "first-try-success":
      // Track questions answered correctly on first attempt
      progressIncrement = practiceSession.correctAnswers || 0;
      break;

    case "daily-dedication":
      // Track consecutive days with practice
      progressIncrement = await updateDailyQuestProgress(
        studentQuest,
        practiceSession
      );
      break;

    case "weekend-warrior":
      // Check if session was on weekend
      const dayOfWeek = new Date(
        practiceSession.endTime || new Date()
      ).getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        progressIncrement = await updateWeekendProgress(
          studentQuest,
          practiceSession
        );
      }
      break;

    // Complex quest types - SKIP these for now
    case "review-mistakes":
    case "topic-explorer":
    case "consistent-learner":
    case "perfect-week":
    case "rising-star":
    case "challenge-seeker":
    case "accuracy-champion":
    case "knowledge-seeker":
    case "weakness-warrior":
    case "curious-learner":
    case "study-habits":
    case "league-climber":
    case "comeback-champion":
    case "level-achiever":
    case "marathon-runner":
    case "question-variety":
    case "improvement-tracker":
    case "combo-master":
    case "endurance-runner":
    case "night-owl":
      // These are too complex - skip for now
      console.log(`Quest type ${quest.questType} - SKIPPED (too complex)`);
      return; // Don't update progress for complex quests

    default:
      console.log(`Unknown quest type: ${quest.questType}`);
      return;
  }

  if (progressIncrement > 0) {
    console.log(`     ➕ Progress increment: ${progressIncrement}`);
    await applyQuestProgressIncrement(studentQuest.id, progressIncrement);
  } else {
    console.log(`     ⏸️  No progress increment (${progressIncrement})`);
  }
}

// Apply progress increment to quest
async function applyQuestProgressIncrement(
  studentQuestId: string,
  increment: number
) {
  const studentQuest = await prisma.studentQuest.findUnique({
    where: { id: studentQuestId },
    include: { quest: true },
  });

  if (!studentQuest) {
    console.error(`StudentQuest ${studentQuestId} not found`);
    return;
  }

  const newProgress = Math.min(
    studentQuest.progress + increment,
    studentQuest.target
  );
  const isCompleted = newProgress >= studentQuest.target;

  await prisma.studentQuest.update({
    where: { id: studentQuestId },
    data: {
      progress: newProgress,
      isCompleted,
      completedAt: isCompleted ? new Date() : null,
    },
  });

  console.log(
    `     📊 Updated quest "${studentQuest.quest.title}": ${
      studentQuest.progress
    } → ${newProgress}/${studentQuest.target} ${
      isCompleted ? "✅ COMPLETED!" : ""
    }`
  );

  // Award XP when quest is completed
  if (isCompleted && !studentQuest.isCompleted) {
    const xpReward = studentQuest.quest.xpReward || 25;
    await awardQuestCompletionXP(
      studentQuest.studentId,
      xpReward,
      studentQuest.quest.title
    );
  }
}

// Track unique days practiced this week
async function updateDailyQuestProgress(
  studentQuest: any,
  practiceSession: PracticeSessionWithDetails
): Promise<number> {
  const weekStart = getWeekStart();
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Get unique days this student has practiced this week
  const practiceSessionsThisWeek = await prisma.practiceSession.findMany({
    where: {
      studentId: practiceSession.studentId,
      endTime: {
        gte: weekStart,
        lt: weekEnd,
      },
    },
    select: {
      endTime: true,
    },
  });

  const uniqueDays = new Set(
    practiceSessionsThisWeek
      .map((session) => session.endTime?.toDateString())
      .filter(Boolean)
  );

  const actualUniqueDays = uniqueDays.size;
  const recordedProgress = studentQuest.progress;

  // If actual days > recorded progress, we need to update to the correct value
  if (actualUniqueDays > recordedProgress) {
    // Update the quest progress directly to match reality
    await prisma.studentQuest.update({
      where: { id: studentQuest.id },
      data: {
        progress: Math.min(actualUniqueDays, studentQuest.target),
        isCompleted: actualUniqueDays >= studentQuest.target,
        completedAt:
          actualUniqueDays >= studentQuest.target ? new Date() : null,
      },
    });

    return actualUniqueDays - recordedProgress; // Return the increment for logging
  }

  return 0; // No increment needed
}

// Simple weekend progress tracker
async function updateWeekendProgress(
  studentQuest: any,
  practiceSession: PracticeSessionWithDetails
): Promise<number> {
  const weekStart = getWeekStart();
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Check if student has practiced on both weekend days this week
  const weekendSessions = await prisma.practiceSession.findMany({
    where: {
      studentId: practiceSession.studentId,
      endTime: {
        gte: weekStart,
        lt: weekEnd,
      },
    },
    select: {
      endTime: true,
    },
  });

  const weekendDays = new Set(
    weekendSessions
      .filter((session) => {
        const day = session.endTime?.getDay();
        return day === 0 || day === 6; // Sunday or Saturday
      })
      .map((session) => session.endTime?.getDay())
      .filter(Boolean)
  );

  // Return 1 if both weekend days are covered, otherwise 0
  return weekendDays.size >= 2 ? 1 : 0;
}

// Award XP when quest is completed
async function awardQuestCompletionXP(
  studentId: string,
  xpReward: number,
  questTitle: string
) {
  try {
    // Update student's XP
    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: {
        xpPoints: {
          increment: xpReward,
        },
      },
      select: {
        xpPoints: true,
        username: true,
      },
    });

    console.log(
      `🎉 ${updatedStudent.username} earned ${xpReward} XP for completing "${questTitle}"! Total XP: ${updatedStudent.xpPoints}`
    );
  } catch (error) {
    console.error(`Failed to award XP for quest completion:`, error);
  }
}

// Mistake review progress (called separately)
export async function updateMistakeReviewProgress(
  studentId: string,
  mistakesReviewed: number
) {
  const weekStart = getWeekStart();

  const reviewQuests = await prisma.studentQuest.findMany({
    where: {
      studentId,
      isCompleted: false,
      weekStart: {
        gte: weekStart,
        lt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
      quest: {
        questType: "review-mistakes",
      },
    },
    include: {
      quest: true,
    },
  });

  for (const quest of reviewQuests) {
    await applyQuestProgressIncrement(quest.id, mistakesReviewed);
  }
}
