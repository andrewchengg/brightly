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
          select: {
            isCorrect: true,
            pointsEarned: true,
            question: {
              select: {
                marks: true,
                pointsAwarded: true,
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

    // Calculate session statistics
    const sessionsWithStats = completedSessions.map((session) => {
      const totalQuestions = session.studentAnswers.length;
      const correctAnswers = session.studentAnswers.filter(
        (answer) => answer.isCorrect
      ).length;
      const totalScore = session.studentAnswers.reduce(
        (sum, answer) => sum + (answer.pointsEarned || 0),
        0
      );

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

        console.log(
          `[Session ${session.id}] Calculated marks (fallback): ${totalMarksEarned}/${totalPossibleMarks}`
        );
      } else {
        console.log(
          `[Session ${session.id}] Using stored marks: ${totalMarksEarned}/${totalPossibleMarks}`
        );
      }

      // Calculate XP earned (example formula, adjust as needed)
      const xpEarned = Math.round(totalScore * 1.5); // 1.5x multiplier for XP

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
        totalQuestions,
        correctAnswers,
        score: totalMarksEarned, // Use marks earned instead of legacy score
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
