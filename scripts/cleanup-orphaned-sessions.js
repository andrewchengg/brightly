/**
 * Cleanup Orphaned Practice Sessions
 *
 * This script removes practice sessions that have been in IN_PROGRESS status
 * for more than 24 hours without any recent student answers, indicating they
 * were likely abandoned when the exit functionality wasn't working properly.
 */

const { PrismaClient } = require("../src/generated/prisma");

const prisma = new PrismaClient();

async function cleanupOrphanedSessions() {
  try {
    console.log("🔍 Checking for orphaned practice sessions...");

    // Find sessions that are IN_PROGRESS for more than 24 hours
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 24);

    const orphanedSessions = await prisma.practiceSession.findMany({
      where: {
        status: "IN_PROGRESS",
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
      console.log("✅ No orphaned sessions found!");
      return;
    }

    // Filter sessions that haven't had activity in the last 24 hours
    const trulyOrphanedSessions = orphanedSessions.filter((session) => {
      if (session.studentAnswers.length === 0) {
        return true; // No answers at all, definitely orphaned
      }

      const lastAnswerTime = new Date(session.studentAnswers[0].attemptedAt);
      const hoursSinceLastAnswer =
        (Date.now() - lastAnswerTime.getTime()) / (1000 * 60 * 60);

      return hoursSinceLastAnswer > 24;
    });

    console.log(
      `🗑️ Found ${trulyOrphanedSessions.length} truly orphaned sessions to clean up`
    );

    if (trulyOrphanedSessions.length === 0) {
      console.log("✅ No truly orphaned sessions found!");
      return;
    }

    // Show sessions that will be deleted
    console.log("\n📋 Sessions to be deleted:");
    trulyOrphanedSessions.forEach((session, index) => {
      const hoursAge = Math.round(
        (Date.now() - new Date(session.startTime).getTime()) / (1000 * 60 * 60)
      );
      console.log(
        `${index + 1}. Session ${session.id} - ${
          session.title
        } (${hoursAge}h old, Student: ${session.studentId})`
      );
    });

    // Ask for confirmation in production, auto-confirm in development
    const isProduction = process.env.NODE_ENV === "production";
    let proceed = !isProduction;

    if (isProduction) {
      const readline = require("readline");
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await new Promise((resolve) => {
        rl.question(
          "\n⚠️ Are you sure you want to delete these sessions? (yes/no): ",
          resolve
        );
      });

      proceed = answer.toLowerCase() === "yes";
      rl.close();
    }

    if (!proceed) {
      console.log("❌ Cleanup cancelled");
      return;
    }

    // Delete the orphaned sessions
    const sessionIds = trulyOrphanedSessions.map((s) => s.id);

    console.log("\n🗑️ Deleting orphaned sessions...");

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
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup if this script is executed directly
if (require.main === module) {
  cleanupOrphanedSessions()
    .then(() => {
      console.log("\n🎉 Cleanup completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Cleanup failed:", error);
      process.exit(1);
    });
}

module.exports = { cleanupOrphanedSessions };
