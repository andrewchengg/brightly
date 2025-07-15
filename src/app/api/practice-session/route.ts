// src/app/api/practice-session/route.ts
import { NextResponse } from "next/server";
import {
  PrismaClient,
  PracticeSessionType,
  PracticeSessionStatus,
} from "@/generated/prisma";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

// Helper function to ensure options are in the correct format for the client
function formatOptionsForClient(options: any): any[] {
  if (!options) return [];

  try {
    let parsedOptions = options;
    if (typeof options === "string") {
      // Try to parse if it's a JSON string that represents an array or object
      if (
        (options.startsWith("{") && options.endsWith("}")) ||
        (options.startsWith("[") && options.endsWith("]"))
      ) {
        parsedOptions = JSON.parse(options);
      } else {
        // If it's a simple string not intended to be JSON, and we expect options,
        // this might indicate a data issue or it's not an MCQ with structured options.
        // For now, we'll assume if it's a non-JSON string, it's not structured options.
        console.warn(
          "formatOptionsForClient received a non-JSON string for options, returning empty:",
          options
        );
        return [];
      }
    }

    if (Array.isArray(parsedOptions)) {
      // Assumes elements are either strings or objects like {id: "A", text: "Option A"}
      return parsedOptions.map((opt, index) => {
        if (typeof opt === "object" && opt !== null && opt.id && opt.text) {
          return { id: String(opt.id), text: String(opt.text) };
        }
        // If just an array of strings, assign simple IDs
        return { id: String.fromCharCode(97 + index), text: String(opt) };
      });
    }

    if (typeof parsedOptions === "object" && parsedOptions !== null) {
      // Converts { "1": "Text1", "A": "TextA" } to [{id: "1", text: "Text1"}, {id: "A", text: "TextA"}]
      return Object.entries(parsedOptions).map(([key, value]) => ({
        id: key,
        text: String(value),
      }));
    }

    console.warn(
      "Unknown options format received by formatOptionsForClient:",
      options
    );
    return [];
  } catch (error) {
    console.error(
      "Error formatting options for client:",
      error,
      "Original options:",
      options
    );
    return []; // Return empty array on error
  }
}

interface PracticeSessionCreateRequest {
  studentId: string;
  title: string;
  type: keyof typeof PracticeSessionType;
  status: keyof typeof PracticeSessionStatus;
  examDurationMinutes?: number;
  subjectId?: number;
  topicId?: number;
  basedOnQuestionGroupId?: number;
  totalQuestions: number;
  questions: { id: number }[];
}

export async function POST(request: Request) {
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

    const body = (await request.json()) as PracticeSessionCreateRequest;
    const {
      studentId,
      title,
      type,
      status,
      examDurationMinutes,
      subjectId,
      topicId,
      basedOnQuestionGroupId,
      totalQuestions,
      questions,
    } = body;

    if (
      !studentId ||
      !title ||
      !type ||
      !status ||
      totalQuestions === undefined
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields (studentId, title, type, status, totalQuestions)",
        },
        { status: 400 }
      );
    }

    const sessionTypeEnumValue = PracticeSessionType[type];
    const sessionStatusEnumValue = PracticeSessionStatus[status];

    if (!sessionTypeEnumValue) {
      return NextResponse.json(
        { error: `Invalid practice session type: ${type}` },
        { status: 400 }
      );
    }
    if (!sessionStatusEnumValue) {
      return NextResponse.json(
        { error: `Invalid practice session status: ${status}` },
        { status: 400 }
      );
    }

    const practiceSession = await prisma.practiceSession.create({
      data: {
        studentId,
        title,
        type: sessionTypeEnumValue,
        status: sessionStatusEnumValue,
        startTime: new Date(),
        examDurationMinutes: examDurationMinutes
          ? Number(examDurationMinutes)
          : undefined,
        durationSeconds: examDurationMinutes
          ? Number(examDurationMinutes) * 60
          : undefined,
        subjectId: subjectId ? Number(subjectId) : undefined,
        topicId: topicId ? Number(topicId) : undefined,
        basedOnQuestionGroupId: basedOnQuestionGroupId
          ? Number(basedOnQuestionGroupId)
          : undefined,
        totalQuestions: Number(totalQuestions),
        xpEarned: 0,
      },
    });

    if (Array.isArray(questions) && questions.length > 0) {
      // Create student answers individually to preserve order
      for (let i = 0; i < questions.length; i++) {
        await prisma.studentAnswer.create({
          data: {
            practiceSessionId: practiceSession.id,
            questionId: questions[i].id,
          },
        });
        // Small delay to ensure different createdAt timestamps
        if (i < questions.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1));
        }
      }
    }

    return NextResponse.json(practiceSession, { status: 201 });
  } catch (error: any) {
    console.error(
      "API: Error creating/initializing practice/mock session:",
      error
    );
    return NextResponse.json(
      {
        error: error.message || "Failed to create/initialize session",
        details: error.stack,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json(
      { error: "Session ID is required" },
      { status: 400 }
    );
  }

  try {
    const session = await prisma.practiceSession.findUnique({
      where: { id: sessionId },
      include: {
        studentAnswers: {
          include: {
            question: {
              include: {
                topic: {
                  select: { id: true, name: true, subjectId: true },
                },
              },
            },
          },
          orderBy: {
            createdAt: "asc", // Preserve original question sequence
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const questions = session.studentAnswers.map((sa) => {
      const q = sa.question;

      // Format correctAnswer similar to other question APIs
      let clientCorrectAnswer = q.correctAnswer;
      if (typeof q.correctAnswer === "string") {
        try {
          const parsed = JSON.parse(q.correctAnswer);
          if (typeof parsed === "object" || Array.isArray(parsed)) {
            clientCorrectAnswer = parsed;
          }
        } catch (e) {
          // Not a valid JSON string, keep as string
        }
      }

      return {
        id: q.id,
        text: q.text,
        question: q.text, // For compatibility
        options: formatOptionsForClient(q.options),
        correctAnswer: clientCorrectAnswer,
        hint: q.hint,
        explanation: q.explanation,
        difficulty: q.difficulty,
        pointsAwarded: q.pointsAwarded,
        marks: q.marks,
        questionType: q.questionType,
        imageUrl: q.imageUrl,
        topic: q.topic,
        submittedAnswer: sa.submittedAnswer,
        isCorrect: sa.isCorrect,
      };
    });

    return NextResponse.json({ questions });
  } catch (error: any) {
    console.error("Error fetching session questions:", error);
    return NextResponse.json(
      { error: "Failed to fetch session questions" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
