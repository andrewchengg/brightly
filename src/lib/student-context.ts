import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

interface WeakTopic {
  topic: string;
  subject: string;
  incorrectCount: number;
  totalCount: number;
  accuracy: number;
}

interface RecentMistake {
  questionText: string;
  topic: string;
  subject: string;
  userAnswer: string;
  correctAnswer: string;
}

interface StudentContext {
  studentLevel: number;
  xpPoints: number;
  currentStreak: number;
  longestStreak: number;
  weeklyPerformance: {
    questionsAnswered: number;
    accuracy: number;
    timeSpentMinutes: number;
  };
  weakTopics: WeakTopic[];
  recentMistakes: RecentMistake[];
  strongSubjects: string[];
  weakSubjects: string[];
}

/**
 * Gather condensed student context for AI personalization
 * Keeps context under ~500 tokens to manage API costs
 */
export async function getStudentContext(
  userId: string
): Promise<StudentContext | null> {
  try {
    console.log(`🔍 StudentContext: Fetching data for student ${userId}`);

    // Get basic student info
    const student = await prisma.student.findUnique({
      where: { id: userId },
      select: {
        level: true,
        xpPoints: true,
        currentStreak: true,
        longestStreak: true,
      },
    });

    if (!student) {
      console.error("❌ StudentContext: Student not found");
      return null;
    }

    console.log(`✅ StudentContext: Found student data:`, student);

    // Get recent practice sessions (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    console.log(
      `📅 StudentContext: Looking for sessions from ${weekAgo.toISOString()} onwards`
    );

    const recentSessions = await prisma.practiceSession.findMany({
      where: {
        studentId: userId,
        status: "COMPLETED",
        endTime: {
          gte: weekAgo,
        },
      },
      include: {
        subject: {
          select: { name: true },
        },
        studentAnswers: {
          include: {
            question: {
              include: {
                topic: {
                  include: {
                    subject: {
                      select: { name: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        endTime: "desc",
      },
      take: 20, // Last 20 sessions to keep data manageable
    });

    console.log(
      `📊 StudentContext: Found ${
        recentSessions?.length || 0
      } practice sessions`
    );
    console.log(`📋 StudentContext: Sessions data:`, recentSessions);

    // Calculate weekly performance
    const weeklyStats = recentSessions?.reduce(
      (acc, session) => {
        acc.questionsAnswered += session.totalQuestions || 0;
        acc.correctAnswers += session.correctAnswers || 0;
        acc.timeSpentMinutes += Math.round((session.durationSeconds || 0) / 60);
        return acc;
      },
      { questionsAnswered: 0, correctAnswers: 0, timeSpentMinutes: 0 }
    ) || { questionsAnswered: 0, correctAnswers: 0, timeSpentMinutes: 0 };

    const weeklyAccuracy =
      weeklyStats.questionsAnswered > 0
        ? Math.round(
            (weeklyStats.correctAnswers / weeklyStats.questionsAnswered) * 100
          )
        : 0;

    // Analyze answers to find weak topics
    const topicStats = new Map<
      string,
      { correct: number; total: number; subject: string }
    >();
    const recentMistakes: RecentMistake[] = [];

    console.log(`🔬 StudentContext: Analyzing student answers...`);

    recentSessions?.forEach((session, sessionIndex) => {
      console.log(
        `  📝 Session ${sessionIndex + 1}: ${
          session.studentAnswers?.length || 0
        } answers`
      );

      session.studentAnswers?.forEach((answer, answerIndex) => {
        try {
          const question = answer.question;

          if (!question || !question.topic || !question.topic.subject) {
            console.log(
              `    ⚠️ Answer ${
                answerIndex + 1
              }: Missing question/topic/subject data`
            );
            return;
          }

          const topicKey = `${question.topic.subject.name}:${question.topic.name}`;
          console.log(
            `    📍 Answer ${answerIndex + 1}: ${topicKey}, correct: ${
              answer.isCorrect
            }`
          );

          if (!topicStats.has(topicKey)) {
            topicStats.set(topicKey, {
              correct: 0,
              total: 0,
              subject: question.topic.subject.name,
            });
          }

          const stats = topicStats.get(topicKey)!;
          stats.total += 1;

          if (answer.isCorrect) {
            stats.correct += 1;
          } else {
            // Add to recent mistakes (limit to 5 most recent)
            if (recentMistakes.length < 5) {
              recentMistakes.push({
                questionText:
                  question.text.length > 100
                    ? question.text.substring(0, 100) + "..."
                    : question.text,
                topic: question.topic.name,
                subject: question.topic.subject.name,
                userAnswer: String(answer.submittedAnswer || "No answer"),
                correctAnswer: String(question.correctAnswer),
              });
              console.log(`    ❌ Added mistake: ${question.topic.name}`);
            }
          }
        } catch (error) {
          console.log(
            `    ⚠️ Error processing answer ${answerIndex + 1}:`,
            error
          );
        }
      });
    });

    console.log(
      `📈 StudentContext: Topic stats collected:`,
      Array.from(topicStats.entries())
    );
    console.log(`❌ StudentContext: Recent mistakes:`, recentMistakes);

    // Find weak topics (accuracy < 70% and at least 3 questions)
    console.log(
      `🎯 StudentContext: Filtering for weak topics (accuracy < 70%, min 3 questions)...`
    );

    const allTopics = Array.from(topicStats.entries()).map(
      ([topicKey, stats]) => {
        const [subject, topic] = topicKey.split(":");
        const accuracy = Math.round((stats.correct / stats.total) * 100);
        console.log(
          `  📊 ${topicKey}: ${stats.correct}/${stats.total} (${accuracy}%)`
        );
        return {
          topicKey,
          topic,
          subject,
          incorrectCount: stats.total - stats.correct,
          totalCount: stats.total,
          accuracy,
          meetsMinQuestions: stats.total >= 3,
          isBelowThreshold: accuracy < 70,
        };
      }
    );

    const weakTopics: WeakTopic[] = allTopics
      .filter((item) => item.meetsMinQuestions && item.isBelowThreshold)
      .map((item) => ({
        topic: item.topic,
        subject: item.subject,
        incorrectCount: item.incorrectCount,
        totalCount: item.totalCount,
        accuracy: item.accuracy,
      }))
      .sort((a, b) => a.accuracy - b.accuracy) // Sort by worst accuracy first
      .slice(0, 5); // Top 5 weak topics

    console.log(
      `🔍 StudentContext: Found ${weakTopics.length} weak topics:`,
      weakTopics
    );

    // Find subject-level performance
    console.log(`📚 StudentContext: Calculating subject-level performance...`);

    const subjectStats = new Map<string, { correct: number; total: number }>();
    topicStats.forEach((stats, topicKey) => {
      const subject = stats.subject;
      if (!subjectStats.has(subject)) {
        subjectStats.set(subject, { correct: 0, total: 0 });
      }
      const subjectStat = subjectStats.get(subject)!;
      subjectStat.correct += stats.correct;
      subjectStat.total += stats.total;
    });

    console.log(
      `📊 StudentContext: Subject stats:`,
      Array.from(subjectStats.entries())
    );

    const strongSubjects = Array.from(subjectStats.entries())
      .filter(
        ([_, stats]) => stats.total >= 5 && stats.correct / stats.total >= 0.85
      )
      .map(([subject, _]) => subject);

    const weakSubjects = Array.from(subjectStats.entries())
      .filter(
        ([_, stats]) => stats.total >= 5 && stats.correct / stats.total < 0.7
      )
      .map(([subject, _]) => subject);

    console.log(
      `✅ StudentContext: Strong subjects (≥85%, min 5 questions):`,
      strongSubjects
    );
    console.log(
      `❌ StudentContext: Weak subjects (<70%, min 5 questions):`,
      weakSubjects
    );

    const result = {
      studentLevel: student.level,
      xpPoints: student.xpPoints,
      currentStreak: student.currentStreak,
      longestStreak: student.longestStreak,
      weeklyPerformance: {
        questionsAnswered: weeklyStats.questionsAnswered,
        accuracy: weeklyAccuracy,
        timeSpentMinutes: weeklyStats.timeSpentMinutes,
      },
      weakTopics,
      recentMistakes,
      strongSubjects,
      weakSubjects,
    };

    console.log(`🎉 StudentContext: Final result for student ${userId}:`, {
      weeklyQuestions: result.weeklyPerformance.questionsAnswered,
      weakTopicsCount: result.weakTopics.length,
      recentMistakesCount: result.recentMistakes.length,
      strongSubjectsCount: result.strongSubjects.length,
      weakSubjectsCount: result.weakSubjects.length,
    });

    return result;
  } catch (error) {
    console.error("Error gathering student context:", error);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Format student context into a condensed prompt for AI
 * Optimized to stay under 500 tokens
 */
export function formatStudentContextForAI(context: StudentContext): string {
  const contextParts = [
    `STUDENT PROFILE: Level ${context.studentLevel}, ${context.xpPoints} XP, ${context.currentStreak}-day streak`,

    context.weeklyPerformance.questionsAnswered > 0
      ? `RECENT PERFORMANCE: ${context.weeklyPerformance.questionsAnswered}q this week, ${context.weeklyPerformance.accuracy}% accuracy`
      : "RECENT PERFORMANCE: Limited practice data",

    context.strongSubjects.length > 0
      ? `STRONG IN: ${context.strongSubjects.slice(0, 3).join(", ")}`
      : null,

    context.weakSubjects.length > 0
      ? `NEEDS HELP WITH: ${context.weakSubjects.slice(0, 3).join(", ")}`
      : null,

    context.weakTopics.length > 0
      ? `WEAK TOPICS: ${context.weakTopics
          .slice(0, 3)
          .map((t) => `${t.topic} (${t.accuracy}%)`)
          .join(", ")}`
      : null,

    context.recentMistakes.length > 0
      ? `RECENT MISTAKES: Common errors in ${context.recentMistakes
          .slice(0, 2)
          .map((m) => m.topic)
          .join(", ")}`
      : null,
  ].filter(Boolean);

  return contextParts.join(" | ");
}

/**
 * Check if student context should be included based on message content
 * Only include context for educational questions to save tokens
 */
export function shouldIncludeContext(message: string): boolean {
  const educationalKeywords = [
    "help",
    "explain",
    "understand",
    "solve",
    "question",
    "problem",
    "homework",
    "practice",
    "learn",
    "study",
    "why",
    "how",
    "what",
  ];

  const lowerMessage = message.toLowerCase();
  return educationalKeywords.some((keyword) => lowerMessage.includes(keyword));
}
