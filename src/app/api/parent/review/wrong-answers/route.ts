import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    if (childrenIds.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch wrong answers for all children
    const wrongAnswers = await prisma.studentAnswer.findMany({
      where: {
        practiceSession: {
          studentId: { in: childrenIds },
        },
        isCorrect: false,
      },
      include: {
        question: {
          include: {
            topic: true,
            subject: true,
            questionGroup: true,
          },
        },
        practiceSession: {
          select: {
            id: true,
            title: true,
            type: true,
            student: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        attemptedAt: "desc",
      },
      take: 100, // Limit to recent 100 wrong answers
    });

    // Transform the data to match the frontend interface
    const transformedAnswers = wrongAnswers.map((answer) => ({
      studentAnswerId: answer.id,
      submittedAnswer: answer.submittedAnswer,
      attemptedAt: answer.attemptedAt,
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
          id: answer.question.topic.id,
          name: answer.question.topic.name,
        },
        subject: {
          id: answer.question.subject.id,
          name: answer.question.subject.name,
        },
        questionGroup: answer.question.questionGroup
          ? {
              id: answer.question.questionGroup.id,
              name: answer.question.questionGroup.name,
            }
          : null,
      },
      practiceSession: {
        id: answer.practiceSession.id,
        title: answer.practiceSession.title,
        type: answer.practiceSession.type,
      },
      student: {
        id: answer.practiceSession.student.id,
        name: answer.practiceSession.student.name,
      },
    }));

    return NextResponse.json(transformedAnswers);
  } catch (error) {
    console.error("Error fetching wrong answers:", error);
    return NextResponse.json(
      { error: "Failed to fetch wrong answers" },
      { status: 500 }
    );
  }
}
