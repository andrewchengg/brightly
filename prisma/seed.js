// prisma/seed.js
const { PrismaClient } = require('../src/generated/prisma'); // Path from prisma folder to generated client
// Or, if run from project root (e.g. `node prisma/seed.js`):
// const { PrismaClient } = require('./src/generated/prisma'); 

const prisma = new PrismaClient();

// IMPORTANT: Define the ID of your "Mathematics" subject.
// Query your database if unsure: SELECT id FROM "Subject" WHERE name = 'Mathematics';
// If your Math subject was created by a previous seed, its ID might be 1 or similar.
// If you are creating it here for the first time, this ID will be used.
const MATHEMATICS_SUBJECT_ID = 1; // <--- ADJUST THIS IF YOUR MATH SUBJECT ID IS DIFFERENT OR IF CREATING IT HERE

async function main() {
  console.log(`Starting seed process...`);

  // Upsert Mathematics subject to ensure it exists
  const mathSubject = await prisma.subject.upsert({
    where: { id: MATHEMATICS_SUBJECT_ID }, // Or use where: { name: "Mathematics" } if ID is auto-gen and you want to ensure name uniqueness
    update: { name: "Mathematics" },
    create: {
      id: MATHEMATICS_SUBJECT_ID, // Only if you are manually setting IDs for subjects
      name: "Mathematics",
    },
  });
  console.log(`Ensured Mathematics subject exists with ID: ${mathSubject.id}`);
  
  // Use the actual ID from the upserted/found mathSubject
  const actualMathSubjectId = mathSubject.id;


  // 1. Delete all existing topics for the Mathematics subject
  console.log(`Deleting existing topics for Mathematics (Subject ID: ${actualMathSubjectId})...`);
  const deletedTopics = await prisma.topic.deleteMany({
    where: {
      subjectId: actualMathSubjectId,
    },
  });
  console.log(`Deleted ${deletedTopics.count} existing Mathematics topics.`);

  // 2. Create the 7 new standard Mathematics topics
  console.log("Creating new standardized Mathematics Topics...");
  const standardizedMathTopicsData = [
    { name: "Numbers", description: "Concepts of whole numbers, fractions, decimals, number theory, and their operations." },
    { name: "Measurement", description: "Units and calculations for length, mass, volume, time, money, area, and perimeter." },
    { name: "Statistics", description: "Data representation (graphs, charts) and interpretation, including average." },
    { name: "Geometry", description: "Properties of shapes, angles, symmetry, circles, and spatial reasoning." },
    { name: "Ratio and Percentage", description: "Understanding and applying ratios, proportions, and percentages." },
    { name: "Rate and Speed", description: "Solving problems involving rate, speed, distance, and time." },
    { name: "Algebra", description: "Basic algebraic expressions, manipulations, and solving simple equations." },
  ];

  const newStandardTopics = [];
  for (const topicData of standardizedMathTopicsData) {
    const newTopic = await prisma.topic.create({
      data: {
        name: topicData.name,
        description: topicData.description,
        subjectId: actualMathSubjectId, // Use the actual ID
      },
    });
    newStandardTopics.push({ name: newTopic.name, id: newTopic.id });
    console.log(`Created topic: ${newTopic.name} (ID: ${newTopic.id})`);
  }

  console.log("\nNew Standard Mathematics Topics Created:");
  newStandardTopics.forEach(t => console.log(`- Name: ${t.name}, ID: ${t.id}`));
  console.log("\nIMPORTANT: Note these new Topic IDs for remapping your questions in the next step!");

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