import { createClient } from "@/lib/supabase/server";

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
  const supabase = createClient();

  try {
    // Get basic student info
    const { data: student, error: studentError } = await supabase
      .from("Student")
      .select("level, xpPoints, currentStreak, longestStreak")
      .eq("id", userId)
      .single();

    if (studentError || !student) {
      console.error("Failed to fetch student data:", studentError);
      return null;
    }

    // Get recent practice sessions (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data: recentSessions, error: sessionsError } = await supabase
      .from("PracticeSession")
      .select(
        `
        id,
        totalQuestions,
        correctAnswers,
        durationSeconds,
        status,
        subject:Subject(name),
        studentAnswers:StudentAnswer(
          isCorrect,
          submittedAnswer,
          question:Question(
            text,
            correctAnswer,
            topic:Topic(
              name,
              subject:Subject(name)
            )
          )
        )
      `
      )
      .eq("studentId", userId)
      .eq("status", "COMPLETED")
      .gte("endTime", weekAgo.toISOString())
      .order("endTime", { ascending: false })
      .limit(20); // Last 20 sessions to keep data manageable

    if (sessionsError) {
      console.error("Failed to fetch recent sessions:", sessionsError);
      return null;
    }

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

    // Analyze wrong answers to find weak topics
    const topicStats = new Map<
      string,
      { correct: number; total: number; subject: string }
    >();
    const recentMistakes: RecentMistake[] = [];

    recentSessions?.forEach((session) => {
      session.studentAnswers?.forEach((answer) => {
        const topicKey = `${answer.question.topic.subject.name}:${answer.question.topic.name}`;

        if (!topicStats.has(topicKey)) {
          topicStats.set(topicKey, {
            correct: 0,
            total: 0,
            subject: answer.question.topic.subject.name,
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
                answer.question.text.length > 100
                  ? answer.question.text.substring(0, 100) + "..."
                  : answer.question.text,
              topic: answer.question.topic.name,
              subject: answer.question.topic.subject.name,
              userAnswer: String(answer.submittedAnswer || "No answer"),
              correctAnswer: String(answer.question.correctAnswer),
            });
          }
        }
      });
    });

    // Find weak topics (accuracy < 70% and at least 3 questions)
    const weakTopics: WeakTopic[] = Array.from(topicStats.entries())
      .filter(
        ([_, stats]) => stats.total >= 3 && stats.correct / stats.total < 0.7
      )
      .map(([topicKey, stats]) => {
        const [subject, topic] = topicKey.split(":");
        return {
          topic,
          subject,
          incorrectCount: stats.total - stats.correct,
          totalCount: stats.total,
          accuracy: Math.round((stats.correct / stats.total) * 100),
        };
      })
      .sort((a, b) => a.accuracy - b.accuracy) // Sort by worst accuracy first
      .slice(0, 5); // Top 5 weak topics

    // Find subject-level performance
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

    return {
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
  } catch (error) {
    console.error("Error gathering student context:", error);
    return null;
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
