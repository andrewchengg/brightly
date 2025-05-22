// src/app/api/practice-sessions/[id]/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient, PracticeSessionStatus, Result } from '@/generated/prisma';

const prisma = new PrismaClient();

interface UpdatePracticeSessionRequest {
  status?: keyof typeof PracticeSessionStatus;
  endTime?: string;
  score?: number;
  correctAnswers?: number;
  xpEarned?: number;
  // Potentially add studentAnswers here if you want to bulk save them on finalize
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: practiceSessionId } = params;
    const body = await request.json() as UpdatePracticeSessionRequest;
    const { status, endTime, score, correctAnswers, xpEarned } = body;

    if (!practiceSessionId) {
      return NextResponse.json({ error: 'Practice Session ID is required' }, { status: 400 });
    }

    const updateData: any = { updatedAt: new Date() };
    if (status) {
        const sessionStatusEnumValue = PracticeSessionStatus[status];
        if (!sessionStatusEnumValue) {
            return NextResponse.json({ error: `Invalid practice session status: ${status}` }, { status: 400 });
        }
        updateData.status = sessionStatusEnumValue;
    }
    if (endTime) updateData.endTime = new Date(endTime);
    if (score !== undefined) updateData.score = Number(score);
    if (correctAnswers !== undefined) updateData.correctAnswers = Number(correctAnswers);
    if (xpEarned !== undefined) updateData.xpEarned = Number(xpEarned);


    const updatedPracticeSession = await prisma.practiceSession.update({
      where: { id: practiceSessionId },
      data: updateData,
      include: { student: true } // Include student to get studentId for Result
    });

    // If the session is being marked as COMPLETED, create a Result record
    if (updatedPracticeSession.status === PracticeSessionStatus.COMPLETED && updatedPracticeSession.studentId) {
      await prisma.result.create({
        data: {
          score: updatedPracticeSession.score || 0,
          practiceSessionId: updatedPracticeSession.id,
          studentId: updatedPracticeSession.studentId,
          submittedAt: updatedPracticeSession.endTime || new Date(),
          // createdAt and updatedAt will be handled by Prisma defaults
        }
      });
      console.log("API: Result record created for session:", updatedPracticeSession.id);
    }
    
    console.log("API: PracticeSession updated:", updatedPracticeSession.id, "Status:", updatedPracticeSession.status);
    return NextResponse.json(updatedPracticeSession);

  } catch (error: any) {
    console.error('API: Error updating practice session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update practice session', details: error.stack },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}