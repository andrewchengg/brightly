import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { calculateLevel } from "@/lib/xp-utils";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all children of the parent
    const children = await prisma.student.findMany({
      where: { parentId: user.id },
      select: {
        id: true,
        name: true,
        xpPoints: true,
        level: true,
        currentStreak: true,
        longestStreak: true,
        lastActivityDate: true,
      },
    });

    if (children.length === 0) {
      return NextResponse.json({ children: [], overallStats: {} });
    }

    const childIds = children.map((child) => child.id);
    const today = new Date();
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

    // Get practice sessions for today (including IN_PROGRESS and COMPLETED)
    const todaysSessions = await prisma.practiceSession.findMany({
      where: {
        studentId: { in: childIds },
        status: { in: ["COMPLETED", "IN_PROGRESS"] },
        startTime: {
          gte: startOfToday,
          lt: endOfToday,
        },
      },
      include: {
        student: { select: { name: true } },
        subject: { select: { name: true } },
      },
    });

    // Get practice sessions for the last 7 days (including IN_PROGRESS and COMPLETED)
    const weekAgo = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekSessions = await prisma.practiceSession.findMany({
      where: {
        studentId: { in: childIds },
        status: { in: ["COMPLETED", "IN_PROGRESS"] },
        startTime: {
          gte: weekAgo,
          lt: endOfToday,
        },
      },
      include: {
        student: { select: { name: true } },
        subject: { select: { name: true } },
      },
    });

    // Calculate statistics for each child
    const childrenStats = children.map((child) => {
      const childTodaySessions = todaysSessions.filter(
        (s) => s.studentId === child.id
      );
      const childWeekSessions = weekSessions.filter(
        (s) => s.studentId === child.id
      );

      // Today's stats - calculate time for both completed and in-progress sessions
      const todayTimeSpent = childTodaySessions.reduce((total, session) => {
        if (session.status === "COMPLETED" && session.durationSeconds) {
          return total + session.durationSeconds;
        } else if (session.status === "IN_PROGRESS" && session.startTime) {
          // Calculate elapsed time for in-progress sessions
          const now = new Date();
          const sessionStart = new Date(session.startTime);
          const elapsedSeconds = Math.floor(
            (now.getTime() - sessionStart.getTime()) / 1000
          );
          return total + Math.max(0, elapsedSeconds);
        }
        return total;
      }, 0);

      const todayQuestions = childTodaySessions.reduce((total, session) => {
        return total + (session.totalQuestions || 0);
      }, 0);

      const todayCorrectAnswers = childTodaySessions.reduce(
        (total, session) => {
          return total + (session.correctAnswers || 0);
        },
        0
      );

      const todayXPEarned = childTodaySessions.reduce((total, session) => {
        return total + (session.xpEarned || 0);
      }, 0);

      // Weekly stats - calculate time for both completed and in-progress sessions
      const weekTimeSpent = childWeekSessions.reduce((total, session) => {
        if (session.status === "COMPLETED" && session.durationSeconds) {
          return total + session.durationSeconds;
        } else if (session.status === "IN_PROGRESS" && session.startTime) {
          // Calculate elapsed time for in-progress sessions
          const now = new Date();
          const sessionStart = new Date(session.startTime);
          const elapsedSeconds = Math.floor(
            (now.getTime() - sessionStart.getTime()) / 1000
          );
          return total + Math.max(0, elapsedSeconds);
        }
        return total;
      }, 0);

      const weekQuestions = childWeekSessions.reduce((total, session) => {
        return total + (session.totalQuestions || 0);
      }, 0);

      const weekCorrectAnswers = childWeekSessions.reduce((total, session) => {
        return total + (session.correctAnswers || 0);
      }, 0);

      // Subject breakdown
      const subjectStats: {
        [key: string]: {
          questions: number;
          correct: number;
          timeSpent: number;
        };
      } = {};
      childWeekSessions.forEach((session) => {
        const subjectName = session.subject?.name || "Unknown";
        if (!subjectStats[subjectName]) {
          subjectStats[subjectName] = {
            questions: 0,
            correct: 0,
            timeSpent: 0,
          };
        }
        subjectStats[subjectName].questions += session.totalQuestions || 0;
        subjectStats[subjectName].correct += session.correctAnswers || 0;
        subjectStats[subjectName].timeSpent += session.durationSeconds || 0;
      });

      // Daily breakdown for the week
      const dailyStats = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        const startOfDay = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate()
        );
        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

        const daySessions = childWeekSessions.filter(
          (s) => s.startTime >= startOfDay && s.startTime < endOfDay
        );

        const dayQuestions = daySessions.reduce(
          (total, session) => total + (session.totalQuestions || 0),
          0
        );
        const dayCorrect = daySessions.reduce(
          (total, session) => total + (session.correctAnswers || 0),
          0
        );
        const dayTime = daySessions.reduce(
          (total, session) => total + (session.durationSeconds || 0),
          0
        );

        dailyStats.push({
          date: startOfDay.toISOString().split("T")[0],
          questions: dayQuestions,
          correctAnswers: dayCorrect,
          timeSpent: dayTime,
          accuracy:
            dayQuestions > 0
              ? Math.round((dayCorrect / dayQuestions) * 100)
              : 0,
        });
      }

      return {
        id: child.id,
        name: child.name,
        level: calculateLevel(child.xpPoints),
        xpPoints: child.xpPoints,
        currentStreak: child.currentStreak,
        longestStreak: child.longestStreak,
        lastActivityDate: child.lastActivityDate,
        today: {
          timeSpent: todayTimeSpent,
          timeSpentMinutes: Math.round(todayTimeSpent / 60),
          questionsAnswered: todayQuestions,
          correctAnswers: todayCorrectAnswers,
          accuracy:
            todayQuestions > 0
              ? Math.round((todayCorrectAnswers / todayQuestions) * 100)
              : 0,
          xpEarned: todayXPEarned,
          sessionsCompleted: childTodaySessions.length,
        },
        week: {
          timeSpent: weekTimeSpent,
          timeSpentMinutes: Math.round(weekTimeSpent / 60),
          questionsAnswered: weekQuestions,
          correctAnswers: weekCorrectAnswers,
          accuracy:
            weekQuestions > 0
              ? Math.round((weekCorrectAnswers / weekQuestions) * 100)
              : 0,
          sessionsCompleted: childWeekSessions.length,
        },
        subjectBreakdown: Object.entries(subjectStats).map(
          ([subject, stats]) => ({
            subject,
            questions: stats.questions,
            correct: stats.correct,
            accuracy:
              stats.questions > 0
                ? Math.round((stats.correct / stats.questions) * 100)
                : 0,
            timeSpent: Math.round(stats.timeSpent / 60), // in minutes
          })
        ),
        dailyStats,
      };
    });

    // Overall family stats with improved time calculation
    const totalTodayTimeSeconds = todaysSessions.length > 0 ? todaysSessions.reduce((total, session) => {
      if (session.status === "COMPLETED" && session.durationSeconds) {
        return total + session.durationSeconds;
      } else if (session.status === "IN_PROGRESS" && session.startTime) {
        const now = new Date();
        const sessionStart = new Date(session.startTime);
        const elapsedSeconds = Math.floor(
          (now.getTime() - sessionStart.getTime()) / 1000
        );
        return total + Math.max(0, elapsedSeconds);
      }
      return total;
    }, 0) : 0;

    const overallStats = {
      totalChildren: children.length,
      todayTotalTime: Math.round(totalTodayTimeSeconds / 60),
      todayTotalQuestions: todaysSessions.reduce(
        (total, session) => total + (session.totalQuestions || 0),
        0
      ),
      todayTotalCorrect: todaysSessions.reduce(
        (total, session) => total + (session.correctAnswers || 0),
        0
      ),
      weekTotalSessions: weekSessions.length,
    };

    return NextResponse.json({
      children: childrenStats,
      overallStats,
    });
  } catch (error) {
    console.error("Error fetching parent statistics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
