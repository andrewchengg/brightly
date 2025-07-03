// src/app/api/questions/[subject]/[paper]/route.ts
import { NextResponse } from "next/server";
import {
  PrismaClient,
  QuestionType as PrismaQuestionType,
} from "@/generated/prisma";

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
  longAnswerTargetCount: number;
  longAnswerTotalMarks: number;
}

interface QuestionRequest {
  paper: "paper1" | "paper2";
  requirements: Paper1Requirements | Paper2Requirements;
}

function isPaper1Requirements(
  req: Paper1Requirements | Paper2Requirements
): req is Paper1Requirements {
  return (
    "mcq1Mark" in req &&
    "mcq2Mark" in req &&
    "short1Mark" in req &&
    "short2Mark" in req
  );
}

function isPaper2Requirements(
  req: Paper1Requirements | Paper2Requirements
): req is Paper2Requirements {
  return (
    "longAnswerTargetCount" in req &&
    "longAnswerTotalMarks" in req &&
    "short2Mark" in req
  );
}

function formatOptionsForClient(options: any): any[] {
  if (!options) return [];
  try {
    let parsedOptions = options;
    if (typeof options === "string") {
      if (
        (options.startsWith("{") && options.endsWith("}")) ||
        (options.startsWith("[") && options.endsWith("]"))
      ) {
        parsedOptions = JSON.parse(options);
      } else {
        return [];
      }
    }
    if (Array.isArray(parsedOptions)) {
      return parsedOptions.map((opt, index) => {
        if (typeof opt === "object" && opt !== null && opt.id && opt.text) {
          return { id: String(opt.id), text: String(opt.text) };
        }
        return { id: String.fromCharCode(65 + index), text: String(opt) };
      });
    }
    if (typeof parsedOptions === "object" && parsedOptions !== null) {
      return Object.entries(parsedOptions).map(([key, value]) => ({
        id: key,
        text: String(value),
      }));
    }
    return [];
  } catch (error) {
    console.error(
      "Error formatting options for client in mock exam questions API:",
      error,
      "Original options:",
      options
    );
    return [];
  }
}

export async function POST(
  request: Request,
  { params }: { params: { subject: string; paper: string } }
) {
  const { subject: subjectNameParam, paper } = params;
  const { requirements } = (await request.json()) as QuestionRequest;

  try {
    console.log(
      `API: Fetching questions for subject: ${subjectNameParam}, paper: ${paper} (ProductionReady: false/null)`
    );

    let questions: any[] = [];

    if (subjectNameParam.toLowerCase() === "mathematics") {
      const fetchAndShuffle = async (
        questionType: PrismaQuestionType | PrismaQuestionType[],
        marks: number,
        take: number
      ) => {
        const allOfType = await prisma.question.findMany({
          where: {
            subject: { name: "Mathematics" },
            questionType: Array.isArray(questionType)
              ? { in: questionType }
              : questionType,
            marks,
            productionReady: false,
          },
          include: { topic: { select: { id: true, name: true } } },
        });
        const shuffled = [...allOfType].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, take);
      };

      if (paper === "paper1" && isPaper1Requirements(requirements)) {
        const mcq1Mark = await fetchAndShuffle(
          PrismaQuestionType.MULTIPLE_CHOICE,
          1,
          requirements.mcq1Mark
        );
        const mcq2Mark = await fetchAndShuffle(
          PrismaQuestionType.MULTIPLE_CHOICE,
          2,
          requirements.mcq2Mark
        );

        const shortAnswerTypes = [
          PrismaQuestionType.OPEN_ENDED,
          PrismaQuestionType.FILL_IN_THE_BLANK,
        ];
        const short1Mark = await fetchAndShuffle(
          shortAnswerTypes,
          1,
          requirements.short1Mark
        );
        const short2Mark = await fetchAndShuffle(
          shortAnswerTypes,
          2,
          requirements.short2Mark
        );

        questions = [...mcq1Mark, ...mcq2Mark, ...short1Mark, ...short2Mark];

        console.log(
          `API: Mathematics Paper 1 (Non-Production): Fetched ${mcq1Mark.length} MCQ1, ${mcq2Mark.length} MCQ2, ${short1Mark.length} SA1, ${short2Mark.length} SA2. Total: ${questions.length}`
        );
        const expectedCountPaper1 =
          requirements.mcq1Mark +
          requirements.mcq2Mark +
          requirements.short1Mark +
          requirements.short2Mark;

        if (questions.length === 0 && expectedCountPaper1 > 0) {
          throw new Error(
            `No questions found for Paper 1 with productionReady=false/null. Please check your database content.`
          );
        } else if (questions.length < expectedCountPaper1) {
          console.warn(
            `Warning: Not enough questions for Paper 1 (productionReady=false/null). Expected ${expectedCountPaper1}, found ${questions.length}.`
          );
        }
      } else if (paper === "paper2" && isPaper2Requirements(requirements)) {
        const shortAnswerTypes = [
          PrismaQuestionType.OPEN_ENDED,
          PrismaQuestionType.FILL_IN_THE_BLANK,
        ];
        const short2Mark = await fetchAndShuffle(
          shortAnswerTypes,
          2,
          requirements.short2Mark
        );

        const longAnswerTargetCount = requirements.longAnswerTargetCount;
        const longAnswerTotalMarksTarget = requirements.longAnswerTotalMarks;

        // Fetch a larger pool of potential long answer questions
        const potentialLongAnswers3 = await fetchAndShuffle(
          PrismaQuestionType.OPEN_ENDED,
          3,
          longAnswerTargetCount * 2
        ); // Fetch more to choose from
        const potentialLongAnswers4 = await fetchAndShuffle(
          PrismaQuestionType.OPEN_ENDED,
          4,
          longAnswerTargetCount * 2
        );
        const potentialLongAnswers5 = await fetchAndShuffle(
          PrismaQuestionType.OPEN_ENDED,
          5,
          longAnswerTargetCount * 2
        );

        let longAnswerQuestions: any[] = [];
        let currentLongAnswerMarks = 0;
        let attempts = 0;
        const maxAttempts = 5; // To prevent infinite loops if targets are impossible

        // Try to select questions to meet targets. This is a heuristic.
        while (
          longAnswerQuestions.length < longAnswerTargetCount &&
          currentLongAnswerMarks < longAnswerTotalMarksTarget &&
          attempts < maxAttempts
        ) {
          let candidates = [
            ...potentialLongAnswers5.filter(
              (q) => !longAnswerQuestions.find((lq) => lq.id === q.id)
            ),
            ...potentialLongAnswers4.filter(
              (q) => !longAnswerQuestions.find((lq) => lq.id === q.id)
            ),
            ...potentialLongAnswers3.filter(
              (q) => !longAnswerQuestions.find((lq) => lq.id === q.id)
            ),
          ].sort(() => 0.5 - Math.random()); // Shuffle candidates

          let addedInThisAttempt = false;
          for (const cand of candidates) {
            if (
              longAnswerQuestions.length < longAnswerTargetCount &&
              currentLongAnswerMarks + (cand.marks || 0) <=
                longAnswerTotalMarksTarget + 3
            ) {
              // Allow slight overshoot
              if (!longAnswerQuestions.find((lq) => lq.id === cand.id)) {
                longAnswerQuestions.push(cand);
                currentLongAnswerMarks += cand.marks || 0;
                addedInThisAttempt = true;
              }
            }
          }
          if (
            !addedInThisAttempt &&
            longAnswerQuestions.length < longAnswerTargetCount
          ) {
            // If stuck, add any remaining to hit count
            for (const cand of candidates) {
              if (longAnswerQuestions.length >= longAnswerTargetCount) break;
              if (!longAnswerQuestions.find((lq) => lq.id === cand.id))
                longAnswerQuestions.push(cand);
            }
          }
          attempts++;
        }

        // Final trim if we overshot question count
        if (longAnswerQuestions.length > longAnswerTargetCount) {
          longAnswerQuestions = longAnswerQuestions.slice(
            0,
            longAnswerTargetCount
          );
        }
        currentLongAnswerMarks = longAnswerQuestions.reduce(
          (sum, q) => sum + (q.marks || 0),
          0
        );

        console.log(
          `API: Mathematics Paper 2 Long Answer (Non-Prod): Fetched ${longAnswerQuestions.length} questions, total marks ${currentLongAnswerMarks}. Target: ${longAnswerTargetCount} Qs, ${longAnswerTotalMarksTarget} marks.`
        );

        if (
          longAnswerQuestions.length < longAnswerTargetCount ||
          currentLongAnswerMarks < longAnswerTotalMarksTarget * 0.8
        ) {
          console.warn(
            `API: Warning: Not enough long answer Qs/marks for P2. Fetched ${longAnswerQuestions.length} Qs (${currentLongAnswerMarks} marks).`
          );
        }
        questions = [...short2Mark, ...longAnswerQuestions];
        const expectedCountPaper2 =
          requirements.short2Mark + longAnswerTargetCount;
        if (questions.length < expectedCountPaper2) {
          console.warn(
            `Warning: Not enough total Qs for P2. Expected ${expectedCountPaper2}, found ${questions.length}.`
          );
        }
      } else {
        return NextResponse.json(
          {
            error: {
              message: `Mock exams for subject '${subjectNameParam}' or paper '${paper}' not implemented yet or invalid requirements.`,
            },
          },
          { status: 501 }
        );
      }
    } else {
      return NextResponse.json(
        {
          error: {
            message: `Mock exams for subject '${subjectNameParam}' not implemented yet`,
          },
        },
        { status: 501 }
      );
    }

    if (!questions) {
      console.warn("API: No questions array after filtering logic.");
      return NextResponse.json(
        {
          error: {
            message:
              "No questions available for this paper configuration (Post-logic)",
          },
        },
        { status: 404 }
      );
    }

    questions = Array.isArray(questions) ? questions : [];

    const formattedQuestions = questions.map((q) => {
      let clientCorrectAnswer = q.correctAnswer;
      if (typeof q.correctAnswer === "string") {
        try {
          const parsed = JSON.parse(q.correctAnswer);
          if (typeof parsed === "object" || Array.isArray(parsed))
            clientCorrectAnswer = parsed;
        } catch (e) {
          /* ignore, keep as string */
        }
      }
      return {
        ...q,
        options: formatOptionsForClient(q.options),
        correctAnswer: clientCorrectAnswer,
        topicName: q.topic?.name || "General",
      };
    });

    return NextResponse.json(formattedQuestions);
  } catch (error: any) {
    console.error("API: Error in mock exam questions route:", error);
    return NextResponse.json(
      {
        error: {
          message: error.message || "Failed to fetch questions for mock exam",
        },
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
