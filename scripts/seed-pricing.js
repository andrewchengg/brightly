const { PrismaClient } = require("../src/generated/prisma");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding pricing plans...");

  try {
    // Clean up any duplicate Math subjects (keep only ID 1)
    const duplicateMath = await prisma.subject.findMany({
      where: {
        name: "Math",
        id: { not: 1 },
      },
    });

    if (duplicateMath.length > 0) {
      console.log(
        `🧹 Cleaning up ${duplicateMath.length} duplicate Math subject(s)...`
      );
      for (const duplicate of duplicateMath) {
        // Delete any SubjectPlan associated with duplicate
        await prisma.subjectPlan.deleteMany({
          where: { subjectId: duplicate.id },
        });
        // Delete the duplicate subject
        await prisma.subject.delete({
          where: { id: duplicate.id },
        });
        console.log(`🗑️ Removed duplicate Math subject (ID: ${duplicate.id})`);
      }
    }
    // Use existing Math subject (ID: 1)
    let mathSubject = await prisma.subject.findUnique({
      where: { id: 1 },
    });

    if (!mathSubject) {
      console.log(
        "❌ Math subject (ID: 1) not found! Please check your database."
      );
      throw new Error("Math subject with ID 1 not found");
    } else {
      console.log(
        `✅ Found existing Math subject (ID: ${mathSubject.id}, Name: ${mathSubject.name})`
      );
    }

    // Use existing Chinese subject (ID: 4)
    let chineseSubject = await prisma.subject.findUnique({
      where: { id: 4 },
    });

    if (!chineseSubject) {
      console.log(
        "❌ Chinese subject (ID: 4) not found! Please check your database."
      );
      throw new Error("Chinese subject with ID 4 not found");
    } else {
      console.log(
        `✅ Found existing Chinese subject (ID: ${chineseSubject.id}, Name: ${chineseSubject.name})`
      );
    }

    // Create or update Math pricing plan ($20/month)
    const mathPlan = await prisma.subjectPlan.upsert({
      where: { subjectId: mathSubject.id },
      update: {
        monthlyPrice: 20.0,
        yearlyPrice: 200.0,
        updatedAt: new Date(),
      },
      create: {
        subjectId: mathSubject.id,
        name: "Math Practice Plan",
        description:
          "Access to all Math practice sessions, mock exams, and AI tutoring",
        monthlyPrice: 20.0,
        yearlyPrice: 200.0,
        features: [
          "Unlimited practice sessions",
          "Mock exams",
          "AI tutoring",
          "Progress tracking",
          "Weekly challenges",
        ],
        isActive: true,
      },
    });
    console.log("💰 Math pricing plan: $20/month");

    // Create or update Chinese pricing plan ($40/month)
    const chinesePlan = await prisma.subjectPlan.upsert({
      where: { subjectId: chineseSubject.id },
      update: {
        monthlyPrice: 40.0,
        yearlyPrice: 400.0,
        updatedAt: new Date(),
      },
      create: {
        subjectId: chineseSubject.id,
        name: "Chinese Practice Plan",
        description:
          "Access to all Chinese practice sessions, oral practice, and AI tutoring",
        monthlyPrice: 40.0,
        yearlyPrice: 400.0,
        features: [
          "Unlimited practice sessions",
          "Oral practice",
          "Listening comprehension",
          "AI tutoring",
          "Progress tracking",
          "Weekly challenges",
        ],
        isActive: true,
      },
    });
    console.log("💰 Chinese pricing plan: $40/month");

    console.log("\n🎉 Pricing plans seeded successfully!");
    console.log(`📊 Math Subject ID: ${mathSubject.id} - $20/month`);
    console.log(`📊 Chinese Subject ID: ${chineseSubject.id} - $40/month`);
  } catch (error) {
    console.error("❌ Error seeding pricing plans:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
