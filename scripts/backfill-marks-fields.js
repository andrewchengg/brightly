// scripts/backfill-marks-fields.js
//
// Backfill totalMarksEarned and totalPossibleMarks for all COMPLETED practice sessions
// where either field is null. This ensures all sessions have correct marks fields populated.
//
// Usage:
//   node scripts/backfill-marks-fields.js
//
// Requires: Prisma Client, correct DB connection in .env

const { PrismaClient } = require("../src/generated/prisma");
const prisma = new PrismaClient();

async function main() {
  const sessions = await prisma.practiceSession.findMany({
    where: {
      status: "COMPLETED",
      OR: [{ totalMarksEarned: null }, { totalPossibleMarks: null }],
    },
    select: { id: true },
  });

  console.log(`Found ${sessions.length} sessions to backfill.`);

  for (const session of sessions) {
    const answers = await prisma.studentAnswer.findMany({
      where: { practiceSessionId: session.id },
      include: { question: true },
    });
    const totalMarksEarned = answers
      .filter((a) => a.isCorrect)
      .reduce((sum, a) => sum + (a.question?.marks || 0), 0);
    const totalPossibleMarks = answers.reduce(
      (sum, a) => sum + (a.question?.marks || 0),
      0
    );
    await prisma.practiceSession.update({
      where: { id: session.id },
      data: { totalMarksEarned, totalPossibleMarks },
    });
    console.log(
      `Updated session ${session.id}: ${totalMarksEarned}/${totalPossibleMarks}`
    );
  }

  await prisma.$disconnect();
  console.log("Backfill complete.");
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
