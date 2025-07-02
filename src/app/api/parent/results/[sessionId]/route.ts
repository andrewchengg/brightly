import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

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
        status: "COMPLETED",
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

    // Calculate session statistics
    const totalQuestions = session.studentAnswers.length;
    const correctAnswers = session.studentAnswers.filter(
      (answer) => answer.isCorrect
    ).length;
    const totalScore = session.studentAnswers.reduce(
      (sum, answer) => sum + (answer.pointsEarned || 0),
      0
    );

    // Calculate total possible marks by summing up the marks field from each question
    const totalPossibleMarks = session.studentAnswers.reduce((sum, answer) => {
      const questionMarks = answer.question?.marks || answer.question?.pointsAwarded || 0;
      console.log(`[Session ${session.id}] Question ${answer.question?.id}: marks=${answer.question?.marks}, pointsAwarded=${answer.question?.pointsAwarded}, using=${questionMarks}`);
      return sum + questionMarks;
    }, 0);
    console.log(`[Session ${session.id}] Total possible marks: ${totalPossibleMarks}, Total questions: ${totalQuestions}, Total score: ${totalScore}`);

    // Calculate XP earned (example formula, adjust as needed)
    const xpEarned = Math.round(totalScore * 1.5); // 1.5x multiplier for XP

    const sessionDetails = {
      id: session.id,
      title: session.title,
      type: session.type,
      startTime: session.startTime,
      endTime: session.endTime,
      durationSeconds: session.durationSeconds,
      totalQuestions,
      correctAnswers,
      score: totalScore,
      totalPossibleMarks,
      xpEarned,
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
