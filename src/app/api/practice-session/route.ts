// src/app/api/practice-session/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient, PracticeSessionType, PracticeSessionStatus } from '@/generated/prisma';

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
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as PracticeSessionCreateRequest;
    const { 
      studentId, 
      title, 
      type, 
      status, 
      examDurationMinutes,
      subjectId,
      topicId,
      basedOnQuestionGroupId,
      totalQuestions 
    } = body;

    if (!studentId || !title || !type || !status || totalQuestions === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields (studentId, title, type, status, totalQuestions)' },
        { status: 400 }
      );
    }

    const sessionTypeEnumValue = PracticeSessionType[type];
    const sessionStatusEnumValue = PracticeSessionStatus[status];

    if (!sessionTypeEnumValue) {
        return NextResponse.json({ error: `Invalid practice session type: ${type}` }, { status: 400 });
    }
    if (!sessionStatusEnumValue) {
        return NextResponse.json({ error: `Invalid practice session status: ${status}` }, { status: 400 });
    }

    const practiceSession = await prisma.practiceSession.create({
      data: {
        studentId,
        title,
        type: sessionTypeEnumValue,
        status: sessionStatusEnumValue,
        startTime: new Date(), 
        examDurationMinutes: examDurationMinutes ? Number(examDurationMinutes) : undefined,
        durationSeconds: examDurationMinutes ? Number(examDurationMinutes) * 60 : undefined,
        subjectId: subjectId ? Number(subjectId) : undefined,
        topicId: topicId ? Number(topicId) : undefined,
        basedOnQuestionGroupId: basedOnQuestionGroupId ? Number(basedOnQuestionGroupId) : undefined,
        totalQuestions: Number(totalQuestions),
        xpEarned: 0, 
      }
    });
    console.log("API: PracticeSession created (or MOCK_EXAM initialized):", practiceSession.id);
    return NextResponse.json(practiceSession, { status: 201 });

  } catch (error: any) {
    console.error('API: Error creating/initializing practice/mock session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create/initialize session', details: error.stack },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}