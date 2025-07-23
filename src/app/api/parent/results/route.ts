import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

    // Fetch completed practice sessions for all children
    const completedSessions = await prisma.practiceSession.findMany({
      where: {
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
        endTime: "desc",
      },
      take: 100, // Limit to recent 100 sessions
    });

    // Calculate session statistics - matching student API calculation exactly
    const sessionsWithStats = completedSessions.map((session) => {
      // Always calculate from actual question marks to ensure accuracy (matching student API)
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

      // Calculate duration - use durationSeconds if available, otherwise calculate from timestamps
      let calculatedDuration = session.durationSeconds;
      if (!calculatedDuration && session.startTime && session.endTime) {
        calculatedDuration = Math.floor(
          (new Date(session.endTime).getTime() -
            new Date(session.startTime).getTime()) /
            1000
        );
      }

      return {
        id: session.id,
        title: session.title,
        type: session.type,
        startTime: session.startTime,
        endTime: session.endTime,
        durationSeconds: calculatedDuration || 0,
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
      };
    });

    return NextResponse.json(sessionsWithStats);
  } catch (error) {
    console.error("Error fetching parent results:", error);
    return NextResponse.json(
      { error: "Failed to fetch results" },
      { status: 500 }
    );
  }
}
