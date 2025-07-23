import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    sessionId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = params;

    // Get parent ID from user
    const parent = await prisma.parent.findUnique({
      where: { id: user.id },
      include: {
        students: true,
      },
    });

    if (!parent) {
      return NextResponse.json({ error: "Parent not found" }, { status: 404 });
    }

    const childrenIds = parent.students.map((student) => student.id);

    // Fetch the practice session and verify it belongs to one of the parent's children
    const session = await prisma.practiceSession.findFirst({
      where: {
        id: sessionId,
        studentId: { in: childrenIds },
        OR: [
          { status: "COMPLETED" },
          // Include abandoned sessions that have completion data (matching student API)
          {
            status: "ABANDONED",
            AND: [
              { endTime: { not: null } },
              { totalMarksEarned: { not: null } },
              { correctAnswers: { not: null } },
            ],
          },
        ],
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        subject: {
          select: {
            name: true,
          },
        },
        topic: {
          select: {
            name: true,
          },
        },
        basedOnQuestionGroup: {
          select: {
            name: true,
          },
        },
        studentAnswers: {
          include: {
            question: {
              include: {
                topic: {
                  select: {
                    name: true,
                  },
                },
                subject: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            attemptedAt: "asc",
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Calculate session statistics - matching student API calculation exactly
    // Always calculate from actual question marks to ensure accuracy
    let totalMarksEarned = 0;
    let totalPossibleMarks = 0;

    if (session.studentAnswers && session.studentAnswers.length > 0) {
      session.studentAnswers.forEach((answer) => {
        const questionMarks = answer.question?.marks || 0;
        totalPossibleMarks += questionMarks;

        // Add marks only if the answer is correct (matching student API)
        if (answer.isCorrect) {
          totalMarksEarned += questionMarks;
        }
      });
    }

    const sessionDetails = {
      id: session.id,
      title: session.title,
      type: session.type,
      startTime: session.startTime,
      endTime: session.endTime,
      durationSeconds: session.durationSeconds,
      totalQuestions: session.totalQuestions,
      correctAnswers: session.correctAnswers,
      totalMarksEarned,
      totalPossibleMarks,
      xpEarned: session.xpEarned, // Use stored xpEarned field (matching student API)
      subjectName: session.subject?.name || null,
      topicName: session.topic?.name || null,
      questionGroupName: session.basedOnQuestionGroup?.name || null,
      student: {
        id: session.student.id,
        name: session.student.name,
        username: session.student.username,
      },
      answers: session.studentAnswers.map((answer) => ({
        id: answer.id,
        submittedAnswer: answer.submittedAnswer,
        isCorrect: answer.isCorrect,
        pointsEarned: answer.pointsEarned,
        question: {
          id: answer.question.id,
          text: answer.question.text,
          questionType: answer.question.questionType,
          options: answer.question.options,
          correctAnswer: answer.question.correctAnswer,
          explanation: answer.question.explanation,
          hint: answer.question.hint,
          imageUrl: answer.question.imageUrl,
          difficulty: answer.question.difficulty,
          topic: {
            name: answer.question.topic.name,
          },
          subject: {
            name: answer.question.subject.name,
          },
        },
      })),
    };

    return NextResponse.json(sessionDetails);
  } catch (error) {
    console.error("Error fetching session details:", error);
    return NextResponse.json(
      { error: "Failed to fetch session details" },
      { status: 500 }
    );
  }
}
