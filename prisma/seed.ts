// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// IMPORTANT: Define the ID of your "Mathematics" subject.
// Query your database if unsure: SELECT id FROM "Subject" WHERE name = 'Mathematics';
const MATHEMATICS_SUBJECT_ID = 1; // <--- CHANGE THIS IF YOUR MATH SUBJECT ID IS DIFFERENT

async function main() {
  console.log(
    `Starting seed process for Mathematics (Subject ID: ${MATHEMATICS_SUBJECT_ID})...`
  );

  // Verify Mathematics subject exists
  const mathSubject = await prisma.subject.findUnique({
    where: { id: MATHEMATICS_SUBJECT_ID },
  });

  if (!mathSubject) {
    console.error(
      `Mathematics subject with ID ${MATHEMATICS_SUBJECT_ID} not found. Please create it first or update the ID in this script.`
    );
    return;
  }

  // 1. Delete all existing topics for the Mathematics subject
  // This is a destructive action. Ensure this is what you want for a clean slate.
  // Make sure no questions are currently relying on these old topic IDs without a plan to remap them.
  // For this step, we are assuming the remapping will happen in a separate script AFTER this seed runs
  // and creates the new standard topic IDs.
  // If you want to remap first, then delete, the order of operations would be different.
  // Given your request "remove the existing topics", this will do that.
  console.log(
    `Deleting existing topics for Mathematics (Subject ID: ${MATHEMATICS_SUBJECT_ID})...`
  );
  const deletedTopics = await prisma.topic.deleteMany({
    where: {
      subjectId: MATHEMATICS_SUBJECT_ID,
    },
  });
  console.log(`Deleted ${deletedTopics.count} existing Mathematics topics.`);

  // 2. Create the 7 new standard Mathematics topics
  console.log("Creating new standardized Mathematics Topics...");
  const standardizedMathTopicsData = [
    {
      name: "Numbers",
      description:
        "Concepts of whole numbers, fractions, decimals, number theory, and their operations.",
    },
    {
      name: "Measurement",
      description:
        "Units and calculations for length, mass, volume, time, money, area, and perimeter.",
    },
    {
      name: "Statistics",
      description:
        "Data representation (graphs, charts) and interpretation, including average.",
    },
    {
      name: "Geometry",
      description:
        "Properties of shapes, angles, symmetry, circles, and spatial reasoning.",
    },
    {
      name: "Ratio and Percentage",
      description:
        "Understanding and applying ratios, proportions, and percentages.",
    },
    {
      name: "Rate and Speed",
      description:
        "Solving problems involving rate, speed, distance, and time.",
    },
    {
      name: "Algebra",
      description:
        "Basic algebraic expressions, manipulations, and solving simple equations.",
    },
  ];

  const newStandardTopics: { name: string; id: number }[] = [];
  for (const topicData of standardizedMathTopicsData) {
    const newTopic = await prisma.topic.create({
      data: {
        name: topicData.name,
        description: topicData.description,
        subjectId: MATHEMATICS_SUBJECT_ID,
      },
    });
    newStandardTopics.push({ name: newTopic.name, id: newTopic.id });
    console.log(`Created topic: ${newTopic.name} (ID: ${newTopic.id})`);
  }

  console.log("\nNew Standard Mathematics Topics Created:");
  newStandardTopics.forEach((t) =>
    console.log(`- Name: ${t.name}, ID: ${t.id}`)
  );
  console.log(
    "\nIMPORTANT: Note these new Topic IDs for remapping your questions!"
  );

  console.log("Seeding of standard Mathematics topics completed.");
}

main()
  .catch(async (e) => {
    console.error("Error during seeding:", e);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
