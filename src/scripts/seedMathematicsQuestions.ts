import { PrismaClient, QuestionType, DifficultyLevel } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Prisma client
const prisma = new PrismaClient();

interface Question {
  text: string;
  options?: { id: string; text: string }[];
  correctAnswer: string | string[];
  questionType: 'MULTIPLE_CHOICE' | 'SHORT_ANSWER' | 'LONG_ANSWER';
  pointsAwarded: number;
  topic: {
    id: string;
    name: string;
  };
  booklet?: 'A' | 'B';
  paper: 'paper1' | 'paper2';
}

// Helper function to check for duplicate questions
function isDuplicateQuestion(question: Question, existingQuestions: Question[]): boolean {
  return existingQuestions.some(existing => 
    existing.text.toLowerCase() === question.text.toLowerCase() ||
    (existing.correctAnswer === question.correctAnswer && 
     existing.questionType === question.questionType)
  );
}

// Paper 1 Questions
const paper1Questions: Question[] = [
  // Paper 1 - Booklet A (MCQ) - 1 mark each
  {
    text: "What is the value of 3² + 4²?",
    options: [
      { id: "A", text: "25" },
      { id: "B", text: "7" },
      { id: "C", text: "5" },
      { id: "D", text: "12" }
    ],
    correctAnswer: "A",
    questionType: "MULTIPLE_CHOICE",
    pointsAwarded: 1,
    topic: { id: "algebra", name: "Algebra" },
    booklet: "A",
    paper: "paper1"
  },
  {
    text: "If x + 5 = 12, what is the value of x?",
    options: [
      { id: "A", text: "5" },
      { id: "B", text: "7" },
      { id: "C", text: "12" },
      { id: "D", text: "17" }
    ],
    correctAnswer: "B",
    questionType: "MULTIPLE_CHOICE",
    pointsAwarded: 1,
    topic: { id: "algebra", name: "Algebra" },
    booklet: "A",
    paper: "paper1"
  },
  {
    text: "What is 25% of 80?",
    options: [
      { id: "A", text: "15" },
      { id: "B", text: "20" },
      { id: "C", text: "25" },
      { id: "D", text: "30" }
    ],
    correctAnswer: "B",
    questionType: "MULTIPLE_CHOICE",
    pointsAwarded: 1,
    topic: { id: "percentages", name: "Percentages" },
    booklet: "A",
    paper: "paper1"
  },
  {
    text: "What is the area of a square with side length 6 cm?",
    options: [
      { id: "A", text: "12 cm²" },
      { id: "B", text: "24 cm²" },
      { id: "C", text: "36 cm²" },
      { id: "D", text: "48 cm²" }
    ],
    correctAnswer: "C",
    questionType: "MULTIPLE_CHOICE",
    pointsAwarded: 1,
    topic: { id: "geometry", name: "Geometry" },
    booklet: "A",
    paper: "paper1"
  },
  {
    text: "What is the next number in the sequence: 2, 4, 8, 16, ...?",
    options: [
      { id: "A", text: "20" },
      { id: "B", text: "24" },
      { id: "C", text: "32" },
      { id: "D", text: "36" }
    ],
    correctAnswer: "C",
    questionType: "MULTIPLE_CHOICE",
    pointsAwarded: 1,
    topic: { id: "sequences", name: "Sequences" },
    booklet: "A",
    paper: "paper1"
  },
  {
    text: "What is the value of π (pi) to 2 decimal places?",
    options: [
      { id: "A", text: "3.12" },
      { id: "B", text: "3.14" },
      { id: "C", text: "3.16" },
      { id: "D", text: "3.18" }
    ],
    correctAnswer: "B",
    questionType: "MULTIPLE_CHOICE",
    pointsAwarded: 1,
    topic: { id: "geometry", name: "Geometry" },
    booklet: "A",
    paper: "paper1"
  },
  {
    text: "What is 3/4 as a decimal?",
    options: [
      { id: "A", text: "0.25" },
      { id: "B", text: "0.5" },
      { id: "C", text: "0.75" },
      { id: "D", text: "1.0" }
    ],
    correctAnswer: "C",
    questionType: "MULTIPLE_CHOICE",
    pointsAwarded: 1,
    topic: { id: "fractions", name: "Fractions" },
    booklet: "A",
    paper: "paper1"
  },
  {
    text: "What is the perimeter of a rectangle with length 8 cm and width 5 cm?",
    options: [
      { id: "A", text: "13 cm" },
      { id: "B", text: "26 cm" },
      { id: "C", text: "40 cm" },
      { id: "D", text: "45 cm" }
    ],
    correctAnswer: "B",
    questionType: "MULTIPLE_CHOICE",
    pointsAwarded: 1,
    topic: { id: "geometry", name: "Geometry" },
    booklet: "A",
    paper: "paper1"
  },
  {
    text: "What is the value of 2³ × 2²?",
    options: [
      { id: "A", text: "32" },
      { id: "B", text: "64" },
      { id: "C", text: "128" },
      { id: "D", text: "256" }
    ],
    correctAnswer: "A",
    questionType: "MULTIPLE_CHOICE",
    pointsAwarded: 1,
    topic: { id: "algebra", name: "Algebra" },
    booklet: "A",
    paper: "paper1"
  },
  {
    text: "What is the mean of the numbers 4, 6, 8, 10, 12?",
    options: [
      { id: "A", text: "6" },
      { id: "B", text: "7" },
      { id: "C", text: "8" },
      { id: "D", text: "9" }
    ],
    correctAnswer: "C",
    questionType: "MULTIPLE_CHOICE",
    pointsAwarded: 1,
    topic: { id: "statistics", name: "Statistics" },
    booklet: "A",
    paper: "paper1"
  },

  // Paper 1 - Booklet A (MCQ) - 2 marks each
  {
    text: "A triangle has angles of 45° and 60°. What is the measure of the third angle?",
    options: [
      { id: "A", text: "65°" },
      { id: "B", text: "75°" },
      { id: "C", text: "85°" },
      { id: "D", text: "95°" }
    ],
    correctAnswer: "B",
    questionType: "MULTIPLE_CHOICE",
    pointsAwarded: 2,
    topic: { id: "geometry", name: "Geometry" },
    booklet: "A",
    paper: "paper1"
  },
  {
    text: "What is the value of x in the equation 2x + 5 = 3x - 2?",
    options: [
      { id: "A", text: "3" },
      { id: "B", text: "5" },
      { id: "C", text: "7" },
      { id: "D", text: "9" }
    ],
    correctAnswer: "C",
    questionType: "MULTIPLE_CHOICE",
    pointsAwarded: 2,
    topic: { id: "algebra", name: "Algebra" },
    booklet: "A",
    paper: "paper1"
  },
  {
    text: "A shop offers a 20% discount on a $50 item. What is the final price?",
    options: [
      { id: "A", text: "$30" },
      { id: "B", text: "$35" },
      { id: "C", text: "$40" },
      { id: "D", text: "$45" }
    ],
    correctAnswer: "C",
    questionType: "MULTIPLE_CHOICE",
    pointsAwarded: 2,
    topic: { id: "percentages", name: "Percentages" },
    booklet: "A",
    paper: "paper1"
  },
  {
    text: "What is the volume of a cube with side length 4 cm?",
    options: [
      { id: "A", text: "16 cm³" },
      { id: "B", text: "32 cm³" },
      { id: "C", text: "48 cm³" },
      { id: "D", text: "64 cm³" }
    ],
    correctAnswer: "D",
    questionType: "MULTIPLE_CHOICE",
    pointsAwarded: 2,
    topic: { id: "geometry", name: "Geometry" },
    booklet: "A",
    paper: "paper1"
  },
  {
    text: "What is the next term in the sequence: 3, 6, 12, 24, ...?",
    options: [
      { id: "A", text: "36" },
      { id: "B", text: "42" },
      { id: "C", text: "48" },
      { id: "D", text: "54" }
    ],
    correctAnswer: "C",
    questionType: "MULTIPLE_CHOICE",
    pointsAwarded: 2,
    topic: { id: "sequences", name: "Sequences" },
    booklet: "A",
    paper: "paper1"
  },

  // Paper 1 - Booklet B (Short Answer) - 1 mark each
  {
    text: "Calculate 15% of 200.",
    correctAnswer: "30",
    questionType: "SHORT_ANSWER",
    pointsAwarded: 1,
    topic: { id: "percentages", name: "Percentages" },
    booklet: "B",
    paper: "paper1"
  },
  {
    text: "What is the value of 4² - 3²?",
    correctAnswer: "7",
    questionType: "SHORT_ANSWER",
    pointsAwarded: 1,
    topic: { id: "algebra", name: "Algebra" },
    booklet: "B",
    paper: "paper1"
  },
  {
    text: "Find the perimeter of a square with side length 7 cm.",
    correctAnswer: "28",
    questionType: "SHORT_ANSWER",
    pointsAwarded: 1,
    topic: { id: "geometry", name: "Geometry" },
    booklet: "B",
    paper: "paper1"
  },
  {
    text: "What is 3/4 of 80?",
    correctAnswer: "60",
    questionType: "SHORT_ANSWER",
    pointsAwarded: 1,
    topic: { id: "fractions", name: "Fractions" },
    booklet: "B",
    paper: "paper1"
  },
  {
    text: "Calculate 2³ + 3².",
    correctAnswer: "17",
    questionType: "SHORT_ANSWER",
    pointsAwarded: 1,
    topic: { id: "algebra", name: "Algebra" },
    booklet: "B",
    paper: "paper1"
  },

  // Paper 1 - Booklet B (Short Answer) - 2 marks each
  {
    text: "Solve the equation: 2x + 5 = 15",
    correctAnswer: "5",
    questionType: "SHORT_ANSWER",
    pointsAwarded: 2,
    topic: { id: "algebra", name: "Algebra" },
    booklet: "B",
    paper: "paper1"
  },
  {
    text: "A rectangle has a length of 8 cm and an area of 40 cm². What is its width?",
    correctAnswer: "5",
    questionType: "SHORT_ANSWER",
    pointsAwarded: 2,
    topic: { id: "geometry", name: "Geometry" },
    booklet: "B",
    paper: "paper1"
  },
  {
    text: "What is 25% of 120?",
    correctAnswer: "30",
    questionType: "SHORT_ANSWER",
    pointsAwarded: 2,
    topic: { id: "percentages", name: "Percentages" },
    booklet: "B",
    paper: "paper1"
  },
  {
    text: "Find the value of x in the equation: 3x - 4 = 11",
    correctAnswer: "5",
    questionType: "SHORT_ANSWER",
    pointsAwarded: 2,
    topic: { id: "algebra", name: "Algebra" },
    booklet: "B",
    paper: "paper1"
  },
  {
    text: "What is the area of a triangle with base 6 cm and height 8 cm?",
    correctAnswer: "24",
    questionType: "SHORT_ANSWER",
    pointsAwarded: 2,
    topic: { id: "geometry", name: "Geometry" },
    booklet: "B",
    paper: "paper1"
  },
  {
    text: "Calculate 15% of 80.",
    correctAnswer: "12",
    questionType: "SHORT_ANSWER",
    pointsAwarded: 2,
    topic: { id: "percentages", name: "Percentages" },
    booklet: "B",
    paper: "paper1"
  },
  {
    text: "What is the value of 5² + 3³?",
    correctAnswer: "52",
    questionType: "SHORT_ANSWER",
    pointsAwarded: 2,
    topic: { id: "algebra", name: "Algebra" },
    booklet: "B",
    paper: "paper1"
  },
  {
    text: "Find the perimeter of a rectangle with length 9 cm and width 5 cm.",
    correctAnswer: "28",
    questionType: "SHORT_ANSWER",
    pointsAwarded: 2,
    topic: { id: "geometry", name: "Geometry" },
    booklet: "B",
    paper: "paper1"
  },
  {
    text: "What is 2/3 of 90?",
    correctAnswer: "60",
    questionType: "SHORT_ANSWER",
    pointsAwarded: 2,
    topic: { id: "fractions", name: "Fractions" },
    booklet: "B",
    paper: "paper1"
  },
  {
    text: "Calculate 4³ - 3³.",
    correctAnswer: "37",
    questionType: "SHORT_ANSWER",
    pointsAwarded: 2,
    topic: { id: "algebra", name: "Algebra" },
    booklet: "B",
    paper: "paper1"
  },
  {
    text: "What is the area of a circle with radius 5 cm? (Use π = 3.14)",
    correctAnswer: "78.5",
    questionType: "SHORT_ANSWER",
    pointsAwarded: 2,
    topic: { id: "geometry", name: "Geometry" },
    booklet: "B",
    paper: "paper1"
  },
  {
    text: "Solve the equation: 3x + 7 = 22",
    correctAnswer: "5",
    questionType: "SHORT_ANSWER",
    pointsAwarded: 2,
    topic: { id: "algebra", name: "Algebra" },
    booklet: "B",
    paper: "paper1"
  },
  {
    text: "What is 35% of 200?",
    correctAnswer: "70",
    questionType: "SHORT_ANSWER",
    pointsAwarded: 2,
    topic: { id: "percentages", name: "Percentages" },
    booklet: "B",
    paper: "paper1"
  },
  {
    text: "Find the value of x in the equation: 2x + 3 = 15",
    correctAnswer: "6",
    questionType: "SHORT_ANSWER",
    pointsAwarded: 2,
    topic: { id: "algebra", name: "Algebra" },
    booklet: "B",
    paper: "paper1"
  },
  {
    text: "What is the area of a square with perimeter 20 cm?",
    correctAnswer: "25",
    questionType: "SHORT_ANSWER",
    pointsAwarded: 2,
    topic: { id: "geometry", name: "Geometry" },
    booklet: "B",
    paper: "paper1"
  },
];

// Paper 2 Questions (ensuring no duplicates with Paper 1)
const paper2Questions: Question[] = [
  {
    text: "A shop sells shirts at $25 each. During a sale, they offer a 20% discount. If a customer buys 3 shirts, how much will they pay in total? Show your working.",
    correctAnswer: "60",
    questionType: "LONG_ANSWER",
    pointsAwarded: 3,
    topic: { id: "percentages", name: "Percentages" },
    paper: "paper2"
  },
  {
    text: "A rectangle has a length of 8 cm and a width of 6 cm. Calculate its area and perimeter. Show your working.",
    correctAnswer: "Area: 48 cm², Perimeter: 28 cm",
    questionType: "LONG_ANSWER",
    pointsAwarded: 3,
    topic: { id: "geometry", name: "Geometry" },
    paper: "paper2"
  },
  {
    text: "Solve the equation: 2x + 5 = 3x - 2. Show your working.",
    correctAnswer: "7",
    questionType: "LONG_ANSWER",
    pointsAwarded: 3,
    topic: { id: "algebra", name: "Algebra" },
    paper: "paper2"
  },
  {
    text: "A triangle has angles of 45° and 60°. What is the measure of the third angle? Show your working.",
    correctAnswer: "75°",
    questionType: "LONG_ANSWER",
    pointsAwarded: 3,
    topic: { id: "geometry", name: "Geometry" },
    paper: "paper2"
  },
  {
    text: "Calculate 15% of 200 and then add 25% of the result. Show your working.",
    correctAnswer: "37.5",
    questionType: "LONG_ANSWER",
    pointsAwarded: 4,
    topic: { id: "percentages", name: "Percentages" },
    paper: "paper2"
  },
  {
    text: "A square has an area of 64 cm². What is its perimeter? Show your working.",
    correctAnswer: "32",
    questionType: "LONG_ANSWER",
    pointsAwarded: 4,
    topic: { id: "geometry", name: "Geometry" },
    paper: "paper2"
  },
  {
    text: "Solve the equation: 3(x + 2) = 2(x + 5). Show your working.",
    correctAnswer: "4",
    questionType: "LONG_ANSWER",
    pointsAwarded: 4,
    topic: { id: "algebra", name: "Algebra" },
    paper: "paper2"
  },
  {
    text: "A circle has a radius of 5 cm. Calculate its area and circumference. (Use π = 3.14) Show your working.",
    correctAnswer: "Area: 78.5 cm², Circumference: 31.4 cm",
    questionType: "LONG_ANSWER",
    pointsAwarded: 4,
    topic: { id: "geometry", name: "Geometry" },
    paper: "paper2"
  },
  {
    text: "A shop offers a 15% discount on all items. If a customer buys 3 items costing $20, $30, and $40, what is the total amount they will pay? Show your working.",
    correctAnswer: "76.5",
    questionType: "LONG_ANSWER",
    pointsAwarded: 5,
    topic: { id: "percentages", name: "Percentages" },
    paper: "paper2"
  },
  {
    text: "A rectangle has a perimeter of 24 cm and an area of 35 cm². What are its dimensions? Show your working.",
    correctAnswer: "7 cm and 5 cm",
    questionType: "LONG_ANSWER",
    pointsAwarded: 5,
    topic: { id: "geometry", name: "Geometry" },
    paper: "paper2"
  },
  {
    text: "Solve the equation: 2(x + 3) = 3(x - 2). Show your working.",
    correctAnswer: "12",
    questionType: "LONG_ANSWER",
    pointsAwarded: 5,
    topic: { id: "algebra", name: "Algebra" },
    paper: "paper2"
  },
  {
    text: "A triangle has sides of length 5 cm, 12 cm, and 13 cm. Calculate its area and perimeter. Show your working.",
    correctAnswer: "Area: 30 cm², Perimeter: 30 cm",
    questionType: "LONG_ANSWER",
    pointsAwarded: 5,
    topic: { id: "geometry", name: "Geometry" },
    paper: "paper2"
  }
];

// Combine all questions
const mathematicsQuestions: Question[] = [...paper1Questions, ...paper2Questions];

async function seedQuestions() {
  try {
    console.log('Starting seeding process...');

    // First, ensure the subject exists
    console.log('Creating/updating Mathematics subject...');
    const mathematicsSubject = await prisma.subject.upsert({
      where: { name: 'Mathematics' },
      update: {},
      create: { name: 'Mathematics' }
    });

    // Then ensure the topics exist
    console.log('Seeding topics...');
    const topics = [
      { name: "Algebra", description: "Algebraic concepts and equations" },
      { name: "Geometry", description: "Geometric shapes and measurements" },
      { name: "Percentages", description: "Percentage calculations and applications" },
      { name: "Fractions", description: "Fraction operations and concepts" },
      { name: "Sequences", description: "Number sequences and patterns" },
      { name: "Statistics", description: "Statistical concepts and calculations" }
    ];

    const createdTopics = await Promise.all(
      topics.map(async (topic) => {
        return prisma.topic.upsert({
          where: {
            name_subjectId: {
              name: topic.name,
              subjectId: mathematicsSubject.id
            }
          },
          update: { description: topic.description },
          create: {
            name: topic.name,
            description: topic.description,
            subjectId: mathematicsSubject.id
          }
        });
      })
    );

    console.log('Successfully created/updated topics');

    // Create a map of topic names to their IDs
    const topicMap = new Map(createdTopics.map(topic => [topic.name, topic.id]));

    // Then insert the questions
    console.log('Seeding questions...');
    for (const question of mathematicsQuestions) {
      try {
        const topicId = topicMap.get(question.topic.name);
        if (!topicId) {
          console.error(`Topic not found for question: ${question.text.substring(0, 50)}...`);
          continue;
        }

        const mappedQuestion = {
          text: question.text,
          questionType: question.questionType === 'MULTIPLE_CHOICE' ? QuestionType.MULTIPLE_CHOICE :
                       question.questionType === 'SHORT_ANSWER' ? QuestionType.OPEN_ENDED :
                       QuestionType.OPEN_ENDED,
          options: question.options ? { set: question.options } : undefined,
          correctAnswer: { set: question.correctAnswer },
          pointsAwarded: question.pointsAwarded,
          subjectId: mathematicsSubject.id,
          topicId: topicId,
          difficulty: DifficultyLevel.MEDIUM,
          marks: question.pointsAwarded,
          tags: { set: [question.topic.name.toLowerCase(), question.paper] }
        };

        await prisma.question.upsert({
          where: {
            text_topicId_subjectId: {
              text: question.text,
              topicId: topicId,
              subjectId: mathematicsSubject.id
            }
          },
          update: mappedQuestion,
          create: mappedQuestion
        });

        console.log('Successfully inserted/updated question:', question.text.substring(0, 50) + '...');
      } catch (error) {
        console.error('Error inserting question:', question.text.substring(0, 50) + '...', error);
      }
    }

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Error during seeding:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding function
seedQuestions(); 