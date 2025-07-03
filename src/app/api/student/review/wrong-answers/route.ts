// src/app/api/student/review/wrong-answers/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import {
  PrismaClient,
  QuestionType as PrismaQuestionType,
  PracticeSessionType as PrismaPracticeSessionType,
} from "@/generated/prisma";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

interface OptionClient {
  id: string;
  text: string;
}

// Helper function to format options (can be shared or defined locally)
function formatOptionsForClient(options: any): OptionClient[] {
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
      "Error formatting options for client in wrong answers review:",
      error,
      "Original options:",
      options
    );
    return [];
  }
}

export async function GET(request: NextRequest) {
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

    const wrongAnswers = await prisma.studentAnswer.findMany({
      where: {
        practiceSession: {
          studentId: studentId,
        },
        isCorrect: false,
      },
      include: {
        question: {
          include: {
            topic: { select: { id: true, name: true } },
            subject: { select: { id: true, name: true } },
            questionGroup: { select: { id: true, name: true } },
          },
        },
        practiceSession: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
      },
      orderBy: {
        attemptedAt: "desc", // Show most recent wrong answers first
      },
    });

    const formattedResults = wrongAnswers.map((sa) => {
      let clientCorrectAnswer = sa.question.correctAnswer;
      if (typeof sa.question.correctAnswer === "string") {
        try {
          const parsed = JSON.parse(sa.question.correctAnswer);
          if (typeof parsed === "object" || Array.isArray(parsed)) {
            clientCorrectAnswer = parsed;
          }
        } catch (e) {
          /* Keep as string if not parsable JSON */
        }
      }

      let clientSubmittedAnswer = sa.submittedAnswer;
      if (typeof sa.submittedAnswer === "string") {
        try {
          const parsed = JSON.parse(sa.submittedAnswer);
          if (typeof parsed === "object" || Array.isArray(parsed)) {
            clientSubmittedAnswer = parsed;
          }
        } catch (e) {
          /* Keep as string if not parsable JSON */
        }
      }

      return {
        studentAnswerId: sa.id,
        submittedAnswer: clientSubmittedAnswer,
        attemptedAt: sa.attemptedAt,
        isCorrect: sa.isCorrect, // will be false
        pointsEarned: sa.pointsEarned,
        question: {
          id: sa.question.id,
          text: sa.question.text,
          questionType: sa.question.questionType,
          options: formatOptionsForClient(sa.question.options),
          correctAnswer: clientCorrectAnswer,
          explanation: sa.question.explanation,
          hint: sa.question.hint,
          imageUrl: sa.question.imageUrl,
          difficulty: sa.question.difficulty,
          topic: sa.question.topic,
          subject: sa.question.subject,
          questionGroup: sa.question.questionGroup,
        },
        practiceSession: sa.practiceSession,
      };
    });

    return NextResponse.json(formattedResults);
  } catch (error: any) {
    console.error("API: Error fetching wrong answers:", error);
    return NextResponse.json(
      { error: "Failed to fetch wrong answers", details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
