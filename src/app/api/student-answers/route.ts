// src/app/api/student-answers/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma'; 

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
    const bodyArrayOrObject = await request.json(); 
    
    // Ensure body is an array
    const bodyArray = Array.isArray(bodyArrayOrObject) ? bodyArrayOrObject : [bodyArrayOrObject];

    if (bodyArray.length === 0) {
        return NextResponse.json({ error: 'No student answers provided.'}, {status: 400});
    }
    
    const createdAnswers = [];

    for (const ans of bodyArray) {
        const { 
          practiceSessionId, 
          questionId, 
          submittedAnswer, 
          isCorrect, 
          pointsEarned, 
          attemptedAt 
        } = ans as StudentAnswerCreateRequest;

        if (!practiceSessionId || questionId === undefined || submittedAnswer === undefined || isCorrect === undefined || pointsEarned === undefined) {
          console.warn('Skipping invalid student answer object:', ans);
          continue; 
        }

        const studentAnswer = await prisma.studentAnswer.upsert({
          where: {
            practiceSessionId_questionId: { 
              practiceSessionId: practiceSessionId,
              questionId: Number(questionId),
            }
          },
          update: {
            submittedAnswer: submittedAnswer, 
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
          }
        });
        createdAnswers.push(studentAnswer);
        console.log("API: StudentAnswer saved/updated:", studentAnswer.id);
    }
    
    if (createdAnswers.length === 0 && bodyArray.length > 0) {
        return NextResponse.json({ error: 'All submitted answers were invalid.'}, {status: 400});
    }
    return NextResponse.json(createdAnswers, { status: 201 });

  } catch (error: any) {
    console.error('API: Error saving student answer(s):', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save student answer(s)', details: error.stack },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}