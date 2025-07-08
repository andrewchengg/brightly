const { PrismaClient } = require("../src/generated/prisma/client");

const prisma = new PrismaClient();

const sessionsToDelete = [
  "9b6fa919-337d-42ad-a02c-9b0659eb8291",
  "6cb7a7b1-debf-4a3d-ad3d-c13b36b13a9b",
  "6cc23332-9f9f-401e-8593-2ce12d0106d1",
  // ... more IDs will be added in next edit
];

async function deleteSpecificSessions() {
  try {
    console.log(
      `🔍 Preparing to delete ${sessionsToDelete.length} sessions...`
    );

    const deletedSessions = await prisma.practiceSession.deleteMany({
      where: {
        id: {
          in: sessionsToDelete,
        },
      },
    });

    console.log("\n📈 Summary:");
    console.log(`  ✅ Successfully deleted: ${deletedSessions.count} sessions`);
  } catch (error) {
    console.error("❌ Error during deletion:", error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteSpecificSessions();
