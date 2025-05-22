// src/app/api/student-answers/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma'; // Use generated client

const prisma = new PrismaClient();

interface StudentAnswerCreateRequest {
  practiceSessionId: string;
  questionId: number;
  submittedAnswer: any; // Prisma's Json type can handle various structures
  isCorrect: boolean;
  pointsEarned: number;
  attemptedAt?: string; // Optional, defaults to now()
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as StudentAnswerCreateRequest;
    const { 
      practiceSessionId, 
      questionId, 
      submittedAnswer, 
      isCorrect, 
      pointsEarned,
      attemptedAt 
    } = body;

    if (!practiceSessionId || questionId === undefined || submittedAnswer === undefined || isCorrect === undefined || pointsEarned === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields for student answer' },
        { status: 400 }
      );
    }

    // Upsert logic: if an answer for this question in this session already exists, update it. Otherwise, create.
    const studentAnswer = await prisma.studentAnswer.upsert({
      where: {
        practiceSessionId_questionId: { // This is the unique constraint name from your schema
          practiceSessionId: practiceSessionId,
          questionId: Number(questionId),
        }
      },
      update: {
        submittedAnswer: submittedAnswer, // Supabase client handles JSON stringification if needed
        isCorrect: isCorrect,
        pointsEarned: Number(pointsEarned),
        attemptedAt: attemptedAt ? new Date(attemptedAt) : new Date(),
        updatedAt: new Date(),
      },
      create: {
        practiceSessionId: practiceSessionId,
        questionId: Number(questionId),
        submittedAnswer: submittedAnswer,
        isCorrect: isCorrect,
        pointsEarned: Number(pointsEarned),
        attemptedAt: attemptedAt ? new Date(attemptedAt) : new Date(),
        // createdAt and updatedAt have defaults
      }
    });
    console.log("API: StudentAnswer saved/updated:", studentAnswer.id);
    return NextResponse.json(studentAnswer, { status: 201 });

  } catch (error: any) {
    console.error('API: Error saving student answer:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save student answer', details: error.stack },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}