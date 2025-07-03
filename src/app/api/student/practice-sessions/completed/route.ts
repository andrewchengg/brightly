// src/app/api/student/practice-sessions/completed/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import {
  PrismaClient,
  PracticeSessionStatus,
  PracticeSessionType,
} from "@/generated/prisma";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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
    const studentId = user.id;

    const completedSessions = await prisma.practiceSession.findMany({
      where: {
        studentId: studentId,
        status: PracticeSessionStatus.COMPLETED,
      },
      include: {
        subject: { select: { name: true } },
        topic: { select: { name: true } },
        basedOnQuestionGroup: { select: { name: true } },
        studentAnswers: {
          select: {
            isCorrect: true,
            pointsEarned: true,
            question: {
              select: {
                marks: true,
              },
            },
          },
        },
      },
      orderBy: {
        endTime: "desc", // Show most recent first
      },
    });

    if (!completedSessions) {
      return NextResponse.json([], { status: 200 }); // Return empty array if none found
    }

    // Calculate session statistics and format
    const formattedSessions = completedSessions.map((session) => {
      // Use stored marks fields if available, fallback to calculation for older sessions
      let totalPossibleMarks = session.totalPossibleMarks;
      let totalMarksEarned = session.totalMarksEarned;

      if (totalPossibleMarks === null || totalMarksEarned === null) {
        // Fallback calculation for older sessions
        totalMarksEarned = session.studentAnswers
          .filter((answer) => answer.isCorrect)
          .reduce((sum, answer) => sum + (answer.question?.marks || 0), 0);
        
        totalPossibleMarks = session.studentAnswers.reduce((sum, answer) => {
          const questionMarks = answer.question?.marks || 0;
          return sum + questionMarks;
        }, 0);
      }

      return {
        id: session.id,
        title: session.title,
        type: session.type,
        endTime: session.endTime,
        score: totalMarksEarned, // Use marks earned instead of legacy score
        totalQuestions: session.totalQuestions,
        correctAnswers: session.correctAnswers,
        xpEarned: session.xpEarned,
        totalPossibleMarks,
        subjectName: session.subject?.name,
        topicName: session.topic?.name,
        questionGroupName: session.basedOnQuestionGroup?.name,
      };
    });

    return NextResponse.json(formattedSessions);
  } catch (error: any) {
    console.error("API: Error fetching completed practice sessions:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch completed practice sessions",
        details: error.message,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
