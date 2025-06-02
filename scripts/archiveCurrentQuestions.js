// scripts/archiveCurrentQuestions.js
// Run this script from the root of your project: node scripts/archiveCurrentQuestions.js
// Ensure your .env file is in the root and contains DATABASE_URL

// Since this is a .js file, we can't use direct TypeScript enum imports for validation in the same way.
// We'll rely on Prisma's generated client to handle enum values correctly during creation,
// or perform string comparisons if we had the enum values available as JS objects.
// For simplicity, this version assumes Prisma client handles enum validation on create.
// If stricter validation is needed in JS, you'd define the enum values as JS constants.

const { PrismaClient } = require('../src/generated/prisma'); // Adjust path if your script is elsewhere
const prisma = new PrismaClient();

// For JS validation, you'd typically define your enums like this if needed:
const QuestionTypeEnum = {
  MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
  FILL_IN_THE_BLANK: 'FILL_IN_THE_BLANK',
  OPEN_ENDED: 'OPEN_ENDED',
  MULTI_PART: 'MULTI_PART',
};

const DifficultyLevelEnum = {
  EASY: 'EASY',
  MEDIUM: 'MEDIUM',
  HARD: 'HARD',
  VERY_HARD: 'VERY_HARD',
};


async function main() {
  console.log('Starting archival process for questions...');

  const liveQuestions = await prisma.question.findMany({
    where: {
      archivedVersion: null, // Only select questions that don't have an archive yet
    },
    // Select all fields needed for the archive table
    select: {
      id: true,
      pdfPageNumber: true,
      questionNumberOnPage: true,
      text: true,
      questionType: true,
      options: true,
      correctAnswer: true,
      answerKeyRawText: true,
      explanation: true,
      hint: true,
      marks: true,
      difficulty: true,
      pointsAwarded: true,
      subjectId: true,
      topicId: true,
      questionGroupId: true,
      imageUrl: true,
      fullPageImageUrl: true,
      audioUrl: true,
      sourceYear: true,
      sourceLevel: true,
      sourceSchool: true,
      sourceAssessmentType: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (liveQuestions.length === 0) {
    console.log('No new live questions to archive.');
    await prisma.$disconnect();
    return;
  }

  console.log(`Found ${liveQuestions.length} live questions to potentially archive.`);

  let archivedCount = 0;
  let skippedCount = 0;

  for (const lq of liveQuestions) {
    try {
      const existingArchive = await prisma.archivedOriginalQuestion.findUnique({
        where: { liveQuestionId: lq.id },
      });

      if (existingArchive) {
        console.warn(`Archive for Live Question ID: ${lq.id} already exists. Skipping.`);
        skippedCount++;
        continue;
      }

      // JavaScript-friendly enum validation (optional, Prisma client usually handles this)
      // This is more for explicit checking if you want to be sure before sending to Prisma
      const validQuestionType = Object.values(QuestionTypeEnum).includes(lq.questionType)
        ? lq.questionType
        : QuestionTypeEnum.MULTIPLE_CHOICE; // Default

      const validDifficulty = Object.values(DifficultyLevelEnum).includes(lq.difficulty)
        ? lq.difficulty
        : DifficultyLevelEnum.MEDIUM; // Default

      await prisma.archivedOriginalQuestion.create({
        data: {
          liveQuestionId: lq.id,
          pdfPageNumber: lq.pdfPageNumber,
          questionNumberOnPage: lq.questionNumberOnPage,
          text: lq.text,
          questionType: validQuestionType, // Use validated or original lq.questionType
          options: lq.options,
          correctAnswer: lq.correctAnswer,
          answerKeyRawText: lq.answerKeyRawText,
          explanation: lq.explanation,
          hint: lq.hint,
          marks: lq.marks,
          difficulty: validDifficulty, // Use validated or original lq.difficulty
          pointsAwarded: lq.pointsAwarded,
          subjectId: lq.subjectId,
          topicId: lq.topicId,
          questionGroupId: lq.questionGroupId,
          imageUrl: lq.imageUrl,
          fullPageImageUrl: lq.fullPageImageUrl,
          audioUrl: lq.audioUrl,
          sourceYear: lq.sourceYear,
          sourceLevel: lq.sourceLevel,
          sourceSchool: lq.sourceSchool,
          sourceAssessmentType: lq.sourceAssessmentType,
        },
      });
      archivedCount++;
      console.log(`Archived Question with Live ID: ${lq.id}`);
    } catch (error) {
      // Prisma error codes are strings. P2002 is for unique constraint violation.
      if (error.code === 'P2002' && error.meta && error.meta.target && error.meta.target.includes('liveQuestionId')) {
        console.warn(`Archive for Live Question ID: ${lq.id} already exists (caught by DB constraint). Skipping.`);
        skippedCount++;
      } else {
        console.error(`Failed to archive Question with Live ID: ${lq.id}. Error:`, error);
      }
    }
  }

  console.log(`\nArchival process complete.`);
  console.log(`Successfully archived ${archivedCount} new questions.`);
  if (skippedCount > 0) {
    console.log(`Skipped ${skippedCount} questions as archives already existed.`);
  }
}

main()
  .catch(async (e) => {
    console.error("An error occurred during the archival script:", e);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('Disconnected from database.');
  });