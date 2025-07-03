import { NextResponse } from "next/server";
import { PrismaClient, QuestionType } from "@/generated/prisma";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

interface Paper1Requirements {
  mcq1Mark: number;
  mcq2Mark: number;
  short1Mark: number;
  short2Mark: number;
}

interface Paper2Requirements {
  short2Mark: number;
  longAnswer: number;
  longAnswerTotalMarks: number;
}

interface QuestionRequest {
  paper: "paper1" | "paper2";
  requirements: Paper1Requirements | Paper2Requirements;
}

function isPaper1Requirements(
  req: Paper1Requirements | Paper2Requirements
): req is Paper1Requirements {
  return "mcq1Mark" in req && "mcq2Mark" in req && "short1Mark" in req;
}

function isPaper2Requirements(
  req: Paper1Requirements | Paper2Requirements
): req is Paper2Requirements {
  return "longAnswer" in req && "longAnswerTotalMarks" in req;
}

export async function POST(
  request: Request,
  { params }: { params: { subject: string } }
) {
  const { subject } = params;
  const { paper, requirements } = (await request.json()) as QuestionRequest;

  try {
    console.log(`Fetching questions for subject: ${subject}, paper: ${paper}`);

    let questions;

    if (subject === "mathematics") {
      if (paper === "paper1" && isPaper1Requirements(requirements)) {
        try {
          // Fetch all required question types and marks
          const mcq1Mark = await prisma.question.findMany({
            where: {
              subject: { name: "Mathematics" },
              questionType: QuestionType.MULTIPLE_CHOICE,
              marks: 1,
            },
            include: {
              topic: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            take: requirements.mcq1Mark,
          });

          const mcq2Mark = await prisma.question.findMany({
            where: {
              subject: { name: "Mathematics" },
              questionType: QuestionType.MULTIPLE_CHOICE,
              marks: 2,
            },
            include: {
              topic: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            take: requirements.mcq2Mark,
          });

          const short1Mark = await prisma.question.findMany({
            where: {
              subject: { name: "Mathematics" },
              questionType: QuestionType.OPEN_ENDED,
              marks: 1,
            },
            include: {
              topic: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            take: requirements.short1Mark,
          });

          const short2Mark = await prisma.question.findMany({
            where: {
              subject: { name: "Mathematics" },
              questionType: QuestionType.OPEN_ENDED,
              marks: 2,
            },
            include: {
              topic: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            take: requirements.short2Mark,
          });

          questions = [...mcq1Mark, ...mcq2Mark, ...short1Mark, ...short2Mark];

          console.log(`Found ${questions.length} questions for Paper 1`);

          if (questions.length < 30) {
            console.warn(
              `Warning: Not enough questions found for Paper 1. Expected 30, found ${questions.length}`
            );
            return NextResponse.json(
              { error: "Not enough questions available for this paper" },
              { status: 404 }
            );
          }
        } catch (dbError) {
          console.error("Database error fetching Paper 1 questions:", dbError);
          throw new Error("Failed to fetch Paper 1 questions from database");
        }
      } else if (paper === "paper2" && isPaper2Requirements(requirements)) {
        try {
          // Fetch short answer questions (2 marks each)
          const short2Mark = await prisma.question.findMany({
            where: {
              subject: { name: "Mathematics" },
              questionType: QuestionType.OPEN_ENDED,
              marks: 2,
            },
            include: {
              topic: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            take: requirements.short2Mark,
          });

          // Fetch long answer questions (total 45 marks)
          const longAnswer = await prisma.question.findMany({
            where: {
              subject: { name: "Mathematics" },
              questionType: QuestionType.OPEN_ENDED,
              marks: { gt: 2 },
            },
            include: {
              topic: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            take: requirements.longAnswer,
          });

          // Verify total marks for long answer questions
          const longAnswerTotal = longAnswer.reduce(
            (sum, q) => sum + (q.marks || 0),
            0
          );
          if (longAnswerTotal !== requirements.longAnswerTotalMarks) {
            console.warn(
              `Warning: Long answer questions total marks (${longAnswerTotal}) does not equal ${requirements.longAnswerTotalMarks}`
            );
            return NextResponse.json(
              { error: "Questions do not meet the required mark distribution" },
              { status: 404 }
            );
          }

          questions = [...short2Mark, ...longAnswer];

          console.log(`Found ${questions.length} questions for Paper 2`);

          if (questions.length < 17) {
            console.warn(
              `Warning: Not enough questions found for Paper 2. Expected 17, found ${questions.length}`
            );
            return NextResponse.json(
              { error: "Not enough questions available for this paper" },
              { status: 404 }
            );
          }
        } catch (dbError) {
          console.error("Database error fetching Paper 2 questions:", dbError);
          throw new Error("Failed to fetch Paper 2 questions from database");
        }
      } else {
        return NextResponse.json(
          { error: "Invalid paper type or requirements" },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Subject not implemented yet" },
        { status: 501 }
      );
    }

    if (!questions || questions.length === 0) {
      console.warn("No questions found for the specified criteria");
      return NextResponse.json(
        { error: "No questions available for this paper" },
        { status: 404 }
      );
    }

    return NextResponse.json(questions);
  } catch (error: any) {
    console.error("Error in questions API route:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch questions" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
