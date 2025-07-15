// src/app/api/student-answers/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";

export const dynamic = "force-dynamic";

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
    // Handle both single answer and array of answers
    const answers = Array.isArray(body) ? body : [body];

    // Validate each answer
    for (const answer of answers) {
      const { practiceSessionId, questionId } = answer;
      if (!practiceSessionId || !questionId) {
        return NextResponse.json(
          { error: "Missing required fields in one or more answers" },
          { status: 400 }
        );
      }
    }

    // Create all answers in a transaction
    const createdAnswers = await prisma.$transaction(
      answers.map((answer) => {
        const { practiceSessionId, questionId, submittedAnswer, isCorrect, pointsEarned } = answer;
        return prisma.studentAnswer.upsert({
          where: {
            practiceSessionId_questionId: {
              practiceSessionId,
              questionId: parseInt(questionId.toString(), 10),
            },
          },
          update: {
            submittedAnswer,
            isCorrect: Boolean(isCorrect),
            pointsEarned: parseInt(pointsEarned.toString(), 10) || 0,
            attemptedAt: new Date(),
          },
          create: {
            practiceSessionId,
            questionId: parseInt(questionId.toString(), 10),
            submittedAnswer,
            isCorrect: Boolean(isCorrect),
            pointsEarned: parseInt(pointsEarned.toString(), 10) || 0,
            attemptedAt: new Date(),
          },
        });
      })
    );

    return NextResponse.json(createdAnswers);
  } catch (error: any) {
    console.error("Error saving student answers:", error);
    return NextResponse.json(
      { error: "Failed to save answers" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
