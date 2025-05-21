import { NextResponse } from 'next/server';
import { PrismaClient, QuestionType } from '@prisma/client';

const prisma = new PrismaClient();

// Sample Mathematics Paper 1 questions
const mathematicsPaper1Questions = [
  // Booklet A - Multiple Choice Questions (1 mark each)
  {
    id: 1,
    text: "What is the value of 3 × 4 + 5?",
    options: [
      { id: "A", text: "17" },
      { id: "B", text: "19" },
      { id: "C", text: "21" },
      { id: "D", text: "23" }
    ],
    correctAnswer: "A",
    topicName: "Basic Operations",
    questionType: "MULTIPLE_CHOICE",
    pointsAwarded: 1,
    booklet: "A",
    topic: { id: "basic_ops", name: "Basic Operations" }
  },
  {
    id: 2,
    text: "If 2x + 5 = 13, what is the value of x?",
    options: [
      { id: "A", text: "3" },
      { id: "B", text: "4" },
      { id: "C", text: "5" },
      { id: "D", text: "6" }
    ],
    correctAnswer: "B",
    topicName: "Algebra",
    questionType: "MULTIPLE_CHOICE",
    pointsAwarded: 1,
    booklet: "A",
    topic: { id: "algebra", name: "Algebra" }
  },
  // Add more MCQ questions...

  // Booklet A - Multiple Choice Questions (2 marks each)
  {
    id: 11,
    text: "A rectangle has a length of 8 cm and a width of 6 cm. What is its area?",
    options: [
      { id: "A", text: "24 cm²" },
      { id: "B", text: "28 cm²" },
      { id: "C", text: "48 cm²" },
      { id: "D", text: "56 cm²" }
    ],
    correctAnswer: "C",
    topicName: "Area and Perimeter",
    questionType: "MULTIPLE_CHOICE",
    pointsAwarded: 2,
    booklet: "A",
    topic: { id: "area", name: "Area and Perimeter" }
  },
  // Add more 2-mark MCQ questions...

  // Booklet B - Short Answer Questions (1 mark each)
  {
    id: 21,
    text: "Write down the next number in the sequence: 2, 4, 8, 16, ...",
    correctAnswer: "32",
    topicName: "Number Patterns",
    questionType: "SHORT_ANSWER",
    pointsAwarded: 1,
    booklet: "B",
    topic: { id: "patterns", name: "Number Patterns" }
  },
  // Add more 1-mark short answer questions...

  // Booklet B - Short Answer Questions (2 marks each)
  {
    id: 26,
    text: "A shop sells pens at $1.20 each. If John buys 5 pens and pays with a $10 note, how much change will he receive?",
    correctAnswer: "4",
    topicName: "Money",
    questionType: "SHORT_ANSWER",
    pointsAwarded: 2,
    booklet: "B",
    topic: { id: "money", name: "Money" }
  }
  // Add more 2-mark short answer questions...
];

// Sample Mathematics Paper 2 questions
const mathematicsPaper2Questions = [
  // Short Answer Questions (2 marks each)
  {
    id: 1,
    text: "A rectangle has a perimeter of 24 cm. If its length is 8 cm, find its width.",
    correctAnswer: "4",
    topicName: "Area and Perimeter",
    questionType: "SHORT_ANSWER",
    pointsAwarded: 2,
    topic: { id: "area", name: "Area and Perimeter" }
  },
  // Add more short answer questions...

  // Long Answer Questions (3-5 marks each)
  {
    id: 6,
    text: "A shop sells three types of fruits: apples, oranges, and pears. The ratio of apples to oranges to pears is 3:2:1. If there are 60 fruits in total, how many of each type of fruit are there? Show your working clearly.",
    correctAnswer: "30 apples, 20 oranges, 10 pears",
    topicName: "Ratio and Proportion",
    questionType: "LONG_ANSWER",
    pointsAwarded: 4,
    topic: { id: "ratio", name: "Ratio and Proportion" }
  }
  // Add more long answer questions...
];

export async function GET(
  request: Request,
  { params }: { params: { subject: string; paper: string } }
) {
  const { subject, paper } = params;

  try {
    console.log(`Fetching questions for subject: ${subject}, paper: ${paper}`);
    
    let questions;
    
    if (subject === 'mathematics') {
      if (paper === 'paper1') {
        // Paper 1 requirements:
        // - 10 MCQ questions with 1 mark each
        // - 5 MCQ questions with 2 marks each
        // - 5 short answer questions with 1 mark each
        // - 10 short answer questions with 2 marks each
        try {
          questions = await prisma.question.findMany({
            where: {
              subject: { name: 'Mathematics' },
              tags: { has: 'paper1' },
              OR: [
                { questionType: QuestionType.MULTIPLE_CHOICE, pointsAwarded: 1 },
                { questionType: QuestionType.MULTIPLE_CHOICE, pointsAwarded: 2 },
                { questionType: QuestionType.OPEN_ENDED, pointsAwarded: 1 },
                { questionType: QuestionType.OPEN_ENDED, pointsAwarded: 2 }
              ]
            },
            include: {
              topic: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
            orderBy: {
              questionType: 'asc',
              pointsAwarded: 'asc'
            }
          });

          console.log(`Found ${questions.length} questions for Paper 1`);

          // Ensure we have the correct number of questions
          const mcq1Mark = questions.filter(q => q.questionType === QuestionType.MULTIPLE_CHOICE && q.pointsAwarded === 1).slice(0, 10);
          const mcq2Mark = questions.filter(q => q.questionType === QuestionType.MULTIPLE_CHOICE && q.pointsAwarded === 2).slice(0, 5);
          const short1Mark = questions.filter(q => q.questionType === QuestionType.OPEN_ENDED && q.pointsAwarded === 1).slice(0, 5);
          const short2Mark = questions.filter(q => q.questionType === QuestionType.OPEN_ENDED && q.pointsAwarded === 2).slice(0, 10);

          questions = [...mcq1Mark, ...mcq2Mark, ...short1Mark, ...short2Mark];
          
          console.log(`Filtered to ${questions.length} questions with correct distribution`);
          
          if (questions.length < 30) {
            console.warn(`Warning: Not enough questions found for Paper 1. Expected 30, found ${questions.length}`);
            return NextResponse.json(
              { error: 'Not enough questions available for this paper' },
              { status: 404 }
            );
          }
        } catch (dbError) {
          console.error('Database error fetching Paper 1 questions:', dbError);
          throw new Error('Failed to fetch Paper 1 questions from database');
        }

      } else if (paper === 'paper2') {
        try {
          // Paper 2 requirements:
          // - 5 short answer questions with 2 marks each
          // - 12 long answer questions with total marks = 45
          questions = await prisma.question.findMany({
            where: {
              subject: { name: 'Mathematics' },
              tags: { has: 'paper2' },
              OR: [
                { questionType: QuestionType.OPEN_ENDED, pointsAwarded: 2 },
                { questionType: QuestionType.OPEN_ENDED }
              ]
            },
            include: {
              topic: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
            orderBy: {
              questionType: 'asc',
              pointsAwarded: 'asc'
            }
          });

          console.log(`Found ${questions.length} questions for Paper 2`);

          // Ensure we have the correct number of questions
          const short2Mark = questions.filter(q => q.questionType === QuestionType.OPEN_ENDED && q.pointsAwarded === 2).slice(0, 5);
          const longAnswer = questions.filter(q => q.questionType === QuestionType.OPEN_ENDED && q.pointsAwarded > 2).slice(0, 12);

          // Verify total marks for long answer questions
          const longAnswerTotal = longAnswer.reduce((sum, q) => sum + q.pointsAwarded, 0);
          if (longAnswerTotal !== 45) {
            console.warn(`Warning: Long answer questions total marks (${longAnswerTotal}) does not equal 45`);
            return NextResponse.json(
              { error: 'Questions do not meet the required mark distribution' },
              { status: 404 }
            );
          }

          questions = [...short2Mark, ...longAnswer];
          
          console.log(`Filtered to ${questions.length} questions with correct distribution`);
          
          if (questions.length < 17) {
            console.warn(`Warning: Not enough questions found for Paper 2. Expected 17, found ${questions.length}`);
            return NextResponse.json(
              { error: 'Not enough questions available for this paper' },
              { status: 404 }
            );
          }
        } catch (dbError) {
          console.error('Database error fetching Paper 2 questions:', dbError);
          throw new Error('Failed to fetch Paper 2 questions from database');
        }

      } else {
        return NextResponse.json(
          { error: 'Invalid paper type' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Subject not implemented yet' },
        { status: 501 }
      );
    }

    if (!questions || questions.length === 0) {
      console.warn('No questions found for the specified criteria');
      return NextResponse.json(
        { error: 'No questions available for this paper' },
        { status: 404 }
      );
    }

    return NextResponse.json(questions);
  } catch (error: any) {
    console.error('Error in questions API route:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch questions' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 