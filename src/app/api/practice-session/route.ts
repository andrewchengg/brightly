import { NextResponse } from 'next/server';
import { PrismaClient, PracticeSessionType } from '@prisma/client';

const prisma = new PrismaClient();

interface PracticeSessionRequest {
  studentId: string;
  title: string;
  type: string;
  status: 'NOT_STARTED' | 'STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED';
  examDurationMinutes: number;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as PracticeSessionRequest;
    const { studentId, title, type, status, examDurationMinutes } = body;

    if (!studentId || !title || !type || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Convert string type to PracticeSessionType enum
    const sessionType = type as PracticeSessionType;

    const practiceSession = await prisma.practiceSession.create({
      data: {
        studentId,
        title,
        type: sessionType,
        status,
        startTime: new Date(),
        durationSeconds: examDurationMinutes * 60,
        totalQuestions: 0,
        xpEarned: 0
      }
    });

    return NextResponse.json(practiceSession);
  } catch (error: any) {
    console.error('Error creating practice session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create practice session' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 