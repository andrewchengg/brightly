// src/app/api/student-answers/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

interface StudentAnswerCreateRequest {
  practiceSessionId: string;
  questionId: number;
  submittedAnswer: any;
  isCorrect: boolean;
  pointsEarned: number;
  attemptedAt?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      practiceSessionId,
      questionId,
      submittedAnswer,
      isCorrect,
      pointsEarned,
    } = body;

    if (!practiceSessionId || !questionId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Use upsert to handle duplicate submissions (overwrite if answer already exists)
    const studentAnswer = await prisma.studentAnswer.upsert({
      where: {
        practiceSessionId_questionId: {
          practiceSessionId,
          questionId: parseInt(questionId, 10),
        },
      },
      update: {
        submittedAnswer,
        isCorrect: Boolean(isCorrect),
        pointsEarned: parseInt(pointsEarned, 10) || 0,
        attemptedAt: new Date(),
      },
      create: {
        practiceSessionId,
        questionId: parseInt(questionId, 10),
        submittedAnswer,
        isCorrect: Boolean(isCorrect),
        pointsEarned: parseInt(pointsEarned, 10) || 0,
        attemptedAt: new Date(),
      },
    });

    return NextResponse.json(studentAnswer);
  } catch (error: any) {
    console.error("Error saving student answer:", error);
    return NextResponse.json(
      { error: "Failed to save answer" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
