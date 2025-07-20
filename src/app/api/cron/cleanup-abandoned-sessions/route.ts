import { NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

export async function GET() {
  try {
    console.log("🔍 Running automated session cleanup...");

    // Find sessions that are IN_PROGRESS for more than 2 hours
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 2);

    const orphanedSessions = await prisma.practiceSession.findMany({
      where: {
        OR: [
          { status: "IN_PROGRESS" },
          { status: "PAUSED" }, // Legacy abandoned sessions
          { status: "ABANDONED" }, // New abandoned sessions
        ],
        startTime: {
          lt: cutoffTime,
        },
      },
      include: {
        studentAnswers: {
          orderBy: {
            attemptedAt: "desc",
          },
          take: 1,
        },
      },
    });

    console.log(
      `📊 Found ${orphanedSessions.length} potentially orphaned sessions`
    );

    if (orphanedSessions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No orphaned sessions found",
        deleted: 0,
      });
    }

    // Filter sessions that haven't had activity in the last 2 hours
    const trulyOrphanedSessions = orphanedSessions.filter((session) => {
      // ABANDONED sessions can be cleaned up immediately
      if (session.status === "ABANDONED") {
        return true;
      }

      // For PAUSED (legacy) and IN_PROGRESS sessions, check activity
      if (session.studentAnswers.length === 0) {
        return true; // No answers at all, definitely orphaned
      }

      const lastAnswerTime = new Date(session.studentAnswers[0].attemptedAt);
      const hoursSinceLastAnswer =
        (Date.now() - lastAnswerTime.getTime()) / (1000 * 60 * 60);

      return hoursSinceLastAnswer > 2;
    });

    console.log(
      `🗑️ Found ${trulyOrphanedSessions.length} truly orphaned sessions to clean up`
    );

    if (trulyOrphanedSessions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No truly orphaned sessions found",
        deleted: 0,
      });
    }

    // Delete the orphaned sessions
    const sessionIds = trulyOrphanedSessions.map((s) => s.id);

    // First delete related student answers
    const deletedAnswers = await prisma.studentAnswer.deleteMany({
      where: {
        practiceSessionId: {
          in: sessionIds,
        },
      },
    });

    console.log(`📝 Deleted ${deletedAnswers.count} related student answers`);

    // Then delete the sessions
    const deletedSessions = await prisma.practiceSession.deleteMany({
      where: {
        id: {
          in: sessionIds,
        },
      },
    });

    console.log(
      `✅ Successfully deleted ${deletedSessions.count} orphaned practice sessions`
    );

    return NextResponse.json({
      success: true,
      message: `Successfully cleaned up ${deletedSessions.count} orphaned sessions`,
      deleted: deletedSessions.count,
    });
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to cleanup orphaned sessions",
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
