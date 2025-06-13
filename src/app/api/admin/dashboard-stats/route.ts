import { NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Get basic counts
    const [
      totalStudents,
      totalParents,
      totalAdmins,
      totalQuestions,
      totalSubjects,
      totalTopics,
      totalQuestionGroups,
    ] = await Promise.all([
      prisma.student.count(),
      prisma.parent.count(),
      prisma.admin.count(),
      prisma.question.count(),
      prisma.subject.count(),
      prisma.topic.count(),
      prisma.questionGroup.count(),
    ]);

    // Get question status breakdown
    const questionStatusBreakdown = await prisma.question.groupBy({
      by: ["productionReady", "isRefactored"],
      _count: {
        id: true,
      },
    });

    // Transform question status data
    const questionStats = {
      ready: 0,
      productionNeedsRefactor: 0,
      needsReview: 0,
      total: totalQuestions,
    };

    questionStatusBreakdown.forEach((item) => {
      if (item.productionReady && item.isRefactored) {
        questionStats.ready = item._count.id;
      } else if (item.productionReady && !item.isRefactored) {
        questionStats.productionNeedsRefactor = item._count.id;
      } else {
        questionStats.needsReview = item._count.id;
      }
    });

    // Get questions by subject
    const questionsBySubject = await prisma.subject.findMany({
      include: {
        _count: {
          select: {
            questions: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Get questions by difficulty
    const questionsByDifficulty = await prisma.question.groupBy({
      by: ["difficulty"],
      _count: {
        id: true,
      },
    });

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [recentStudents, recentQuestions, recentPracticeSessions] =
      await Promise.all([
        prisma.student.count({
          where: {
            createdAt: {
              gte: thirtyDaysAgo,
            },
          },
        }),
        prisma.question.count({
          where: {
            createdAt: {
              gte: thirtyDaysAgo,
            },
          },
        }),
        prisma.practiceSession.count({
          where: {
            createdAt: {
              gte: thirtyDaysAgo,
            },
          },
        }),
      ]);

    // Get practice session stats
    const practiceSessionStats = await prisma.practiceSession.groupBy({
      by: ["status"],
      _count: {
        id: true,
      },
    });

    // Get student registration over time (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const studentRegistrationTrendRaw = (await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', "createdAt") as month,
        COUNT(*) as count
      FROM "Student"
      WHERE "createdAt" >= ${twelveMonthsAgo}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month ASC
    `) as Array<{ month: Date; count: bigint }>;

    // Convert BigInt to number for JSON serialization
    const studentRegistrationTrend = studentRegistrationTrendRaw.map(
      (item) => ({
        month: item.month.toISOString(),
        count: Number(item.count),
      })
    );

    // Get top performing students (by XP)
    const topStudents = await prisma.student.findMany({
      select: {
        id: true,
        name: true,
        xpPoints: true,
        level: true,
      },
      orderBy: {
        xpPoints: "desc",
      },
      take: 5,
    });

    return NextResponse.json({
      users: {
        students: totalStudents,
        parents: totalParents,
        admins: totalAdmins,
      },
      content: {
        questions: totalQuestions,
        subjects: totalSubjects,
        topics: totalTopics,
        questionGroups: totalQuestionGroups,
      },
      questionStats,
      questionsBySubject: questionsBySubject.map((subject) => ({
        name: subject.name,
        count: subject._count.questions,
      })),
      questionsByDifficulty: questionsByDifficulty.map((item) => ({
        difficulty: item.difficulty,
        count: item._count.id,
      })),
      recentActivity: {
        newStudents: recentStudents,
        newQuestions: recentQuestions,
        practiceSessions: recentPracticeSessions,
      },
      practiceSessionStats: practiceSessionStats.map((item) => ({
        status: item.status,
        count: item._count.id,
      })),
      studentRegistrationTrend,
      topStudents,
    });
  } catch (error: any) {
    console.error("API: Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard statistics", details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
