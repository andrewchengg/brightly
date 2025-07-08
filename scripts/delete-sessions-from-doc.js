const { PrismaClient } = require("../src/generated/prisma/client");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const prisma = new PrismaClient();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function deleteSessionsFromDoc() {
  try {
    console.log("📄 Reading SESSION_MANAGEMENT.md file...");

    // Read the documentation file
    const docPath = path.join(__dirname, "../docs/SESSION_MANAGEMENT.md");
    const docContent = fs.readFileSync(docPath, "utf8");

    // Extract UUIDs that come after "✅ Completed: "
    const completedPattern =
      /✅\s*Completed:\s*([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/g;
    const matches = [];
    let match;

    while ((match = completedPattern.exec(docContent)) !== null) {
      matches.push(match[1]); // match[1] is the captured UUID
    }

    if (matches.length === 0) {
      console.log(
        "❌ No session IDs found after '✅ Completed: ' in the document"
      );
      rl.close();
      return;
    }

    // Remove duplicates
    const uniqueSessionIds = [...new Set(matches)];

    console.log(
      `🔍 Found ${uniqueSessionIds.length} unique session IDs to delete:`
    );
    console.log("📋 Session IDs list:");

    // Show all UUIDs in groups of 10 for readability
    for (let i = 0; i < uniqueSessionIds.length; i += 10) {
      const group = uniqueSessionIds.slice(i, i + 10);
      console.log(
        `  ${i + 1}-${Math.min(i + 10, uniqueSessionIds.length)}: ${group.join(
          ", "
        )}`
      );
    }

    console.log(
      `\n📊 Total: ${uniqueSessionIds.length} sessions will be deleted`
    );

    // Ask for confirmation
    const confirmation = await askQuestion(
      "\n❓ Do you want to proceed with deleting these sessions? (yes/no): "
    );

    if (
      confirmation.toLowerCase() !== "yes" &&
      confirmation.toLowerCase() !== "y"
    ) {
      console.log("❌ Deletion cancelled by user.");
      rl.close();
      return;
    }

    console.log("\n🗑️  Deleting sessions from database...");

    // Delete all sessions with these IDs
    const deletedSessions = await prisma.practiceSession.deleteMany({
      where: {
        id: {
          in: uniqueSessionIds,
        },
      },
    });

    console.log("\n📈 Summary:");
    console.log(
      `  🔍 Found in document: ${uniqueSessionIds.length} unique session IDs`
    );
    console.log(`  ✅ Successfully deleted: ${deletedSessions.count} sessions`);
    console.log(
      `  📊 Difference: ${
        uniqueSessionIds.length - deletedSessions.count
      } (likely already deleted or non-existent)`
    );

    if (deletedSessions.count > 0) {
      console.log(
        "🎉 Sessions have been successfully deleted from the database!"
      );
    } else {
      console.log(
        "ℹ️  No sessions were deleted (they may have already been removed)"
      );
    }
  } catch (error) {
    console.error("❌ Error during deletion:", error);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

deleteSessionsFromDoc();
