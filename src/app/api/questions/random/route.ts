import { NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

// Helper function to ensure options are in the correct format
function formatOptions(options: any): any {
  if (!options) return [];

  try {
    // If options is already parsed (object or array)
    if (typeof options !== 'string') {
      // If it's an array, format each option if needed
      if (Array.isArray(options)) {
        // Check if options are objects with id and text
        if (options.length > 0 && typeof options[0] === 'object' && options[0].id) {
          return options; // Already in correct format
        }
        
        // Convert simple array ["option1", "option2"] to [{id: "a", text: "option1"}, {id: "b", text: "option2"}]
        return options.map((opt, index) => ({
          id: String.fromCharCode(97 + index), // a, b, c, d
          text: typeof opt === 'object' ? JSON.stringify(opt) : String(opt)
        }));
      }
      
      // If it's an object like {a: "option1", b: "option2"}, convert to array of objects
      if (typeof options === 'object') {
        return Object.entries(options).map(([key, value]) => ({
          id: key,
          text: typeof value === 'object' ? JSON.stringify(value) : String(value)
        }));
      }
      
      console.warn("Unknown options format:", options);
      return [];
    }
    
    // If options is a string, try to parse it
    const parsed = JSON.parse(options);
    return formatOptions(parsed); // Recursively format the parsed result
  } catch (error) {
    console.error("Error formatting options:", error);
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 10;
    const topicId = searchParams.get('topicId');
    const subjectId = searchParams.get('subjectId');
    
    console.log(`Fetching random questions with limit=${limit}, topicId=${topicId || 'any'}, subjectId=${subjectId || 'any'}`);
    
    // Build the query with any filters provided
    const whereClause: any = {};
    
    if (topicId) {
      whereClause.topicId = parseInt(topicId, 10);
    }
    
    if (subjectId) {
      whereClause.subjectId = parseInt(subjectId, 10);
    }
    
    // Debug log the query we're about to make
    console.log("Query parameters:", JSON.stringify(whereClause));
    
    // Fetch questions from the database
    const questions = await prisma.question.findMany({
      where: whereClause,
      include: {
        topic: {
          select: {
            id: true,
            name: true
          }
        }
      },
      take: limit,
      orderBy: {
        id: 'asc' // We'll randomize the results after fetching
      }
    });
    
    console.log(`Found ${questions.length} questions in database`);
    
    // If no questions found, return early with a clear message
    if (questions.length === 0) {
      return NextResponse.json(
        { error: { message: "No questions found matching the criteria" } },
        { status: 404 }
      );
    }
    
    // Shuffle the questions array for randomization
    const randomQuestions = [...questions]
      .sort(() => 0.5 - Math.random())
      .map(q => {
        try {
          // Format options properly based on question's questionType
          const formattedOptions = formatOptions(q.options);
          
          // Format correctAnswer based on question type
          let correctAnswer = q.correctAnswer;
          
          // If correctAnswer is a JSON string, parse it
          if (typeof correctAnswer === 'string' && (
              correctAnswer.startsWith('{') || 
              correctAnswer.startsWith('[') ||
              correctAnswer.startsWith('"')
            )) {
            try {
              correctAnswer = JSON.parse(correctAnswer);
            } catch (e) {
              console.warn("Could not parse correctAnswer:", correctAnswer);
            }
          }
          
          // Common fields for all question types
          const questionData: any = {
            id: q.id,
            text: q.text,
            hint: q.hint,
            explanation: q.explanation,
            difficulty: q.difficulty,
            topic: {
              id: q.topic.id,
              name: q.topic.name
            },
            pointsAwarded: q.pointsAwarded,
            questionType: q.questionType,
            imageUrl: q.imageUrl,
            correctAnswer: correctAnswer
          };
          
          // Add options based on question type
          const questionTypeString = String(q.questionType);
          
          // Add options only for multiple choice questions
          if (questionTypeString === 'MULTIPLE_CHOICE') {
            questionData.options = formattedOptions;
          } else {
            // For other question types, provide an empty array for consistency
            questionData.options = [];
          }
          
          return questionData;
        } catch (error) {
          console.error(`Error processing question ID ${q.id}:`, error);
          // Return a minimal valid question object to prevent the whole request from failing
          return {
            id: q.id,
            text: q.text || "Error processing question",
            options: [],
            correctAnswer: "",
            questionType: q.questionType || "MULTIPLE_CHOICE",
            topic: {
              id: q.topic?.id || 0,
              name: q.topic?.name || "Unknown"
            }
          };
        }
      });
    
    return NextResponse.json(randomQuestions);
  } catch (error: any) {
    console.error("Error fetching random questions:", error);
    return NextResponse.json(
      { error: { message: "Failed to fetch random questions", details: error.message, stack: error.stack } },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 