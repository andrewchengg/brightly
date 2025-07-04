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
      await prisma.studentAnswer.createMany({
        data: questions.map((q) => ({
          practiceSessionId: practiceSession.id,
          questionId: q.id,
        })),
      });
    }

    console.log(
      "API: PracticeSession created (or MOCK_EXAM initialized):",
      practiceSession.id
    );
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
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const questions = session.studentAnswers.map((sa) => {
      const q = sa.question;
      return {
        ...q,
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
