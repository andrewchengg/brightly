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
        OR: [
          { status: PracticeSessionStatus.COMPLETED },
          // Include abandoned sessions that have completion data (temporary fix for race condition issue)
          {
            status: PracticeSessionStatus.ABANDONED,
            AND: [
              { endTime: { not: null } },
              { totalMarksEarned: { not: null } },
              { correctAnswers: { not: null } },
            ],
          },
        ],
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
      // Always calculate from actual question marks to ensure accuracy
      let totalMarksEarned = 0;
      let totalPossibleMarks = 0;

      if (session.studentAnswers && session.studentAnswers.length > 0) {
        session.studentAnswers.forEach((answer) => {
          const questionMarks = answer.question?.marks || 0;
          totalPossibleMarks += questionMarks;

          // Add marks only if the answer is correct
          if (answer.isCorrect) {
            totalMarksEarned += questionMarks;
          }
        });
      }

      console.log(
        `Session ${session.id}: Calculated marks ${totalMarksEarned}/${totalPossibleMarks}`
      );

      return {
        id: session.id,
        title: session.title,
        type: session.type,
        endTime: session.endTime,
        totalMarksEarned,
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
