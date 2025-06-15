import { PrismaClient, PracticeSession, WeeklyQuestCategory } from '@/generated/prisma';
import { WEEKLY_QUEST_TEMPLATES } from '@/app/(dashboard)/student/practice/weekly-quests-config';

const prisma = new PrismaClient();

// Temporary types until Prisma regenerates
interface WeeklyQuest {
  id: string;
  studentId: string;
  questType: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  isCompleted: boolean;
  completedAt?: Date;
  weekStart: Date;
  weekEnd: Date;
  icon: string;
  color: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
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
export async function getCurrentWeekQuests(studentId: string): Promise<WeeklyQuest[]> {
  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd(weekStart);

  // First check if we need to clean up old quests (older than 2 weeks)
  const twoWeeksAgo = new Date(weekStart);
  twoWeeksAgo.setDate(weekStart.getDate() - 14);
  
  await prisma.weeklyQuest.deleteMany({
    where: {
      studentId,
      weekStart: {
        lt: twoWeeksAgo
      }
    }
  });

  // Get quests for current week using ORM
  const quests = await prisma.weeklyQuest.findMany({
    where: {
      studentId,
      weekStart: {
        gte: weekStart,
        lt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  // If no quests exist for this week, generate them
  if (quests.length === 0) {
    return await generateWeeklyQuests(studentId);
  }

  // Convert to interface format
  return quests.map(quest => ({
    id: quest.id,
    studentId: quest.studentId,
    questType: quest.questType,
    title: quest.title,
    description: quest.description,
    target: quest.target,
    progress: quest.progress,
    isCompleted: quest.isCompleted,
    completedAt: quest.completedAt || undefined,
    weekStart: quest.weekStart,
    weekEnd: quest.weekEnd,
    icon: quest.icon,
    color: quest.color,
    category: quest.category,
    createdAt: quest.createdAt,
    updatedAt: quest.updatedAt
  }));
}

// Generate 5 weekly quests for a student
export async function generateWeeklyQuests(studentId: string, level: number = 1): Promise<WeeklyQuest[]> {
  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd(weekStart);

  // Check if quests already exist for this week using ORM
  const existingQuests = await prisma.weeklyQuest.findMany({
    where: {
      studentId,
      weekStart: {
        gte: weekStart,
        lt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
      }
    }
  });

  if (existingQuests.length >= 5) {
    return existingQuests.map(quest => ({
      id: quest.id,
      studentId: quest.studentId,
      questType: quest.questType,
      title: quest.title,
      description: quest.description,
      target: quest.target,
      progress: quest.progress,
      isCompleted: quest.isCompleted,
      completedAt: quest.completedAt || undefined,
      weekStart: quest.weekStart,
      weekEnd: quest.weekEnd,
      icon: quest.icon,
      color: quest.color,
      category: quest.category,
      createdAt: quest.createdAt,
      updatedAt: quest.updatedAt
    }));
  }

  // Get student level
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { level: true }
  });
  
  const studentLevel = student?.level || 1;

  // Always include at least one core quest
  const coreQuests = WEEKLY_QUEST_TEMPLATES.filter(q => q.category === 'core');
  const otherQuests = WEEKLY_QUEST_TEMPLATES.filter(q => q.category !== 'core');
  
  // Shuffle arrays
  const shuffledCore = [...coreQuests].sort(() => Math.random() - 0.5);
  const shuffledOther = [...otherQuests].sort(() => Math.random() - 0.5);
  
  // Select quest templates (at least 1 core, rest random)
  const questsToGenerate = 5 - existingQuests.length;
  const coreCount = Math.min(2, questsToGenerate);
  const otherCount = questsToGenerate - coreCount;
  
  const selectedTemplates = [
    ...shuffledCore.slice(0, coreCount),
    ...shuffledOther.slice(0, otherCount)
  ];

  // Filter out existing quest types
  const existingTypes = existingQuests.map(q => q.questType);
  const filteredTemplates = selectedTemplates.filter(t => !existingTypes.includes(t.id));

  // Map string categories to enum values
  const categoryMap: { [key: string]: WeeklyQuestCategory } = {
    'core': WeeklyQuestCategory.CORE,
    'subject': WeeklyQuestCategory.SUBJECT,
    'consistency': WeeklyQuestCategory.CONSISTENCY,
    'challenge': WeeklyQuestCategory.CHALLENGE,
    'performance': WeeklyQuestCategory.PERFORMANCE,
    'social': WeeklyQuestCategory.SOCIAL,
    'learning': WeeklyQuestCategory.LEARNING
  };

  // Generate quest objects using Prisma ORM instead of raw SQL
  const questsToCreate = filteredTemplates.map(template => {
    const questData = template.template(studentLevel);
    
    // Convert React icon component to string name
    const iconName = questData.icon.name || 'FaTrophy';
    
    return {
      studentId,
      questType: template.id,
      title: questData.title,
      description: questData.description,
      target: questData.target,
      progress: 0,
      weekStart,
      weekEnd,
      icon: iconName,
      color: questData.color,
      category: categoryMap[template.category] || WeeklyQuestCategory.CORE
    };
  });

  // Create quests in database using ORM
  if (questsToCreate.length > 0) {
    await prisma.weeklyQuest.createMany({
      data: questsToCreate
    });
  }

  // Return all quests for this week
  const allQuests = await prisma.weeklyQuest.findMany({
    where: {
      studentId,
      weekStart: {
        gte: weekStart,
        lt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  return allQuests.map(quest => ({
    id: quest.id,
    studentId: quest.studentId,
    questType: quest.questType,
    title: quest.title,
    description: quest.description,
    target: quest.target,
    progress: quest.progress,
    isCompleted: quest.isCompleted,
    completedAt: quest.completedAt || undefined,
    weekStart: quest.weekStart,
    weekEnd: quest.weekEnd,
    icon: quest.icon,
    color: quest.color,
    category: quest.category,
    createdAt: quest.createdAt,
    updatedAt: quest.updatedAt
  }));
}

// Update quest progress when a practice session is completed
export async function updateQuestProgress(practiceSession: PracticeSession & {
  subject?: { name: string } | null;
  topic?: { name: string } | null;
  student: { level: number };
}) {
  const weekStart = getWeekStart(practiceSession.endTime || new Date());
  
  // Get active quests for this week
  const activeQuests = await prisma.$queryRaw`
    SELECT * FROM "WeeklyQuest" 
    WHERE "studentId" = ${practiceSession.studentId} 
    AND "weekStart" >= ${weekStart}
    AND "weekStart" < ${new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)}
    AND "isCompleted" = false
  ` as WeeklyQuest[];

  for (const quest of activeQuests) {
    let progressToAdd = 0;
    let shouldComplete = false;
    let newProgress = quest.progress;

    switch (quest.questType) {
      // Core Quests
      case 'earn-xp':
        progressToAdd = practiceSession.xpEarned || 0;
        newProgress += progressToAdd;
        shouldComplete = newProgress >= quest.target;
        break;

      case 'high-accuracy':
        if (practiceSession.score && practiceSession.totalQuestions) {
          const accuracy = (practiceSession.correctAnswers || 0) / practiceSession.totalQuestions;
          if (accuracy >= 0.8) { // 80% or higher
            newProgress += 1;
            shouldComplete = newProgress >= quest.target;
          }
        }
        break;

      case 'review-mistakes':
        // This would be updated when mistakes are reviewed, not during practice sessions
        // For now, we'll keep current progress
        break;

      // Subject Mastery Quests
      case 'multi-subject':
        // Track unique subjects practiced this week
        const subjectCount = await getUniqueSubjectsThisWeek(practiceSession.studentId, weekStart);
        newProgress = subjectCount;
        shouldComplete = subjectCount >= quest.target;
        break;

      case 'subject-specialist':
        // Count sessions in the same subject
        if (practiceSession.subjectId) {
          const subjectSessionCount = await getSubjectSessionsThisWeek(
            practiceSession.studentId, 
            practiceSession.subjectId, 
            weekStart
          );
          newProgress = subjectSessionCount;
          shouldComplete = subjectSessionCount >= quest.target;
        }
        break;

      case 'cross-subject-explorer':
        // Check if this is a new subject for the week
        const newSubjectThisWeek = await isNewSubjectThisWeek(
          practiceSession.studentId,
          practiceSession.subjectId || 0,
          weekStart
        );
        if (newSubjectThisWeek) {
          newProgress = 1;
          shouldComplete = true;
        }
        break;

      // Consistency & Streak Quests
      case 'weekly-warrior':
        // Count unique days practiced
        const uniqueDays = await getUniqueDaysThisWeek(practiceSession.studentId, weekStart);
        newProgress = uniqueDays;
        shouldComplete = uniqueDays >= quest.target;
        break;

      case 'consistent-learner':
        // Count days with at least 2 sessions
        const daysWithTwoSessions = await getDaysWithMinSessions(practiceSession.studentId, weekStart, 2);
        newProgress = daysWithTwoSessions;
        shouldComplete = daysWithTwoSessions >= quest.target;
        break;

      case 'perfect-week':
        // Count unique days practiced (same as weekly-warrior but target is 7)
        const perfectWeekDays = await getUniqueDaysThisWeek(practiceSession.studentId, weekStart);
        newProgress = perfectWeekDays;
        shouldComplete = perfectWeekDays >= quest.target;
        break;

      // Challenge & Difficulty Quests
      case 'rising-star':
        // Count sessions with increasing difficulty (simplified - count sessions for now)
        newProgress += 1;
        shouldComplete = newProgress >= quest.target;
        break;

      case 'challenge-seeker':
        // Count random practice sessions (would need session type tracking)
        // For now, count all sessions
        newProgress += 1;
        shouldComplete = newProgress >= quest.target;
        break;

      case 'topic-explorer':
        // Track unique topics practiced this week
        const topicCount = await getUniqueTopicsThisWeek(practiceSession.studentId, weekStart);
        newProgress = topicCount;
        shouldComplete = topicCount >= quest.target;
        break;

      // Performance & Achievement Quests
      case 'accuracy-champion':
        // Check if weekly average accuracy is 85%+
        const weeklyAccuracy = await getWeeklyAverageAccuracy(practiceSession.studentId, weekStart);
        if (weeklyAccuracy >= 0.85) {
          newProgress = 1;
          shouldComplete = true;
        }
        break;

      case 'speed-demon':
        newProgress += 1; // Each completed session counts
        shouldComplete = newProgress >= quest.target;
        break;

      case 'perfectionist':
        if (practiceSession.score && practiceSession.totalQuestions) {
          const accuracy = (practiceSession.correctAnswers || 0) / practiceSession.totalQuestions;
          if (accuracy >= 0.95) { // 95% or higher
            newProgress += 1;
            shouldComplete = newProgress >= quest.target;
          }
        }
        break;

      // Social & Competitive Quests
      case 'league-climber':
        // Would need league system implementation
        // For now, mark as incomplete
        break;

      case 'comeback-champion':
        // Would need previous week's data comparison
        // For now, mark as incomplete
        break;

      // Learning & Growth Quests
      case 'knowledge-seeker':
        // Check if this topic was never tried before
        const isNewTopic = await isNewTopicForStudent(
          practiceSession.studentId,
          practiceSession.topicId || 0
        );
        if (isNewTopic) {
          newProgress += 1;
          shouldComplete = newProgress >= quest.target;
        }
        break;

      case 'weakness-warrior':
        // Count sessions in lowest-performing subject
        const lowestSubjectId = await getLowestPerformingSubject(practiceSession.studentId);
        if (practiceSession.subjectId === lowestSubjectId) {
          newProgress += 1;
          shouldComplete = newProgress >= quest.target;
        }
        break;

      case 'balanced-learner':
        // Count subjects with 70%+ score this week
        const subjectsWithGoodScore = await getSubjectsWithMinAccuracy(
          practiceSession.studentId, 
          weekStart, 
          0.7
        );
        newProgress = subjectsWithGoodScore;
        shouldComplete = subjectsWithGoodScore >= quest.target;
        break;

      default:
        // For other quest types, just count sessions
        newProgress += 1;
        shouldComplete = newProgress >= quest.target;
        break;
    }

    // Update the quest
    await prisma.$executeRaw`
      UPDATE "WeeklyQuest" 
      SET "progress" = ${Math.min(newProgress, quest.target)}, 
          "isCompleted" = ${shouldComplete}, 
          "completedAt" = ${shouldComplete ? new Date() : null},
          "updatedAt" = ${new Date()}
      WHERE "id" = ${quest.id}
    `;
  }
}

// Helper functions for complex quest calculations
async function getUniqueSubjectsThisWeek(studentId: string, weekStart: Date): Promise<number> {
  const weekEnd = getWeekEnd(weekStart);
  const result = await prisma.$queryRaw`
    SELECT COUNT(DISTINCT "subjectId") as count
    FROM "PracticeSession"
    WHERE "studentId" = ${studentId}
    AND "status" = 'COMPLETED'
    AND "endTime" >= ${weekStart}
    AND "endTime" <= ${weekEnd}
    AND "subjectId" IS NOT NULL
  ` as [{ count: bigint }];
  return Number(result[0]?.count || 0);
}

async function getSubjectSessionsThisWeek(studentId: string, subjectId: number, weekStart: Date): Promise<number> {
  const weekEnd = getWeekEnd(weekStart);
  const result = await prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM "PracticeSession"
    WHERE "studentId" = ${studentId}
    AND "subjectId" = ${subjectId}
    AND "status" = 'COMPLETED'
    AND "endTime" >= ${weekStart}
    AND "endTime" <= ${weekEnd}
  ` as [{ count: bigint }];
  return Number(result[0]?.count || 0);
}

async function getUniqueDaysThisWeek(studentId: string, weekStart: Date): Promise<number> {
  const weekEnd = getWeekEnd(weekStart);
  const result = await prisma.$queryRaw`
    SELECT COUNT(DISTINCT DATE("endTime")) as count
    FROM "PracticeSession"
    WHERE "studentId" = ${studentId}
    AND "status" = 'COMPLETED'
    AND "endTime" >= ${weekStart}
    AND "endTime" <= ${weekEnd}
  ` as [{ count: bigint }];
  return Number(result[0]?.count || 0);
}

async function getDaysWithMinSessions(studentId: string, weekStart: Date, minSessions: number): Promise<number> {
  const weekEnd = getWeekEnd(weekStart);
  const result = await prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM (
      SELECT DATE("endTime") as session_date
      FROM "PracticeSession"
      WHERE "studentId" = ${studentId}
      AND "status" = 'COMPLETED'
      AND "endTime" >= ${weekStart}
      AND "endTime" <= ${weekEnd}
      GROUP BY DATE("endTime")
      HAVING COUNT(*) >= ${minSessions}
    ) as days_with_min_sessions
  ` as [{ count: bigint }];
  return Number(result[0]?.count || 0);
}

async function getUniqueTopicsThisWeek(studentId: string, weekStart: Date): Promise<number> {
  const weekEnd = getWeekEnd(weekStart);
  const result = await prisma.$queryRaw`
    SELECT COUNT(DISTINCT "topicId") as count
    FROM "PracticeSession"
    WHERE "studentId" = ${studentId}
    AND "status" = 'COMPLETED'
    AND "endTime" >= ${weekStart}
    AND "endTime" <= ${weekEnd}
    AND "topicId" IS NOT NULL
  ` as [{ count: bigint }];
  return Number(result[0]?.count || 0);
}

async function getWeeklyAverageAccuracy(studentId: string, weekStart: Date): Promise<number> {
  const weekEnd = getWeekEnd(weekStart);
  const result = await prisma.$queryRaw`
    SELECT AVG("score") as average
    FROM "PracticeSession"
    WHERE "studentId" = ${studentId}
    AND "status" = 'COMPLETED'
    AND "endTime" >= ${weekStart}
    AND "endTime" <= ${weekEnd}
  ` as [{ average: bigint }];
  return Number(result[0]?.average || 0);
}

async function getLowestPerformingSubject(studentId: string): Promise<number> {
  const result = await prisma.$queryRaw`
    SELECT "subjectId"
    FROM "PracticeSession"
    WHERE "studentId" = ${studentId}
    AND "status" = 'COMPLETED'
    GROUP BY "subjectId"
    ORDER BY AVG("score") ASC
    LIMIT 1
  ` as [{ subjectId: bigint }];
  return Number(result[0]?.subjectId || 0);
}

async function getSubjectsWithMinAccuracy(studentId: string, weekStart: Date, minAccuracy: number): Promise<number> {
  const weekEnd = getWeekEnd(weekStart);
  const result = await prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM "PracticeSession"
    WHERE "studentId" = ${studentId}
    AND "status" = 'COMPLETED'
    AND "endTime" >= ${weekStart}
    AND "endTime" <= ${weekEnd}
    AND "score" >= ${minAccuracy}
  ` as [{ count: bigint }];
  return Number(result[0]?.count || 0);
}

async function isNewSubjectThisWeek(studentId: string, subjectId: number, weekStart: Date): Promise<boolean> {
  const weekEnd = getWeekEnd(weekStart);
  const result = await prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM "PracticeSession"
    WHERE "studentId" = ${studentId}
    AND "status" = 'COMPLETED'
    AND "endTime" >= ${weekStart}
    AND "endTime" <= ${weekEnd}
    AND "subjectId" = ${subjectId}
  ` as [{ count: bigint }];
  return Number(result[0]?.count || 0) === 0;
}

async function isNewTopicForStudent(studentId: string, topicId: number): Promise<boolean> {
  const result = await prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM "PracticeSession"
    WHERE "studentId" = ${studentId}
    AND "status" = 'COMPLETED'
    AND "topicId" = ${topicId}
  ` as [{ count: bigint }];
  return Number(result[0]?.count || 0) === 0;
}

// Refresh incomplete quests (generate new ones to replace incomplete ones)
export async function refreshIncompleteQuests(studentId: string): Promise<WeeklyQuest[]> {
  const weekStart = getWeekStart();
  
  // Get current week's quests using ORM
  const currentQuests = await prisma.weeklyQuest.findMany({
    where: {
      studentId,
      weekStart: {
        gte: weekStart,
        lt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
      }
    }
  });

  const incompleteQuests = currentQuests.filter(q => !q.isCompleted);
  const completedCount = currentQuests.length - incompleteQuests.length;

  // If all quests are completed, generate new ones anyway (refresh behavior)
  if (completedCount >= 5 && incompleteQuests.length === 0) {
    // Delete all current quests and generate fresh ones
    await prisma.weeklyQuest.deleteMany({
      where: {
        studentId,
        weekStart: {
          gte: weekStart,
          lt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
        }
      }
    });
    return await generateWeeklyQuests(studentId);
  }

  // Delete incomplete quests and generate new ones
  if (incompleteQuests.length > 0) {
    const incompleteIds = incompleteQuests.map(q => q.id);
    await prisma.weeklyQuest.deleteMany({
      where: {
        id: {
          in: incompleteIds
        }
      }
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
  await prisma.$executeRaw`
    DELETE FROM "WeeklyQuest" 
    WHERE "weekStart" < ${lastWeekStart}
  `;
}

// Helper function to generate UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Update quest progress for mistakes review (called when mistakes are reviewed)
export async function updateMistakeReviewProgress(studentId: string, mistakesReviewed: number) {
  const weekStart = getWeekStart();
  
  // Get active review-mistakes quests for this week
  const activeQuests = await prisma.$queryRaw`
    SELECT * FROM "WeeklyQuest" 
    WHERE "studentId" = ${studentId} 
    AND "weekStart" >= ${weekStart}
    AND "weekStart" < ${new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)}
    AND "questType" = 'review-mistakes'
    AND "isCompleted" = false
  ` as WeeklyQuest[];

  for (const quest of activeQuests) {
    const newProgress = Math.min(quest.progress + mistakesReviewed, quest.target);
    const shouldComplete = newProgress >= quest.target;

    await prisma.$executeRaw`
      UPDATE "WeeklyQuest" 
      SET "progress" = ${newProgress}, 
          "isCompleted" = ${shouldComplete}, 
          "completedAt" = ${shouldComplete ? new Date() : null},
          "updatedAt" = ${new Date()}
      WHERE "id" = ${quest.id}
    `;
  }
}

// Weekly Quest Scheduler - handles automatic quest rotation
export async function manageWeeklyQuestRotation() {
  console.log('🔄 Starting weekly quest rotation management...');
  
  try {
    const now = new Date();
    const currentWeekStart = getWeekStart(now);
    const lastWeekStart = new Date(currentWeekStart);
    lastWeekStart.setDate(currentWeekStart.getDate() - 7);

    // Get all students who have old quests that need rotation
    const studentsWithOldQuests = await prisma.weeklyQuest.findMany({
      where: {
        weekStart: {
          lt: currentWeekStart
        }
      },
      select: {
        studentId: true
      },
      distinct: ['studentId']
    });

    console.log(`📚 Found ${studentsWithOldQuests.length} students with old quests`);

    // Clean up quests older than 2 weeks
    const twoWeeksAgo = new Date(currentWeekStart);
    twoWeeksAgo.setDate(currentWeekStart.getDate() - 14);
    
    const deletedOldQuests = await prisma.weeklyQuest.deleteMany({
      where: {
        weekStart: {
          lt: twoWeeksAgo
        }
      }
    });

    console.log(`🗑️ Cleaned up ${deletedOldQuests.count} old quests (older than 2 weeks)`);

    // Generate new quests for students who don't have current week quests
    const studentsNeedingNewQuests = await prisma.student.findMany({
      where: {
        weeklyQuests: {
          none: {
            weekStart: {
              gte: currentWeekStart,
              lt: new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
            }
          }
        }
      },
      select: {
        id: true,
        username: true,
        level: true
      },
      take: 100 // Limit to prevent overwhelming the system
    });

    console.log(`🎯 Generating quests for ${studentsNeedingNewQuests.length} students`);

    let questsGenerated = 0;
    for (const student of studentsNeedingNewQuests) {
      try {
        await generateWeeklyQuests(student.id, student.level || 1);
        questsGenerated += 5; // Assuming 5 quests per student
      } catch (error) {
        console.error(`❌ Failed to generate quests for student ${student.username}:`, error);
      }
    }

    console.log(`✅ Weekly quest rotation completed! Generated ${questsGenerated} new quests.`);
    
    return {
      studentsProcessed: studentsNeedingNewQuests.length,
      questsGenerated,
      oldQuestsDeleted: deletedOldQuests.count
    };

  } catch (error) {
    console.error('❌ Error in weekly quest rotation:', error);
    throw error;
  }
}

// Function to check if it's a new week and trigger quest rotation
export async function checkAndRotateWeeklyQuests() {
  const now = new Date();
  const currentWeekStart = getWeekStart(now);
  
  // Check if we're at the beginning of a new week (Monday)
  const isNewWeek = now.getDay() === 1 && now.getHours() === 0; // Monday at midnight
  
  if (isNewWeek) {
    console.log('🗓️ New week detected! Triggering quest rotation...');
    return await manageWeeklyQuestRotation();
  }
  
  return null;
}

// Auto-generate quests for new students
export async function ensureStudentHasQuests(studentId: string): Promise<WeeklyQuest[]> {
  const weekStart = getWeekStart();
  
  const existingQuests = await prisma.weeklyQuest.findMany({
    where: {
      studentId,
      weekStart: {
        gte: weekStart,
        lt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
      }
    }
  });

  if (existingQuests.length === 0) {
    console.log(`🆕 New student detected: ${studentId}. Generating initial quests...`);
    return await generateWeeklyQuests(studentId);
  }

  return existingQuests.map(quest => ({
    id: quest.id,
    studentId: quest.studentId,
    questType: quest.questType,
    title: quest.title,
    description: quest.description,
    target: quest.target,
    progress: quest.progress,
    isCompleted: quest.isCompleted,
    completedAt: quest.completedAt || undefined,
    weekStart: quest.weekStart,
    weekEnd: quest.weekEnd,
    icon: quest.icon,
    color: quest.color,
    category: quest.category,
    createdAt: quest.createdAt,
    updatedAt: quest.updatedAt
  }));
} 