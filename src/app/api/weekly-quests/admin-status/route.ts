import { NextResponse } from "next/server";
import { getQuestRotationStatus } from "@/lib/weekly-quest-scheduler";
import { PrismaClient } from "@/generated/prisma";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Get rotation status
    const rotationStatus = await getQuestRotationStatus();

    // Get overall quest system statistics
    const totalStudents = await prisma.student.count();
    const totalQuestDefinitions = await prisma.quest.count();

    // Get all-time quest completion stats
    const allTimeStats = await prisma.studentQuest.aggregate({
      _count: {
        id: true,
      },
    });

    const completedAllTime = await prisma.studentQuest.count({
      where: { isCompleted: true },
    });

    // Get students by level
    const studentLevels = await prisma.student.groupBy({
      by: ["level"],
      _count: {
        id: true,
      },
      orderBy: {
        level: "asc",
      },
    });

    // Get quest completion by category (using join query instead)
    const categoryStats = await prisma.quest.groupBy({
      by: ["category"],
      _count: {
        id: true,
      },
      where: {
        studentQuests: {
          some: {
            isCompleted: true,
          },
        },
      },
    });

    // Get recent quest activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentActivity = await prisma.studentQuest.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
    });

    const recentCompletions = await prisma.studentQuest.count({
      where: {
        completedAt: {
          gte: sevenDaysAgo,
        },
      },
    });

    // Get top performing students this week
    const weekStart = new Date();
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);

    const topStudentsThisWeek = await prisma.studentQuest.groupBy({
      by: ["studentId"],
      where: {
        isCompleted: true,
        weekStart: {
          gte: weekStart,
          lt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 5,
    });

    // Get student usernames for top performers
    const topStudentIds = topStudentsThisWeek.map((s) => s.studentId);
    const topStudentDetails = await prisma.student.findMany({
      where: {
        id: {
          in: topStudentIds,
        },
      },
      select: {
        id: true,
        username: true,
        level: true,
      },
    });

    const topPerformers = topStudentsThisWeek.map((stat) => {
      const student = topStudentDetails.find((s) => s.id === stat.studentId);
      return {
        studentId: stat.studentId,
        username: student?.username || "Unknown",
        level: student?.level || 1,
        completedQuests: stat._count.id,
      };
    });

    return NextResponse.json({
      success: true,
      rotationStatus,
      systemStats: {
        totalStudents,
        totalQuestDefinitions,
        totalQuestsAssigned: allTimeStats._count.id,
        totalQuestsCompleted: completedAllTime,
        completionRate:
          allTimeStats._count.id > 0
            ? Math.round((completedAllTime / allTimeStats._count.id) * 100)
            : 0,
      },
      studentLevels: studentLevels.map((sl) => ({
        level: sl.level,
        count: sl._count.id,
      })),
      recentActivity: {
        questsAssignedLast7Days: recentActivity,
        questsCompletedLast7Days: recentCompletions,
        activityRate:
          recentActivity > 0
            ? Math.round((recentCompletions / recentActivity) * 100)
            : 0,
      },
      topPerformersThisWeek: topPerformers,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting admin quest status:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get admin status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
