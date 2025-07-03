// src/app/api/student/practice-sessions/[sessionId]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import {
  PrismaClient,
  QuestionType as PrismaQuestionType,
} from "@/generated/prisma";

const prisma = new PrismaClient();

interface OptionClient {
  id: string;
  text: string;
}

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
        return { id: String.fromCharCode(65 + index), text: String(opt) };
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
      "Error formatting options for client in session details:",
      error,
      "Original options:",
      options
    );
    return [];
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
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
    const { sessionId } = params;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    const practiceSession = await prisma.practiceSession.findUnique({
      where: { id: sessionId },
      include: {
        student: { select: { id: true, name: true } },
        subject: { select: { name: true } },
        topic: { select: { name: true } },
        basedOnQuestionGroup: { select: { name: true } },
        studentAnswers: {
          include: {
            question: {
              include: {
                topic: { select: { name: true } },
              },
            },
          },
          orderBy: {
            // It's often better to rely on an explicit question order if available,
            // or ensure questions are returned in a way the client can sort them (e.g., by ID if that's the intended order).
            // AttemptedAt might not always match the display order of questions.
            // For now, keeping attemptedAt, but consider implications.
            attemptedAt: "asc",
          },
        },
      },
    });

    if (!practiceSession) {
      return NextResponse.json(
        { error: "Practice session not found" },
        { status: 404 }
      );
    }

    if (practiceSession.studentId !== studentId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.log(
      `API GET /student/practice-sessions: Fetched session ${sessionId}. TotalQuestions from DB: ${practiceSession.totalQuestions}, CorrectAnswers: ${practiceSession.correctAnswers}`
    );

    const formattedStudentAnswers = practiceSession.studentAnswers.map((sa) => {
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
        ...sa,
        submittedAnswer: clientSubmittedAnswer,
        question: {
          ...sa.question,
          options: formatOptionsForClient(sa.question.options),
          correctAnswer: clientCorrectAnswer,
          topicName: sa.question.topic?.name || "Unknown Topic",
          // marks is a scalar field on Question, so it will be included by default with ...sa.question
        },
      };
    });

    return NextResponse.json({
      ...practiceSession, // This will include totalQuestions, correctAnswers, score directly from the DB
      studentAnswers: formattedStudentAnswers,
      subjectName: practiceSession.subject?.name,
      topicName: practiceSession.topic?.name,
      questionGroupName: practiceSession.basedOnQuestionGroup?.name,
      score: practiceSession.totalMarksEarned, // Use totalMarksEarned as score
      totalPossibleMarks: practiceSession.totalPossibleMarks, // Include total possible marks
    });
  } catch (error: any) {
    console.error("API: Error fetching practice session details:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch practice session details",
        details: error.message,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
