// src/app/api/student/weekly-challenge/start/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  PrismaClient,
  PracticeSessionType,
  PracticeSessionStatus,
  DifficultyLevel,
  QuestionType as PrismaQuestionType,
} from "@/generated/prisma";
import { getCurrentChallengeWeekStartDate } from "@/lib/dateUtils";
import { createHash } from "crypto"; // For seeded shuffle
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();
const CHALLENGE_QUESTION_COUNT = 5;
const CHALLENGE_DURATION_MINUTES = 20;

interface OptionClient {
  id: string;
  text: string;
}

function formatOptionsForClient(options: any): OptionClient[] {
  // ... (keep existing formatOptionsForClient function as is)
  if (!options) return [];
  try {
    let parsedOptions = options;
    if (typeof options === "string") {
      if (
        (options.startsWith("{") && options.endsWith("}")) ||
        (options.startsWith("[") && options.endsWith("]"))
      ) {
        parsedOptions = JSON.parse(options);
      } else {
        return [];
      }
    }
    if (Array.isArray(parsedOptions)) {
      return parsedOptions.map((opt, index) => {
        if (typeof opt === "object" && opt !== null && opt.id && opt.text) {
          return { id: String(opt.id), text: String(opt.text) };
        }
        return { id: String.fromCharCode(97 + index), text: String(opt) };
      });
    }
    if (typeof parsedOptions === "object" && parsedOptions !== null) {
      return Object.entries(parsedOptions).map(([key, value]) => ({
        id: key,
        text: String(value),
      }));
    }
    return [];
  } catch (error) {
    console.error(
      "Error formatting options for client in weekly challenge:",
      error,
      "Original options:",
      options
    );
    return [];
  }
}

// Seeded shuffle function
function seededShuffle<T>(array: T[], seed: string): T[] {
  let currentIndex = array.length,
    randomIndex;
  const result = [...array];

  // Simple hash function for seed to number (not cryptographically secure, but fine for shuffling)
  let numSeed = 0;
  for (let i = 0; i < seed.length; i++) {
    numSeed = (numSeed << 5) - numSeed + seed.charCodeAt(i);
    numSeed |= 0; // Convert to 32bit integer
  }

  let pseudoRandom = () => {
    let x = Math.sin(numSeed++) * 10000;
    return x - Math.floor(x);
  };

  while (currentIndex !== 0) {
    randomIndex = Math.floor(pseudoRandom() * currentIndex);
    currentIndex--;
    [result[currentIndex], result[randomIndex]] = [
      result[randomIndex],
      result[currentIndex],
    ];
  }
  return result;
}

async function getWeeklyChallengeQuestions(
  challengeWeekId: Date
): Promise<any[]> {
  // In a production scenario, you might cache these questions for the week
  // For now, we'll fetch and shuffle based on the week's start date as a seed
  const allHardQuestions = await prisma.question.findMany({
    where: {
      difficulty: { in: [DifficultyLevel.HARD, DifficultyLevel.VERY_HARD] },
    },
    include: { topic: { select: { name: true, id: true, subjectId: true } } },
  });

  if (allHardQuestions.length < CHALLENGE_QUESTION_COUNT) {
    throw new Error("Not enough hard questions available for the challenge.");
  }

  const weekSeed = challengeWeekId.toISOString(); // Use ISO string of week start as seed
  const shuffledQuestions = seededShuffle(allHardQuestions, weekSeed);

  return shuffledQuestions.slice(0, CHALLENGE_QUESTION_COUNT).map((q) => {
    let clientCorrectAnswer = q.correctAnswer;
    if (typeof q.correctAnswer === "string") {
      try {
        const parsed = JSON.parse(q.correctAnswer);
        if (typeof parsed === "object" || Array.isArray(parsed))
          clientCorrectAnswer = parsed;
      } catch (e) {
        /* ignore */
      }
    }
    return {
      ...q,
      options: formatOptionsForClient(q.options),
      correctAnswer: clientCorrectAnswer,
      topic: q.topic
        ? { ...q.topic }
        : { id: 0, name: "Unknown Topic", subjectId: 0 },
    };
  });
}

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
    const studentId = user.id;
    const challengeWeekId = getCurrentChallengeWeekStartDate();

    const { action, sessionId: sessionIdToResume } = await request
      .json()
      .catch(() => ({ action: "GET_STATUS", sessionId: null }));

    if (action === "GET_STATUS") {
      const allAttemptsThisWeek = await prisma.practiceSession.findMany({
        where: {
          studentId,
          type: PracticeSessionType.WEEKLY_CHALLENGE,
          challengeWeekIdentifier: challengeWeekId,
        },
        orderBy: { startTime: "desc" },
        select: {
          id: true,
          status: true,
          score: true,
          totalQuestions: true,
          startTime: true,
          endTime: true,
          examDurationMinutes: true,
        },
      });
      const resumableSession = allAttemptsThisWeek.find(
        (s) =>
          s.status === PracticeSessionStatus.IN_PROGRESS ||
          s.status === PracticeSessionStatus.NOT_STARTED
      );
      return NextResponse.json(
        {
          attempts: allAttemptsThisWeek,
          resumableSessionId: resumableSession?.id || null,
          challengeWeekId: challengeWeekId.toISOString(), // Send current challenge week ID
        },
        { status: 200 }
      );
    }

    if (action === "START_NEW_ATTEMPT") {
      const challengeQuestions = await getWeeklyChallengeQuestions(
        challengeWeekId
      );

      const newSession = await prisma.practiceSession.create({
        data: {
          studentId,
          title: `Weekly Challenge - ${challengeWeekId.toLocaleDateString()}`,
          type: PracticeSessionType.WEEKLY_CHALLENGE,
          status: PracticeSessionStatus.IN_PROGRESS,
          totalQuestions: CHALLENGE_QUESTION_COUNT,
          challengeWeekIdentifier: challengeWeekId,
          startTime: new Date(),
          examDurationMinutes: CHALLENGE_DURATION_MINUTES,
        },
      });
      // Create StudentAnswer shells linked to the questions for this session
      await prisma.studentAnswer.createMany({
        data: challengeQuestions.map((q) => ({
          practiceSessionId: newSession.id,
          questionId: q.id,
          // submittedAnswer, isCorrect, pointsEarned will be updated by client
        })),
      });

      return NextResponse.json(
        {
          practiceSessionId: newSession.id,
          questions: challengeQuestions, // These are the global questions for the week
          status: "CREATED",
          sessionDetails: {
            // Send basic session details
            id: newSession.id,
            startTime: newSession.startTime.toISOString(),
            examDurationMinutes: newSession.examDurationMinutes,
            challengeWeekIdentifier:
              newSession.challengeWeekIdentifier?.toISOString(),
          },
        },
        { status: 201 }
      );
    }

    if (action === "RESUME_SESSION" && sessionIdToResume) {
      const fullSession = await prisma.practiceSession.findUnique({
        where: { id: sessionIdToResume, studentId: studentId }, // Ensure it's the user's session
        include: {
          studentAnswers: {
            include: {
              question: {
                include: {
                  topic: { select: { name: true, id: true, subjectId: true } },
                },
              },
            },
            orderBy: { questionId: "asc" }, // Consistent order, or by a predefined question order
          },
        },
      });

      if (
        !fullSession ||
        fullSession.challengeWeekIdentifier?.getTime() !==
          challengeWeekId.getTime() ||
        fullSession.status === PracticeSessionStatus.COMPLETED
      ) {
        return NextResponse.json(
          {
            error:
              "Resumable session not found or already completed for this week.",
          },
          { status: 404 }
        );
      }

      // Questions for a resumed session are those already linked via StudentAnswer
      const questionsForClient = fullSession.studentAnswers.map((sa) => {
        let clientCorrectAnswer = sa.question.correctAnswer;
        if (typeof sa.question.correctAnswer === "string") {
          try {
            const parsed = JSON.parse(sa.question.correctAnswer);
            if (typeof parsed === "object" || Array.isArray(parsed))
              clientCorrectAnswer = parsed;
          } catch (e) {
            /* ignore */
          }
        }
        return {
          ...sa.question,
          options: formatOptionsForClient(sa.question.options),
          correctAnswer: clientCorrectAnswer,
          topic: sa.question.topic
            ? { ...sa.question.topic }
            : { id: 0, name: "Unknown Topic", subjectId: 0 },
        };
      });

      return NextResponse.json(
        {
          practiceSessionId: fullSession.id,
          questions: questionsForClient,
          status: "RESUMED",
          sessionDetails: fullSession,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("API: Error in weekly challenge API:", error);
    return NextResponse.json(
      {
        error: "Failed to process weekly challenge request",
        details: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
