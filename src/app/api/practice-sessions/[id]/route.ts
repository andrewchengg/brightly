import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface UpdatePracticeSessionRequest {
  status?: 'NOT_STARTED' | 'STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED';
  endTime?: string;
  score?: number;
  correctAnswers?: number;
  xpEarned?: number;
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json() as UpdatePracticeSessionRequest;
    const { status, endTime, score, correctAnswers, xpEarned } = body;

    const practiceSession = await prisma.practiceSession.update({
      where: { id },
      data: {
        status,
        endTime: endTime ? new Date(endTime) : undefined,
        score,
        correctAnswers,
        xpEarned
      }
    });

    return NextResponse.json(practiceSession);
  } catch (error: any) {
    console.error('Error updating practice session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update practice session' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 