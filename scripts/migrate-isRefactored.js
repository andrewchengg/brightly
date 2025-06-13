const { PrismaClient } = require("../src/generated/prisma");

const prisma = new PrismaClient();

async function addIsRefactoredField() {
  console.log("🚀 Starting migration to add isRefactored field...");

  try {
    // First, let's check how many questions we have and their current productionReady status
    const totalQuestions = await prisma.question.count();
    const productionReadyCount = await prisma.question.count({
      where: { productionReady: true },
    });
    const notProductionReadyCount = await prisma.question.count({
      where: { productionReady: false },
    });

    console.log(`📊 Current database status:`);
    console.log(`   Total questions: ${totalQuestions}`);
    console.log(`   productionReady = true: ${productionReadyCount}`);
    console.log(`   productionReady = false: ${notProductionReadyCount}`);

    if (totalQuestions === 0) {
      console.log("❌ No questions found in database. Nothing to migrate.");
      return;
    }

    // Update questions where productionReady = true to have isRefactored = true
    console.log(
      "\n🔄 Setting isRefactored = true for productionReady = true questions..."
    );
    const updateTrueResult = await prisma.question.updateMany({
      where: { productionReady: true },
      data: { isRefactored: true },
    });
    console.log(
      `✅ Updated ${updateTrueResult.count} questions to isRefactored = true`
    );

    // Update questions where productionReady = false to have isRefactored = false
    console.log(
      "\n🔄 Setting isRefactored = false for productionReady = false questions..."
    );
    const updateFalseResult = await prisma.question.updateMany({
      where: { productionReady: false },
      data: { isRefactored: false },
    });
    console.log(
      `✅ Updated ${updateFalseResult.count} questions to isRefactored = false`
    );

    // Verify the migration
    console.log("\n🔍 Verifying migration results...");
    const verifyTrueCount = await prisma.question.count({
      where: {
        productionReady: true,
        isRefactored: true,
      },
    });
    const verifyFalseCount = await prisma.question.count({
      where: {
        productionReady: false,
        isRefactored: false,
      },
    });

    console.log(`📊 Verification results:`);
    console.log(
      `   Questions with productionReady = true AND isRefactored = true: ${verifyTrueCount}`
    );
    console.log(
      `   Questions with productionReady = false AND isRefactored = false: ${verifyFalseCount}`
    );
    console.log(
      `   Total verified: ${
        verifyTrueCount + verifyFalseCount
      }/${totalQuestions}`
    );

    if (verifyTrueCount + verifyFalseCount === totalQuestions) {
      console.log(
        "✅ Migration completed successfully! All questions have been updated."
      );
    } else {
      console.log(
        "⚠️  Warning: Some questions may not have been updated correctly."
      );
    }
  } catch (error) {
    console.error("❌ Error during migration:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
addIsRefactoredField()
  .then(() => {
    console.log("🎉 Migration script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Migration script failed:", error);
    process.exit(1);
  });
