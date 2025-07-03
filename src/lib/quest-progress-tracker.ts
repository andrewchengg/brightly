import { PrismaClient, PracticeSession } from "@/generated/prisma";
import { getWeekStart } from "./quest-service";

const prisma = new PrismaClient();

interface PracticeSessionWithDetails extends PracticeSession {
  subject?: { id: number; name: string } | null;
  topic?: { id: number; name: string } | null;
  student: { id: string; level: number };
}

// Helper function to calculate accuracy from practice session
function calculateAccuracy(practiceSession: PracticeSession): number | null {
  if (!practiceSession.totalPossibleMarks || practiceSession.totalPossibleMarks === 0) {
    return null;
  }
  const marksEarned = practiceSession.totalMarksEarned || 0;
  return Math.round((marksEarned / practiceSession.totalPossibleMarks) * 100);
}

// Main function to update all quest progress when a practice session is completed
export async function updateQuestProgressForSession(
  practiceSession: PracticeSessionWithDetails
) {
  const { studentId } = practiceSession;
  const weekStart = getWeekStart();

  console.log(
    `🎯 Updating quest progress for student ${studentId} after practice session`
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

  // Update each quest based on the practice session
  for (const studentQuest of activeQuests) {
    await updateSpecificQuest(studentQuest, practiceSession);
  }
}

// Update progress for a specific quest based on practice session data
async function updateSpecificQuest(
  studentQuest: any,
  practiceSession: PracticeSessionWithDetails
) {
  const { quest } = studentQuest;
  let progressIncrement = 0;

  switch (quest.questType) {
    case "earn-xp":
      // Award progress based on XP earned from the session
      progressIncrement = practiceSession.xpEarned || 0;
      break;

    case "high-score":
      // Check if session had 80%+ accuracy
      const accuracy = calculateAccuracy(practiceSession);
      if (accuracy && accuracy >= 80) {
        progressIncrement = 1;
      }
      break;

    case "review-mistakes":
      // This will be updated separately when mistakes are reviewed
      return;

    case "multi-subject":
      // Track unique subjects practiced this week
      progressIncrement = await updateSubjectQuestProgress(
        studentQuest,
        practiceSession
      );
      break;

    case "subject-specialist":
      // Count sessions in the student's most practiced subject
      if (practiceSession.subjectId) {
        const mostPracticedSubject = await getMostPracticedSubject(
          practiceSession.studentId
        );
        if (practiceSession.subjectId === mostPracticedSubject) {
          progressIncrement = 1;
        }
      }
      break;

    case "cross-subject-explorer":
      // Check if this is a new subject for the week
      if (practiceSession.subjectId) {
        const isNewSubject = await isNewSubjectThisWeek(
          practiceSession.studentId,
          practiceSession.subjectId
        );
        if (isNewSubject) {
          progressIncrement = 1;
        }
      }
      break;

    case "weekly-warrior":
      // Track unique days practiced this week
      progressIncrement = await updateDailyQuestProgress(
        studentQuest,
        practiceSession
      );
      break;

    case "consistent-learner":
      // Track days with 2+ sessions
      progressIncrement = await updateConsistencyQuestProgress(
        studentQuest,
        practiceSession
      );
      break;

    case "perfect-week":
      // Track unique days practiced this week
      progressIncrement = await updateDailyQuestProgress(
        studentQuest,
        practiceSession
      );
      break;

    case "rising-star":
      // Track sessions with increasing difficulty
      progressIncrement = await updateDifficultyQuestProgress(
        studentQuest,
        practiceSession
      );
      break;

    case "challenge-seeker":
      // Track random practice sessions
      if (practiceSession.type === "PRACTICE") {
        progressIncrement = 1;
      }
      break;

    case "topic-explorer":
      // Track unique topics practiced this week
      progressIncrement = await updateTopicQuestProgress(
        studentQuest,
        practiceSession
      );
      break;

    case "score-champion":
      // Check weekly average accuracy (calculated at end of week)
      const weeklyAccuracy = await calculateWeeklyAccuracy(
        practiceSession.studentId,
        getWeekStart()
      );
      if (weeklyAccuracy && weeklyAccuracy >= 80) {
        progressIncrement = 1;
      }
      break;

    case "speed-demon":
      // Count total practice sessions
      progressIncrement = 1;
      break;

    case "perfectionist":
      // Check if session had 95%+ accuracy
      const perfectAccuracy = calculateAccuracy(practiceSession);
      if (perfectAccuracy && perfectAccuracy >= 95) {
        progressIncrement = 1;
      }
      break;

    case "knowledge-seeker":
      // Track new topics never tried before
      if (practiceSession.topicId) {
        const isNewTopic = await isNewTopicForStudent(
          practiceSession.studentId,
          practiceSession.topicId
        );
        if (isNewTopic) {
          progressIncrement = 1;
        }
      }
      break;

    case "weakness-warrior":
      // Track sessions in lowest-performing subject
      if (practiceSession.subjectId) {
        const weakestSubject = await getLowestPerformingSubject(
          practiceSession.studentId
        );
        if (practiceSession.subjectId === weakestSubject) {
          progressIncrement = 1;
        }
      }
      break;

    case "balanced-learner":
      // Track subjects with 70%+ score
      progressIncrement = await updateBalancedLearnerProgress(
        studentQuest,
        practiceSession
      );
      break;

    // New quest types support
    case "practice-sessions":
      // Count all practice sessions
      progressIncrement = 1;
      break;

    case "daily-dedication":
      // Track consecutive days with at least one session
      progressIncrement = await updateDailyQuestProgress(
        studentQuest,
        practiceSession
      );
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

    case "speedster":
      // Check if session was completed in under 10 minutes
      const durationSeconds = practiceSession.durationSeconds;
      if (durationSeconds && durationSeconds < 10 * 60) {
        // 10 minutes in seconds
        progressIncrement = 1;
      }
      break;

    case "endurance-runner":
      // Check if session lasted over 20 minutes
      const sessionDurationSeconds = practiceSession.durationSeconds;
      if (sessionDurationSeconds && sessionDurationSeconds > 20 * 60) {
        // 20 minutes in seconds
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

    case "night-owl":
      // Check if session was completed after 8 PM
      const nightHour = new Date(
        practiceSession.endTime || new Date()
      ).getHours();
      if (nightHour >= 20) {
        // 8 PM or later
        progressIncrement = 1;
      }
      break;

    case "weekend-warrior":
      // Check if session was on weekend
      const dayOfWeek = new Date(
        practiceSession.endTime || new Date()
      ).getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        // Sunday or Saturday
        // Weekend progress calculation (placeholder implementation)
        progressIncrement = 1; // Simple increment for weekend sessions
      }
      break;

    case "first-try-success":
      // Track questions answered correctly on first attempt
      progressIncrement = practiceSession.correctAnswers || 0;
      break;

    // Simplified implementations for complex quest types
    case "rising-star":
    case "combo-master":
    case "curious-learner":
    case "study-habits":
    case "league-climber":
    case "comeback-champion":
    case "level-achiever":
    case "marathon-runner":
    case "question-variety":
    case "improvement-tracker":
      // These will be implemented later with more complex logic
      console.log(`Quest type ${quest.questType} not fully implemented yet`);
      return;
      break;

    default:
      console.log(`Unknown quest type: ${quest.questType}`);
      return;
  }

  // Apply the progress increment
  if (progressIncrement > 0) {
    await applyQuestProgressIncrement(studentQuest.id, progressIncrement);
  }
}

// Apply progress increment and check for completion
async function applyQuestProgressIncrement(
  studentQuestId: string,
  increment: number
) {
  const studentQuest = await prisma.studentQuest.findUnique({
    where: { id: studentQuestId },
    include: { quest: true },
  });

  if (!studentQuest || studentQuest.isCompleted) return;

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

  if (isCompleted) {
    console.log(
      `🏆 Quest completed: ${studentQuest.quest.title} for student ${studentQuest.studentId}`
    );
  }
}

// Helper functions for complex quest progress tracking

async function updateSubjectQuestProgress(
  studentQuest: any,
  practiceSession: PracticeSessionWithDetails
): Promise<number> {
  if (!practiceSession.subjectId) return 0;

  const weekStart = getWeekStart();
  const uniqueSubjects = await prisma.practiceSession.groupBy({
    by: ["subjectId"],
    where: {
      studentId: practiceSession.studentId,
      createdAt: {
        gte: weekStart,
        lt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
      subjectId: { not: null },
    },
  });

  const newProgress = uniqueSubjects.length;
  const increment = Math.max(0, newProgress - studentQuest.progress);
  return increment;
}

async function updateDailyQuestProgress(
  studentQuest: any,
  practiceSession: PracticeSessionWithDetails
): Promise<number> {
  const weekStart = getWeekStart();

  // Get unique days this student has practiced this week
  const sessions = await prisma.practiceSession.findMany({
    where: {
      studentId: practiceSession.studentId,
      createdAt: {
        gte: weekStart,
        lt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
    },
    select: { createdAt: true },
  });

  const uniqueDays = new Set(
    sessions.map((session) => session.createdAt.toDateString())
  );

  const newProgress = uniqueDays.size;
  const increment = Math.max(0, newProgress - studentQuest.progress);
  return increment;
}

async function updateConsistencyQuestProgress(
  studentQuest: any,
  practiceSession: PracticeSessionWithDetails
): Promise<number> {
  const weekStart = getWeekStart();

  // Group sessions by day and count days with 2+ sessions
  const dailySessions = await prisma.practiceSession.groupBy({
    by: ["createdAt"],
    where: {
      studentId: practiceSession.studentId,
      createdAt: {
        gte: weekStart,
        lt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
    },
    _count: { id: true },
  });

  const daysWithMultipleSessions = dailySessions.filter(
    (day) => day._count.id >= 2
  ).length;
  const increment = Math.max(
    0,
    daysWithMultipleSessions - studentQuest.progress
  );
  return increment;
}

async function updateTopicQuestProgress(
  studentQuest: any,
  practiceSession: PracticeSessionWithDetails
): Promise<number> {
  if (!practiceSession.topicId) return 0;

  const weekStart = getWeekStart();
  const uniqueTopics = await prisma.practiceSession.groupBy({
    by: ["topicId"],
    where: {
      studentId: practiceSession.studentId,
      createdAt: {
        gte: weekStart,
        lt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
      topicId: { not: null },
    },
  });

  const newProgress = uniqueTopics.length;
  const increment = Math.max(0, newProgress - studentQuest.progress);
  return increment;
}

async function updateDifficultyQuestProgress(
  studentQuest: any,
  practiceSession: PracticeSessionWithDetails
): Promise<number> {
  // This would need more complex logic to track increasing difficulty
  // For now, just count any session as progress
  return 1;
}

async function updateWeeklyAccuracyProgress(
  studentQuest: any,
  practiceSession: PracticeSessionWithDetails
): Promise<number> {
  const weekStart = getWeekStart();

  // Calculate average score for the week
  const weekSessions = await prisma.practiceSession.findMany({
    where: {
      studentId: practiceSession.studentId,
      createdAt: {
        gte: weekStart,
        lt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
      totalMarksEarned: { not: null },
      totalPossibleMarks: { not: null },
    },
    select: { totalMarksEarned: true, totalPossibleMarks: true },
  });

  if (weekSessions.length === 0) return 0;

  const totalMarksEarned = weekSessions.reduce(
    (sum, session) => sum + (session.totalMarksEarned || 0),
    0
  );
  const totalPossibleMarks = weekSessions.reduce(
    (sum, session) => sum + (session.totalPossibleMarks || 0),
    0
  );

  const averageAccuracy =
    totalPossibleMarks > 0
      ? (totalMarksEarned / totalPossibleMarks) * 100
      : 0;

  if (averageAccuracy >= 85 && studentQuest.progress === 0) {
    return 1; // Quest completed
  }

  return 0;
}

async function updateBalancedLearnerProgress(
  studentQuest: any,
  practiceSession: PracticeSessionWithDetails
): Promise<number> {
  if (
    !practiceSession.subjectId ||
    !practiceSession.totalMarksEarned ||
    !practiceSession.totalPossibleMarks ||
    practiceSession.totalPossibleMarks === 0
  ) {
    return 0;
  }

  const weekStart = getWeekStart();

  // Count subjects with 70%+ average score this week
  const subjectPerformance = await prisma.practiceSession.groupBy({
    by: ["subjectId"],
    where: {
      studentId: practiceSession.studentId,
      createdAt: {
        gte: weekStart,
        lt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
      subjectId: { not: null },
      totalMarksEarned: { not: null },
      totalPossibleMarks: { not: null },
    },
    _avg: {
      totalMarksEarned: true,
      totalPossibleMarks: true,
    },
  });

  const subjectsWithGoodAccuracy = subjectPerformance.filter(
    (subject) => {
      const totalMarksEarned = subject._avg.totalMarksEarned || 0;
      const totalPossibleMarks = subject._avg.totalPossibleMarks || 0;
      return totalPossibleMarks > 0 && (totalMarksEarned / totalPossibleMarks) * 100 >= 70;
    }
  ).length;

  const increment = Math.max(
    0,
    subjectsWithGoodAccuracy - studentQuest.progress
  );
  return increment;
}

// Helper utility functions

async function getMostPracticedSubject(
  studentId: string
): Promise<number | null> {
  const subjectCounts = await prisma.practiceSession.groupBy({
    by: ["subjectId"],
    where: { studentId, subjectId: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });

  return subjectCounts[0]?.subjectId || null;
}

async function getLowestPerformingSubject(
  studentId: string
): Promise<number | null> {
  const subjectPerformance = await prisma.practiceSession.groupBy({
    by: ["subjectId"],
    where: {
      studentId,
      subjectId: { not: null },
      totalMarksEarned: { not: null },
      totalPossibleMarks: { not: null },
    },
    _avg: {
      totalMarksEarned: true,
      totalPossibleMarks: true,
    },
    orderBy: { _avg: { totalMarksEarned: "asc" } },
  });

  return subjectPerformance[0]?.subjectId || null;
}

async function isNewSubjectThisWeek(
  studentId: string,
  subjectId: number
): Promise<boolean> {
  const weekStart = getWeekStart();

  const existingSessions = await prisma.practiceSession.count({
    where: {
      studentId,
      subjectId,
      createdAt: {
        gte: weekStart,
        lt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
    },
  });

  return existingSessions <= 1; // Current session would be the first
}

async function isNewTopicForStudent(
  studentId: string,
  topicId: number
): Promise<boolean> {
  const existingSessions = await prisma.practiceSession.count({
    where: { studentId, topicId },
  });

  return existingSessions <= 1; // Current session would be the first
}

// Function to update mistake review progress (called from mistake review system)
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
  });

  for (const quest of reviewQuests) {
    await applyQuestProgressIncrement(quest.id, mistakesReviewed);
  }
}

// Calculate average accuracy for the week
async function calculateWeeklyAccuracy(
  studentId: string,
  weekStart: Date
): Promise<number | null> {
  const weekSessions = await prisma.practiceSession.findMany({
    where: {
      studentId,
      startTime: {
        gte: weekStart,
        lt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
      status: "COMPLETED",
    },
    select: {
      totalMarksEarned: true,
      totalPossibleMarks: true,
    },
  });

  if (weekSessions.length === 0) {
    return null;
  }

  const totalMarksEarned = weekSessions.reduce(
    (sum, session) => sum + (session.totalMarksEarned || 0),
    0
  );
  const totalPossibleMarks = weekSessions.reduce(
    (sum, session) => sum + (session.totalPossibleMarks || 0),
    0
  );

  if (totalPossibleMarks === 0) {
    return null;
  }

  return Math.round((totalMarksEarned / totalPossibleMarks) * 100);
}

// Count subjects with minimum accuracy this week
async function getSubjectsWithMinAccuracy(
  studentId: string,
  weekStart: Date,
  minAccuracy: number
): Promise<number> {
  const subjectStats = await prisma.practiceSession.groupBy({
    by: ["subjectId"],
    where: {
      studentId,
      startTime: {
        gte: weekStart,
        lt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
      totalMarksEarned: { not: null },
      totalPossibleMarks: { not: null },
    },
    _sum: {
      totalMarksEarned: true,
      totalPossibleMarks: true,
    },
  });

  return subjectStats.filter((subject) => {
    const totalMarksEarned = subject._sum.totalMarksEarned || 0;
    const totalPossibleMarks = subject._sum.totalPossibleMarks || 0;
    return totalPossibleMarks > 0 && (totalMarksEarned / totalPossibleMarks) * 100 >= minAccuracy;
  }).length;
}

// Get worst performing subjects
async function getWorstPerformingSubjects(
  studentId: string,
  weekStart: Date
): Promise<{ subjectId: number; accuracy: number }[]> {
  const subjectStats = await prisma.practiceSession.groupBy({
    by: ["subjectId"],
    where: {
      studentId,
      startTime: {
        gte: weekStart,
        lt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
      totalMarksEarned: { not: null },
      totalPossibleMarks: { not: null },
    },
    _sum: {
      totalMarksEarned: true,
      totalPossibleMarks: true,
    },
    orderBy: {
      _sum: {
        totalMarksEarned: "asc",
      },
    },
  });

  return subjectStats
    .map((subject) => {
      const totalMarksEarned = subject._sum.totalMarksEarned || 0;
      const totalPossibleMarks = subject._sum.totalPossibleMarks || 0;
      return {
        subjectId: subject.subjectId!,
        accuracy:
          totalPossibleMarks > 0
            ? (totalMarksEarned / totalPossibleMarks) * 100
            : 0,
      };
    })
    .filter((subject) => subject.accuracy > 0 && subject.subjectId !== null)
    .sort((a, b) => a.accuracy - b.accuracy);
}
