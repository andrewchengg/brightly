// src/app/api/questions/random/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient, QuestionType as PrismaQuestionType } from '@/generated/prisma'; // Use generated client

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic'; // Ensures the route is not cached

interface OptionClient {
  id: string;
  text: string;
}

// Helper function to ensure options are in the correct format for the client
function formatOptionsForClient(options: any): OptionClient[] {
  if (!options) return [];

  try {
    let parsedOptions = options;
    if (typeof options === 'string') {
      // Try to parse if it's a JSON string that represents an array or object
      if ((options.startsWith('{') && options.endsWith('}')) || (options.startsWith('[') && options.endsWith(']'))) {
        parsedOptions = JSON.parse(options);
      } else {
        // If it's a simple string not intended to be JSON, and we expect options,
        // this might indicate a data issue or it's not an MCQ with structured options.
        // For now, we'll assume if it's a non-JSON string, it's not structured options.
        console.warn("formatOptionsForClient received a non-JSON string for options, returning empty:", options);
        return [];
      }
    }

    if (Array.isArray(parsedOptions)) {
      // Assumes elements are either strings or objects like {id: "A", text: "Option A"}
      return parsedOptions.map((opt, index) => {
        if (typeof opt === 'object' && opt !== null && opt.id && opt.text) {
          return { id: String(opt.id), text: String(opt.text) };
        }
        // If just an array of strings, assign simple IDs
        return { id: String.fromCharCode(97 + index), text: String(opt) };
      });
    }
    
    if (typeof parsedOptions === 'object' && parsedOptions !== null) {
      // Converts { "1": "Text1", "A": "TextA" } to [{id: "1", text: "Text1"}, {id: "A", text: "TextA"}]
      return Object.entries(parsedOptions).map(([key, value]) => ({
        id: key,
        text: String(value)
      }));
    }
    
    console.warn("Unknown options format received by formatOptionsForClient:", options);
    return [];
  } catch (error) {
    console.error("Error formatting options for client:", error, "Original options:", options);
    return []; // Return empty array on error
  }
}


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 10;
    const topicIdParam = searchParams.get('topicId');
    const subjectIdParam = searchParams.get('subjectId');
    
    console.log(`API: Fetching random questions. Limit=${limit}, TopicID=${topicIdParam || 'any'}, SubjectID=${subjectIdParam || 'any'}`);
    
    const whereClause: any = {};
    if (topicIdParam) {
      const topicId = parseInt(topicIdParam, 10);
      if (!isNaN(topicId)) whereClause.topicId = topicId;
      else console.warn("API: Invalid topicId received:", topicIdParam);
    }
    if (subjectIdParam) {
      const subjectId = parseInt(subjectIdParam, 10);
      if (!isNaN(subjectId)) whereClause.subjectId = subjectId;
      else console.warn("API: Invalid subjectId received:", subjectIdParam);
    }
    
    // Fetch ALL questions matching the criteria from the database first
    const allMatchingQuestions = await prisma.question.findMany({
      where: whereClause,
      include: {
        topic: {
          select: {
            id: true,
            name: true,
          },
        },
        // If you need subject name directly associated with the question:
        // subject: {
        //   select: { name: true }
        // }
      },
    });
    
    console.log(`API: Found ${allMatchingQuestions.length} total matching questions in database.`);
    
    if (allMatchingQuestions.length === 0) {
      return NextResponse.json(
        { error: { message: "No questions found matching the criteria" } },
        { status: 404 }
      );
    }
    
    // Shuffle the array of all matching questions
    const shuffledQuestions = [...allMatchingQuestions].sort(() => 0.5 - Math.random());
    
    // Take the specified limit from the shuffled array
    const randomSelection = shuffledQuestions.slice(0, limit);
    
    console.log(`API: Selected ${randomSelection.length} random questions from the shuffled pool.`);

    const processedQuestions = randomSelection.map(q => {
      try {
        let clientCorrectAnswer = q.correctAnswer;
        // The 'correctAnswer' from DB is Json?. If it's a string, try to parse.
        if (typeof q.correctAnswer === 'string') {
          try {
            const parsed = JSON.parse(q.correctAnswer);
             // If parsing results in an object or array, use that. Otherwise, keep original string (for simple answers).
            if (typeof parsed === 'object' || Array.isArray(parsed)) {
              clientCorrectAnswer = parsed;
            }
          } catch (e) {
            // Not a valid JSON string, assume it's a simple string answer (e.g., "A", "answer text")
            // Keep clientCorrectAnswer as q.correctAnswer
          }
        }
        
        const formattedOptions = formatOptionsForClient(q.options);

        return {
          id: q.id,
          text: q.text,
          question: q.text, // Keep for client-side compatibility if 'question' field is used
          options: formattedOptions,
          correctAnswer: clientCorrectAnswer, // This will be string | string[] | Record<string, string> | null
          hint: q.hint,
          explanation: q.explanation,
          difficulty: q.difficulty,
          pointsAwarded: q.pointsAwarded,
          questionType: q.questionType, // Already PrismaQuestionType
          imageUrl: q.imageUrl,
          topic: q.topic ? { id: q.topic.id, name: q.topic.name } : { id: 0, name: "Unknown Topic" },
          // subjectName: q.subject?.name // if subject was included
        };
      } catch (processingError) {
        console.error(`API: Error processing question ID ${q.id}:`, processingError);
        return { // Fallback structure
          id: q.id,
          text: q.text || "Error: Could not load question text",
          options: [],
          correctAnswer: null,
          questionType: q.questionType || PrismaQuestionType.OPEN_ENDED,
          topic: q.topic ? { id: q.topic.id, name: q.topic.name } : { id: 0, name: "Unknown Topic" },
        };
      }
    });
    
    return NextResponse.json(processedQuestions);
  } catch (error: any) {
    console.error("API: General error fetching random questions:", error);
    return NextResponse.json(
      { error: { message: "Failed to fetch random questions", details: error.message } },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}