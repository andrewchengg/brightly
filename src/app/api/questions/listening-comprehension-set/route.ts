// src/app/api/questions/listening-comprehension-set/route.ts
import { NextResponse, NextRequest } from "next/server";
import {
  PrismaClient,
  QuestionType as PrismaQuestionType,
} from "@/generated/prisma";

const prisma = new PrismaClient();
export const dynamic = "force-dynamic";

const TARGET_TOTAL_MARKS = 20;
const DEFAULT_MARKS_PER_QUESTION = 2;
const DEFAULT_NUMBER_OF_PASSAGES_FOR_RANDOM = 5; // Adjust as needed, e.g., 5-7 passages

interface OptionClient {
  id: string;
  text: string;
}

function formatOptionsForClient(options: any): OptionClient[] {
  // ... (same function as before)
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
      "LC Set API: Error formatting options:",
      error,
      "Original:",
      options
    );
    return [];
  }
}

export async function GET(request: NextRequest) {
  // Changed from Request to NextRequest
  try {
    const { searchParams } = new URL(request.url);
    const lcPaperIdentifier = searchParams.get("paperIdentifier"); // Will be null if not provided
    const subjectIdForRandom = 4; // Assuming Chinese subject ID is 4
    // You might also want to filter by a specific Topic ID for Listening Comprehension
    // const lcTopicId = YOUR_LC_TOPIC_ID;

    let queryWhere: any = {
      // For Chinese listening comprehension, allow questions with productionReady = false
      questions: { some: { subjectId: subjectIdForRandom } }, // Just ensure group has Chinese questions
      audioUrl: { not: null }, // Crucial: Only select groups that have a pre-generated audio URL
      description: { not: null }, // And a passage script
      // subjectId: subjectIdForRandom, // If you add subjectId to QuestionGroup
      // topicId: lcTopicId, // If you add topicId to QuestionGroup or filter questions by topic
    };

    if (lcPaperIdentifier) {
      console.log(
        `API: Fetching LC set for SPECIFIC paperIdentifier: ${lcPaperIdentifier}`
      );
      queryWhere.sourceAssessmentType = lcPaperIdentifier;
    } else {
      console.log(
        `API: Fetching RANDOM LC set for Subject ID: ${subjectIdForRandom} (allowing productionReady = false)`
      );
      // If you store subjectId directly on QuestionGroup, add it here.
      // Otherwise, we assume all QuestionGroups are candidates for random selection
      // if they are not tied to a specific paperIdentifier being requested.
      // For now, if no paperIdentifier, we fetch ALL valid LC groups.
      // A better random selection might involve filtering by Subject/Topic if those relations
      // are directly on QuestionGroup or by querying Questions first.
      // For simplicity here: if no paperIdentifier, fetch all groups that have audio & scripts.
      // We'll rely on the `subjectId` in the `Question` model for filtering below.
    }

    const allCandidatePassageGroups = await prisma.questionGroup.findMany({
      where: queryWhere,
      include: {
        questions: {
          where: {
            // For Chinese questions, allow productionReady = false
            subjectId: subjectIdForRandom, // Filter questions by Chinese subject
            // Removed productionReady: true filter for Chinese
            // topicId: lcTopicId, // Optionally filter by LC Topic ID
          },
          orderBy: { questionNumberOnPage: "asc" },
          include: {
            topic: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Further filter: only include groups that *actually* have Chinese questions after the include
    let validPassageGroups = allCandidatePassageGroups.filter(
      (group) => group.questions && group.questions.length > 0
    );

    if (validPassageGroups.length === 0) {
      const errorMsg = lcPaperIdentifier
        ? `No listening passages found for identifier: ${lcPaperIdentifier} with Chinese questions and audio.`
        : "No suitable listening passages found for random selection. Check content availability.";
      console.error("API Route:", errorMsg);
      return NextResponse.json({ error: errorMsg }, { status: 404 });
    }

    // Shuffle the valid passages
    let shuffledPassageGroups = [...validPassageGroups].sort(
      () => 0.5 - Math.random()
    );

    const selectedPassageSets: Array<{ group: any; questions: any[] }> = [];
    let currentTotalMarks = 0;
    const maxPassages = lcPaperIdentifier
      ? shuffledPassageGroups.length
      : DEFAULT_NUMBER_OF_PASSAGES_FOR_RANDOM;

    for (const group of shuffledPassageGroups) {
      if (
        selectedPassageSets.length >= maxPassages ||
        currentTotalMarks >= TARGET_TOTAL_MARKS
      ) {
        break;
      }

      const groupMarks = group.questions.reduce(
        (sum, q) => sum + (q.marks || DEFAULT_MARKS_PER_QUESTION),
        0
      );

      // If adding this group doesn't grossly overshoot the target marks
      // Or if we are fetching a specific paper, include all its parts
      if (
        lcPaperIdentifier ||
        currentTotalMarks + groupMarks <=
          TARGET_TOTAL_MARKS + DEFAULT_MARKS_PER_QUESTION * 3
      ) {
        const formattedQuestions = group.questions.map((q) => {
          let clientCorrectAnswer = q.correctAnswer;
          if (typeof q.correctAnswer === "string") {
            try {
              const parsed = JSON.parse(q.correctAnswer);
              if (typeof parsed === "object" || Array.isArray(parsed))
                clientCorrectAnswer = parsed;
            } catch (e) {
              /* ignore */
            }
          }
          return {
            id: q.id,
            text: q.text,
            options: formatOptionsForClient(q.options),
            correctAnswer: clientCorrectAnswer,
            marks: q.marks || DEFAULT_MARKS_PER_QUESTION,
            topicName: q.topic?.name || "General Listening",
            questionType: q.questionType,
            imageUrl: q.imageUrl,
            explanation: q.explanation,
          };
        });

        selectedPassageSets.push({
          group: {
            id: group.id,
            name: group.name,
            passageScript: group.description, // Assuming script is in description
            audioUrl: group.audioUrl,
            sourceAssessmentType: group.sourceAssessmentType,
          },
          questions: formattedQuestions,
        });
        currentTotalMarks += groupMarks;
      }
    }

    if (selectedPassageSets.length === 0) {
      return NextResponse.json(
        {
          error:
            "Could not form a suitable set of listening passages. Please check content availability and productionReady flags.",
        },
        { status: 404 }
      );
    }

    console.log(
      `API: Returning ${selectedPassageSets.length} passage sets with total marks approx ${currentTotalMarks}.`
    );
    return NextResponse.json(selectedPassageSets);
  } catch (error: any) {
    console.error("API: Error fetching listening comprehension set:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch listening comprehension set",
        details: error.message,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
