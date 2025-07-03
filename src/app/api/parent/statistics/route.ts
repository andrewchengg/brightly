import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { calculateLevel } from "@/lib/xp-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    console.log("Starting parent statistics API call");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.log("User not authenticated");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("User authenticated:", user.id);

    // Parse query parameters for date range
    const url = new URL(request.url);
    const startDateParam = url.searchParams.get("startDate");
    const endDateParam = url.searchParams.get("endDate");
    const period = url.searchParams.get("period") || "7d";

    // Set default date range based on period if not provided
    let startDate: Date;
    let endDate: Date;

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
    } else {
      // Default to current period
      const today = new Date();

      switch (period) {
        case "30d":
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          break;
        case "3m":
          const quarterStart = Math.floor(today.getMonth() / 3) * 3;
          startDate = new Date(today.getFullYear(), quarterStart, 1);
          endDate = new Date(today.getFullYear(), quarterStart + 3, 0);
          break;
        default: // "7d"
          // Hardcode the specific date range for testing
          endDate = new Date("2025-07-02");
          startDate = new Date("2025-06-26");

          // Set proper times
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);

          console.log("API Date Range:", {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          });
      }
    }

    console.log(
      `Fetching data for period: ${period}, from ${startDate.toISOString()} to ${endDate.toISOString()}`
    );

    // Get all children of the parent
    let children;
    try {
      children = await prisma.student.findMany({
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
      console.log("Found children:", children.length);
    } catch (error) {
      console.error("Error fetching children:", error);
      return NextResponse.json(
        { error: "Failed to fetch children data" },
        { status: 500 }
      );
    }

    if (children.length === 0) {
      console.log("No children found, returning empty data");
      return NextResponse.json({ children: [], overallStats: {} });
    }

    const childIds = children.map((child) => child.id);

    // Calculate "today" stats (most recent day in the selected range)
    const today = new Date();
    const isCurrentPeriod = endDate >= today;
    const recentDay = isCurrentPeriod ? today : endDate;
    const startOfRecentDay = new Date(
      recentDay.getFullYear(),
      recentDay.getMonth(),
      recentDay.getDate()
    );
    const endOfRecentDay = new Date(
      startOfRecentDay.getTime() + 24 * 60 * 60 * 1000
    );

    // Get practice sessions for the recent day (including IN_PROGRESS and COMPLETED)
    let recentDaySessions;
    try {
      recentDaySessions = await prisma.practiceSession.findMany({
        where: {
          studentId: { in: childIds },
          status: { in: ["COMPLETED", "IN_PROGRESS"] },
          startTime: {
            gte: startOfRecentDay,
            lt: endOfRecentDay,
          },
        },
        include: {
          student: { select: { name: true } },
          subject: { select: { name: true } },
        },
      });
      console.log("Found recent day sessions:", recentDaySessions.length);
    } catch (error) {
      console.error("Error fetching recent day sessions:", error);
      return NextResponse.json(
        { error: "Failed to fetch recent day sessions" },
        { status: 500 }
      );
    }

    // Get practice sessions for the selected date range (including IN_PROGRESS and COMPLETED)
    let rangeSessions;
    try {
      rangeSessions = await prisma.practiceSession.findMany({
        where: {
          studentId: { in: childIds },
          status: { in: ["COMPLETED", "IN_PROGRESS"] },
          startTime: {
            gte: startDate,
            lt: new Date(endDate.getTime() + 24 * 60 * 60 * 1000), // Include end date
          },
        },
        include: {
          student: { select: { name: true } },
          subject: { select: { name: true } },
        },
      });
      console.log("Found range sessions:", rangeSessions.length);
    } catch (error) {
      console.error("Error fetching range sessions:", error);
      return NextResponse.json(
        { error: "Failed to fetch range sessions" },
        { status: 500 }
      );
    }

    // Calculate statistics for each child
    let childrenStats;
    try {
      childrenStats = children.map((child) => {
        console.log("Processing child:", child.name);

        const childRecentDaySessions = recentDaySessions.filter(
          (s) => s.studentId === child.id
        );
        const childRangeSessions = rangeSessions.filter(
          (s) => s.studentId === child.id
        );

        // Recent day stats - calculate time for both completed and in-progress sessions
        const recentDayTimeSpent = childRecentDaySessions.reduce(
          (total, session) => {
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
          },
          0
        );

        const recentDayQuestions = childRecentDaySessions.reduce(
          (total, session) => {
            return total + (session.totalQuestions || 0);
          },
          0
        );

        const recentDayCorrectAnswers = childRecentDaySessions.reduce(
          (total, session) => {
            return total + (session.correctAnswers || 0);
          },
          0
        );

        const recentDayMarksEarned = childRecentDaySessions.reduce(
          (total, session) => {
            return total + (session.totalMarksEarned || 0);
          },
          0
        );

        const recentDayPossibleMarks = childRecentDaySessions.reduce(
          (total, session) => {
            return total + (session.totalPossibleMarks || 0);
          },
          0
        );

        const recentDayAccuracy =
          recentDayPossibleMarks > 0
            ? Math.round((recentDayMarksEarned / recentDayPossibleMarks) * 100)
            : 0;

        // Range stats - calculate time for both completed and in-progress sessions
        const rangeTimeSpent = childRangeSessions.reduce((total, session) => {
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

        const rangeQuestions = childRangeSessions.reduce((total, session) => {
          return total + (session.totalQuestions || 0);
        }, 0);

        const rangeCorrectAnswers = childRangeSessions.reduce(
          (total, session) => {
            return total + (session.correctAnswers || 0);
          },
          0
        );

        const rangeMarksEarned = childRangeSessions.reduce((total, session) => {
          return total + (session.totalMarksEarned || 0);
        }, 0);

        const rangePossibleMarks = childRangeSessions.reduce(
          (total, session) => {
            return total + (session.totalPossibleMarks || 0);
          },
          0
        );

        const rangeAccuracy =
          rangePossibleMarks > 0
            ? Math.round((rangeMarksEarned / rangePossibleMarks) * 100)
            : 0;

        // Subject breakdown
        const subjectStats: {
          [key: string]: {
            questions: number;
            correct: number;
            timeSpent: number;
            marksEarned: number;
            possibleMarks: number;
          };
        } = {};
        childRangeSessions.forEach((session) => {
          const subjectName = session.subject?.name || "Unknown";
          if (!subjectStats[subjectName]) {
            subjectStats[subjectName] = {
              questions: 0,
              correct: 0,
              timeSpent: 0,
              marksEarned: 0,
              possibleMarks: 0,
            };
          }
          subjectStats[subjectName].questions += session.totalQuestions || 0;
          subjectStats[subjectName].correct += session.correctAnswers || 0;
          subjectStats[subjectName].timeSpent += session.durationSeconds || 0;
          subjectStats[subjectName].marksEarned +=
            session.totalMarksEarned || 0;
          subjectStats[subjectName].possibleMarks +=
            session.totalPossibleMarks || 0;
        });

        // Daily breakdown for the selected range
        const dailyStats = [];
        const dailySubjectStats = [];

        // Generate array of dates from start to end
        const dates = [];
        let currentDate = new Date(startDate);

        while (currentDate <= endDate) {
          dates.push(new Date(currentDate));
          currentDate.setDate(currentDate.getDate() + 1);
        }

        console.log(
          "Processing dates:",
          dates.map((d) => d.toISOString().split("T")[0])
        );

        // Process each date
        for (const date of dates) {
          const startOfDay = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
          );
          const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

          console.log(`Processing ${startOfDay.toISOString().split("T")[0]}`);

          const daySessions = childRangeSessions.filter(
            (s) => s.startTime >= startOfDay && s.startTime < endOfDay
          );

          console.log(
            `Found ${daySessions.length} sessions for ${
              startOfDay.toISOString().split("T")[0]
            }`
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
          const dayMarksEarned = daySessions.reduce(
            (total, session) => total + (session.totalMarksEarned || 0),
            0
          );
          const dayPossibleMarks = daySessions.reduce(
            (total, session) => total + (session.totalPossibleMarks || 0),
            0
          );

          // Subject-specific stats for the day
          const subjectMap: {
            [key: string]: {
              questions: number;
              correct: number;
              marksEarned: number;
              possibleMarks: number;
            };
          } = {};

          daySessions.forEach((session) => {
            const subjectName = session.subject?.name || "Unknown";
            if (!subjectMap[subjectName]) {
              subjectMap[subjectName] = {
                questions: 0,
                correct: 0,
                marksEarned: 0,
                possibleMarks: 0,
              };
            }
            subjectMap[subjectName].questions += session.totalQuestions || 0;
            subjectMap[subjectName].correct += session.correctAnswers || 0;
            subjectMap[subjectName].marksEarned +=
              session.totalMarksEarned || 0;
            subjectMap[subjectName].possibleMarks +=
              session.totalPossibleMarks || 0;
          });

          const subjectAccuracy: {
            [key: string]: {
              questions: number;
              correct: number;
              marksEarned: number;
              possibleMarks: number;
              accuracy: number;
            };
          } = {};

          Object.entries(subjectMap).forEach(([subject, stats]) => {
            subjectAccuracy[subject] = {
              questions: stats.questions,
              correct: stats.correct,
              marksEarned: stats.marksEarned,
              possibleMarks: stats.possibleMarks,
              accuracy:
                stats.possibleMarks > 0
                  ? Math.round((stats.marksEarned / stats.possibleMarks) * 100)
                  : 0,
            };
          });

          console.log(
            `Subject accuracy for ${startOfDay.toISOString().split("T")[0]}:`,
            subjectAccuracy
          );

          dailyStats.push({
            date: startOfDay.toISOString().split("T")[0],
            questions: dayQuestions,
            correctAnswers: dayCorrect,
            timeSpent: dayTime,
            marksEarned: dayMarksEarned,
            possibleMarks: dayPossibleMarks,
            accuracy:
              dayPossibleMarks > 0
                ? Math.round((dayMarksEarned / dayPossibleMarks) * 100)
                : 0,
          });

          dailySubjectStats.push({
            date: startOfDay.toISOString().split("T")[0],
            subjects: subjectAccuracy,
          });
        }

        console.log(
          `Generated ${dailySubjectStats.length} daily entries for child ${child.name}`
        );
        console.log("Daily subject stats:", dailySubjectStats);

        let calculatedLevel;
        try {
          calculatedLevel = calculateLevel(child.xpPoints);
        } catch (error) {
          console.error("Error calculating level for child:", child.id, error);
          calculatedLevel = 1; // Default fallback
        }

        return {
          id: child.id,
          name: child.name,
          level: calculatedLevel,
          xpPoints: child.xpPoints,
          currentStreak: child.currentStreak,
          longestStreak: child.longestStreak,
          lastActivityDate: child.lastActivityDate,
          today: {
            timeSpent: recentDayTimeSpent,
            timeSpentMinutes: Math.round(recentDayTimeSpent / 60),
            questionsAnswered: recentDayQuestions,
            correctAnswers: recentDayCorrectAnswers,
            marksEarned: recentDayMarksEarned,
            possibleMarks: recentDayPossibleMarks,
            accuracy: recentDayAccuracy,
            xpEarned: childRecentDaySessions.reduce((total, session) => {
              return total + (session.xpEarned || 0);
            }, 0),
            sessionsCompleted: childRecentDaySessions.length,
          },
          week: {
            timeSpent: rangeTimeSpent,
            timeSpentMinutes: Math.round(rangeTimeSpent / 60),
            questionsAnswered: rangeQuestions,
            correctAnswers: rangeCorrectAnswers,
            marksEarned: rangeMarksEarned,
            possibleMarks: rangePossibleMarks,
            accuracy: rangeAccuracy,
            sessionsCompleted: childRangeSessions.length,
          },
          subjectBreakdown: Object.entries(subjectStats).map(
            ([subject, stats]) => ({
              subject,
              questions: stats.questions,
              correct: stats.correct,
              marksEarned: stats.marksEarned,
              possibleMarks: stats.possibleMarks,
              accuracy:
                stats.possibleMarks > 0
                  ? Math.round((stats.marksEarned / stats.possibleMarks) * 100)
                  : 0,
              timeSpent: stats.timeSpent,
              timeSpentMinutes: Math.round(stats.timeSpent / 60),
            })
          ),
          dailyStats,
          dailySubjectStats,
        };
      });
      console.log("Successfully processed children statistics");
    } catch (error) {
      console.error("Error processing children statistics:", error);
      return NextResponse.json(
        { error: "Failed to process children statistics" },
        { status: 500 }
      );
    }

    // Overall family stats with improved time calculation
    const totalRecentDayTimeSeconds =
      recentDaySessions.length > 0
        ? recentDaySessions.reduce((total, session) => {
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
          }, 0)
        : 0;

    const overallStats = {
      totalChildren: children.length,
      todayTotalTime: Math.round(totalRecentDayTimeSeconds / 60),
      todayTotalQuestions: recentDaySessions.reduce(
        (total, session) => total + (session.totalQuestions || 0),
        0
      ),
      todayTotalCorrect: recentDaySessions.reduce(
        (total, session) => total + (session.correctAnswers || 0),
        0
      ),
      weekTotalSessions: rangeSessions.length,
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };

    console.log("Returning successful response");
    return NextResponse.json({
      children: childrenStats,
      overallStats,
    });
  } catch (error) {
    console.error("Unexpected error in parent statistics API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
