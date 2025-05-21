const { PrismaClient, QuestionType, DifficultyLevel } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Clear existing questions
  await prisma.question.deleteMany({});

  // Create Mathematics subject if it doesn't exist
  const mathSubject = await prisma.subject.upsert({
    where: { name: 'Mathematics' },
    update: {},
    create: {
      name: 'Mathematics',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  // Create topics if they don't exist
  const topics = await Promise.all([
    prisma.topic.upsert({
      where: {
        name_subjectId: {
          name: 'Numbers and Operations',
          subjectId: mathSubject.id
        }
      },
      update: {},
      create: {
        name: 'Numbers and Operations',
        subjectId: mathSubject.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }),
    prisma.topic.upsert({
      where: {
        name_subjectId: {
          name: 'Algebra',
          subjectId: mathSubject.id
        }
      },
      update: {},
      create: {
        name: 'Algebra',
        subjectId: mathSubject.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }),
    prisma.topic.upsert({
      where: {
        name_subjectId: {
          name: 'Geometry',
          subjectId: mathSubject.id
        }
      },
      update: {},
      create: {
        name: 'Geometry',
        subjectId: mathSubject.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
  ]);

  // Paper 1 Questions
  const paper1Questions = [
    // 10 MCQ questions worth 1 mark each
    ...Array(10).fill().map((_, i) => ({
      text: `MCQ 1 Mark Question ${i + 1}`,
      questionType: QuestionType.MULTIPLE_CHOICE,
      options: [
        { id: 'a', text: 'Option A' },
        { id: 'b', text: 'Option B' },
        { id: 'c', text: 'Option C' },
        { id: 'd', text: 'Option D' }
      ],
      correctAnswer: { id: 'a', text: 'Option A' },
      explanation: `Explanation for MCQ 1 Mark Question ${i + 1}`,
      difficulty: DifficultyLevel.MEDIUM,
      topicId: topics[i % 3].id,
      subjectId: mathSubject.id,
      marks: 1,
      pointsAwarded: 10,
      hint: `Hint for MCQ 1 Mark Question ${i + 1}`,
      pdfPageNumber: 1,
      questionNumberOnPage: `${i + 1}`,
      createdAt: new Date(),
      updatedAt: new Date()
    })),

    // 5 MCQ questions worth 2 marks each
    ...Array(5).fill().map((_, i) => ({
      text: `MCQ 2 Mark Question ${i + 1}`,
      questionType: QuestionType.MULTIPLE_CHOICE,
      options: [
        { id: 'a', text: 'Option A' },
        { id: 'b', text: 'Option B' },
        { id: 'c', text: 'Option C' },
        { id: 'd', text: 'Option D' }
      ],
      correctAnswer: { id: 'a', text: 'Option A' },
      explanation: `Explanation for MCQ 2 Mark Question ${i + 1}`,
      difficulty: DifficultyLevel.MEDIUM,
      topicId: topics[i % 3].id,
      subjectId: mathSubject.id,
      marks: 2,
      pointsAwarded: 20,
      hint: `Hint for MCQ 2 Mark Question ${i + 1}`,
      pdfPageNumber: 1,
      questionNumberOnPage: `${i + 11}`,
      createdAt: new Date(),
      updatedAt: new Date()
    })),

    // 5 Short answer questions worth 1 mark each
    ...Array(5).fill().map((_, i) => ({
      text: `Short Answer 1 Mark Question ${i + 1}`,
      questionType: QuestionType.OPEN_ENDED,
      correctAnswer: 'Answer',
      explanation: `Explanation for Short Answer 1 Mark Question ${i + 1}`,
      difficulty: DifficultyLevel.MEDIUM,
      topicId: topics[i % 3].id,
      subjectId: mathSubject.id,
      marks: 1,
      pointsAwarded: 10,
      hint: `Hint for Short Answer 1 Mark Question ${i + 1}`,
      pdfPageNumber: 2,
      questionNumberOnPage: `${i + 1}`,
      createdAt: new Date(),
      updatedAt: new Date()
    })),

    // 10 Short answer questions worth 2 marks each
    ...Array(10).fill().map((_, i) => ({
      text: `Short Answer 2 Mark Question ${i + 1}`,
      questionType: QuestionType.OPEN_ENDED,
      correctAnswer: 'Answer',
      explanation: `Explanation for Short Answer 2 Mark Question ${i + 1}`,
      difficulty: DifficultyLevel.MEDIUM,
      topicId: topics[i % 3].id,
      subjectId: mathSubject.id,
      marks: 2,
      pointsAwarded: 20,
      hint: `Hint for Short Answer 2 Mark Question ${i + 1}`,
      pdfPageNumber: 2,
      questionNumberOnPage: `${i + 6}`,
      createdAt: new Date(),
      updatedAt: new Date()
    }))
  ];

  // Paper 2 Questions
  const paper2Questions = [
    // 5 Short answer questions worth 2 marks each
    ...Array(5).fill().map((_, i) => ({
      text: `Paper 2 Short Answer 2 Mark Question ${i + 1}`,
      questionType: QuestionType.OPEN_ENDED,
      correctAnswer: 'Answer',
      explanation: `Explanation for Paper 2 Short Answer 2 Mark Question ${i + 1}`,
      difficulty: DifficultyLevel.MEDIUM,
      topicId: topics[i % 3].id,
      subjectId: mathSubject.id,
      marks: 2,
      pointsAwarded: 20,
      hint: `Hint for Paper 2 Short Answer 2 Mark Question ${i + 1}`,
      pdfPageNumber: 3,
      questionNumberOnPage: `${i + 1}`,
      createdAt: new Date(),
      updatedAt: new Date()
    })),

    // 12 Long answer questions (mix of 3, 4, and 5 marks)
    ...Array(4).fill().map((_, i) => ({
      text: `Long Answer 3 Mark Question ${i + 1}`,
      questionType: QuestionType.OPEN_ENDED,
      correctAnswer: 'Answer',
      explanation: `Explanation for Long Answer 3 Mark Question ${i + 1}`,
      difficulty: DifficultyLevel.HARD,
      topicId: topics[i % 3].id,
      subjectId: mathSubject.id,
      marks: 3,
      pointsAwarded: 30,
      hint: `Hint for Long Answer 3 Mark Question ${i + 1}`,
      pdfPageNumber: 3,
      questionNumberOnPage: `${i + 6}`,
      createdAt: new Date(),
      updatedAt: new Date()
    })),
    ...Array(4).fill().map((_, i) => ({
      text: `Long Answer 4 Mark Question ${i + 1}`,
      questionType: QuestionType.OPEN_ENDED,
      correctAnswer: 'Answer',
      explanation: `Explanation for Long Answer 4 Mark Question ${i + 1}`,
      difficulty: DifficultyLevel.HARD,
      topicId: topics[i % 3].id,
      subjectId: mathSubject.id,
      marks: 4,
      pointsAwarded: 40,
      hint: `Hint for Long Answer 4 Mark Question ${i + 1}`,
      pdfPageNumber: 3,
      questionNumberOnPage: `${i + 10}`,
      createdAt: new Date(),
      updatedAt: new Date()
    })),
    ...Array(4).fill().map((_, i) => ({
      text: `Long Answer 5 Mark Question ${i + 1}`,
      questionType: QuestionType.OPEN_ENDED,
      correctAnswer: 'Answer',
      explanation: `Explanation for Long Answer 5 Mark Question ${i + 1}`,
      difficulty: DifficultyLevel.HARD,
      topicId: topics[i % 3].id,
      subjectId: mathSubject.id,
      marks: 5,
      pointsAwarded: 50,
      hint: `Hint for Long Answer 5 Mark Question ${i + 1}`,
      pdfPageNumber: 3,
      questionNumberOnPage: `${i + 14}`,
      createdAt: new Date(),
      updatedAt: new Date()
    }))
  ];

  // Create all questions
  await prisma.question.createMany({
    data: [...paper1Questions, ...paper2Questions]
  });

  console.log('Successfully seeded questions for Mathematics mock exam');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
