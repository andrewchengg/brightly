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
    
    // Build the query with any filters provided
    const whereClause: any = {};
    
    if (topicId) {
      whereClause.topicId = parseInt(topicId, 10);
    }
    
    if (subjectId) {
      whereClause.subjectId = parseInt(subjectId, 10);
    }
    
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
        // Use a random ordering approach
        id: 'asc' // We'll randomize the results after fetching
      }
    });
    
    // Shuffle the questions array for randomization
    const randomQuestions = [...questions]
      .sort(() => 0.5 - Math.random())
      .map(q => {
        // Format options properly based on question's questionType
        const formattedOptions = formatOptions(q.options);
        
        // Format correctAnswer based on options
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

        // Log for debugging
        console.log(`Question ${q.id}: options=${JSON.stringify(formattedOptions)}, correctAnswer=${JSON.stringify(correctAnswer)}`);
        
        return {
          id: q.id.toString(),
          question: q.text,
          options: formattedOptions,
          correctAnswer: correctAnswer,
          hint: q.explanation,
          difficulty: q.difficulty,
          topic: {
            id: q.topic.id.toString(),
            name: q.topic.name
          },
          pointsAwarded: q.pointsAwarded,
          questionType: q.questionType,
          imageUrl: q.imageUrl
        };
      });
    
    return NextResponse.json(randomQuestions);
  } catch (error: any) {
    console.error("Error fetching random questions:", error);
    return NextResponse.json(
      { error: { message: "Failed to fetch random questions" } },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 