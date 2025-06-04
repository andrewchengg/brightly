// src/app/api/parent/assign-practice/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import {
  PrismaClient,
  PracticeSessionType,
  PracticeSessionStatus,
} from "@/generated/prisma";

const prisma = new PrismaClient();

interface AssignPracticeRequest {
  studentId: string;
  parentId: string; // The parent performing the assignment
  title: string;
  type: keyof typeof PracticeSessionType; // e.g., TOPIC_QUIZ, MOCK_EXAM
  subjectId: number;
  topicId?: number;
  basedOnQuestionGroupId?: number;
  totalQuestions: number;
  examDurationMinutes?: number;
}

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createClient();

  try {
    const {
      data: { user: parentUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !parentUser) {
      return NextResponse.json(
        { error: "Unauthorized: Parent not logged in." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as AssignPracticeRequest;
    const {
      studentId,
      parentId,
      title,
      type,
      subjectId,
      topicId,
      basedOnQuestionGroupId,
      totalQuestions,
      examDurationMinutes,
    } = body;

    // Authorization: Ensure the parent making the request is the one assigned to the student
    if (parentUser.id !== parentId) {
      return NextResponse.json(
        {
          error:
            "Forbidden: You can only assign practice to your own children.",
        },
        { status: 403 }
      );
    }
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student || student.parentId !== parentUser.id) {
      return NextResponse.json(
        {
          error:
            "Forbidden: Child not found or not associated with this parent.",
        },
        { status: 403 }
      );
    }

    if (
      !studentId ||
      !title ||
      !type ||
      !subjectId ||
      totalQuestions === undefined
    ) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    const sessionTypeEnumValue = PracticeSessionType[type];
    if (!sessionTypeEnumValue) {
      return NextResponse.json(
        { error: `Invalid practice session type: ${type}` },
        { status: 400 }
      );
    }

    const newSession = await prisma.practiceSession.create({
      data: {
        studentId,
        title: title || `${type.replace(/_/g, " ")} Assignment`,
        type: sessionTypeEnumValue,
        status: PracticeSessionStatus.NOT_STARTED, // Assignments start as NOT_STARTED
        assignedByParentId: parentId,
        subjectId: Number(subjectId),
        topicId: topicId ? Number(topicId) : undefined,
        basedOnQuestionGroupId: basedOnQuestionGroupId
          ? Number(basedOnQuestionGroupId)
          : undefined,
        totalQuestions: Number(totalQuestions),
        examDurationMinutes: examDurationMinutes
          ? Number(examDurationMinutes)
          : undefined,
        startTime: new Date(), // Or null, and set when student starts
        xpEarned: 0,
      },
    });

    return NextResponse.json(newSession, { status: 201 });
  } catch (error: any) {
    console.error("API Error assigning practice:", error);
    return NextResponse.json(
      { error: "Failed to assign practice.", details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
