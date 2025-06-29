// src/app/api/questions/question-group/[questionGroupId]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import {
  PrismaClient,
  QuestionType as PrismaQuestionType,
  QuestionGroup,
} from "@/generated/prisma";

const prisma = new PrismaClient();
export const dynamic = "force-dynamic";

interface OptionClient {
  id: string;
  text: string;
}

// Helper function to ensure options are in the correct format for the client
function formatOptionsForClient(options: any): OptionClient[] {
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
        return { id: String.fromCharCode(97 + index), text: String(opt) }; // Or A, B, C...
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
      "Error formatting options for client (question-group API):",
      error,
      "Original options:",
      options
    );
    return [];
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { questionGroupId: string } }
) {
  const { questionGroupId: groupIdString } = params;
  const questionGroupId = parseInt(groupIdString, 10);

  if (isNaN(questionGroupId)) {
    return NextResponse.json(
      { error: { message: "Invalid Question Group ID" } },
      { status: 400 }
    );
  }

  try {
    console.log(`API: Fetching Question Group with ID: ${questionGroupId}`);

    const questionGroupData = await prisma.questionGroup.findUnique({
      where: { id: questionGroupId },
      include: {
        questions: {
          where: { productionReady: true }, // Only fetch production-ready questions for students
          orderBy: { questionNumberOnPage: "asc" }, // Or some other logical order
          include: {
            topic: {
              select: { id: true, name: true, subjectId: true },
            },
          },
        },
      },
    });

    if (!questionGroupData) {
      return NextResponse.json(
        {
          error: {
            message: `Question Group with ID ${questionGroupId} not found.`,
          },
        },
        { status: 404 }
      );
    }

    if (
      !questionGroupData.questions ||
      questionGroupData.questions.length === 0
    ) {
      console.warn(
        `API: Question Group ${questionGroupId} has no production-ready questions.`
      );
      // You might still want to return the group info if it has a passage, even with no questions yet
      // return NextResponse.json({ error: { message: `No questions found for Question Group ID ${questionGroupId}.` } }, { status: 404 });
    }

    const formattedQuestions = questionGroupData.questions.map((q) => {
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
        id: q.id,
        text: q.text,
        question: q.text, // For compatibility
        options: formatOptionsForClient(q.options),
        correctAnswer: clientCorrectAnswer,
        hint: q.hint,
        explanation: q.explanation,
        difficulty: q.difficulty,
        pointsAwarded: q.pointsAwarded,
        questionType: q.questionType,
        imageUrl: q.imageUrl,
        subjectId: q.subjectId, // Include the subjectId field
        questionNumberOnPage: q.questionNumberOnPage, // This is crucial for cloze passages
        topic: q.topic
          ? { id: q.topic.id, name: q.topic.name, subjectId: q.topic.subjectId }
          : { id: 0, name: "Unknown Topic", subjectId: 0 },
        // Ensure topicName is present if client expects it directly
        topicName: q.topic?.name || "Unknown Topic",
      };
    });

    const responsePayload = {
      questionGroup: {
        // Send necessary group info
        id: questionGroupData.id,
        name: questionGroupData.name,
        description: questionGroupData.description, // This is the passage text
        audioUrl: questionGroupData.audioUrl,
        sourceYear: questionGroupData.sourceYear,
        sourceAssessmentType: questionGroupData.sourceAssessmentType,
      },
      questions: formattedQuestions,
    };

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error(
      `API: Error fetching question group ${questionGroupId}:`,
      error
    );
    return NextResponse.json(
      {
        error: {
          message: "Failed to fetch question group",
          details: error.message,
        },
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
