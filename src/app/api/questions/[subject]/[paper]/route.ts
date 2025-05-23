// src/app/api/questions/[subject]/[paper]/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient, QuestionType as PrismaQuestionType } from '@/generated/prisma';

const prisma = new PrismaClient();

interface Paper1Requirements {
  mcq1Mark: number;
  mcq2Mark: number;
  short1Mark: number;
  short2Mark: number;
}

interface Paper2Requirements { // Define for future use, not used in Phase 1
  short2Mark: number;
  longAnswerTargetCount: number; 
  longAnswerTotalMarks: number; 
}

interface QuestionRequest {
  paper: 'paper1' | 'paper2'; 
  requirements: Paper1Requirements | Paper2Requirements;
}

function isPaper1Requirements(req: Paper1Requirements | Paper2Requirements): req is Paper1Requirements {
  return 'mcq1Mark' in req && 'mcq2Mark' in req && 'short1Mark' in req && 'short2Mark' in req;
}

// Helper function to format options (can be shared or defined locally)
function formatOptionsForClient(options: any): any[] { 
    if (!options) return [];
    try {
      let parsedOptions = options;
      if (typeof options === 'string') {
        if ((options.startsWith('{') && options.endsWith('}')) || (options.startsWith('[') && options.endsWith(']'))) {
          parsedOptions = JSON.parse(options);
        } else { return []; }
      }
      if (Array.isArray(parsedOptions)) {
        return parsedOptions.map((opt, index) => {
          if (typeof opt === 'object' && opt !== null && opt.id && opt.text) {
            return { id: String(opt.id), text: String(opt.text) };
          }
          return { id: String.fromCharCode(65 + index), text: String(opt) };
        });
      }
      if (typeof parsedOptions === 'object' && parsedOptions !== null) {
        return Object.entries(parsedOptions).map(([key, value]) => ({ id: key, text: String(value) }));
      }
      return [];
    } catch (error) {
      console.error("Error formatting options for client in mock exam questions API:", error, "Original options:", options);
      return [];
    }
  }


export async function POST(
  request: Request,
  { params }: { params: { subject: string; paper: string } }
) {
  const { subject: subjectNameParam, paper } = params; 
  const { requirements } = await request.json() as QuestionRequest;

  try {
    console.log(`API: Fetching questions for subject: ${subjectNameParam}, paper: ${paper} (ProductionReady: false/null)`);
    
    let questions: any[] = []; 

    if (subjectNameParam.toLowerCase() === 'mathematics' && paper === 'paper1' && isPaper1Requirements(requirements)) {
        const fetchAndShuffle = async (questionType: PrismaQuestionType, marks: number, take: number) => {
            const allOfType = await prisma.question.findMany({
                where: { 
                    subject: { name: 'Mathematics' }, 
                    questionType, 
                    marks, 
                    OR: [ // Fetch if productionReady is false OR null
                        { productionReady: false },
                        { productionReady: null }
                    ]
                },
                include: { topic: { select: { id: true, name: true } } }
            });
            const shuffled = [...allOfType].sort(() => 0.5 - Math.random());
            return shuffled.slice(0, take);
        };

        const mcq1Mark = await fetchAndShuffle(PrismaQuestionType.MULTIPLE_CHOICE, 1, requirements.mcq1Mark);
        const mcq2Mark = await fetchAndShuffle(PrismaQuestionType.MULTIPLE_CHOICE, 2, requirements.mcq2Mark);
        
        const short1MarkOpen = await fetchAndShuffle(PrismaQuestionType.OPEN_ENDED, 1, requirements.short1Mark);
        const short1MarkFill = await fetchAndShuffle(PrismaQuestionType.FILL_IN_THE_BLANK, 1, requirements.short1Mark - short1MarkOpen.length);
        const short1Mark = [...short1MarkOpen, ...short1MarkFill].sort(() => 0.5 - Math.random()).slice(0, requirements.short1Mark);

        const short2MarkOpen = await fetchAndShuffle(PrismaQuestionType.OPEN_ENDED, 2, requirements.short2Mark);
        const short2MarkFill = await fetchAndShuffle(PrismaQuestionType.FILL_IN_THE_BLANK, 2, requirements.short2Mark - short2MarkOpen.length);
        const short2Mark = [...short2MarkOpen, ...short2MarkFill].sort(() => 0.5 - Math.random()).slice(0, requirements.short2Mark);
        
        questions = [...mcq1Mark, ...mcq2Mark, ...short1Mark, ...short2Mark];
        
        console.log(`API: Mathematics Paper 1 (Non-Production): Fetched ${mcq1Mark.length} MCQ1, ${mcq2Mark.length} MCQ2, ${short1Mark.length} SA1, ${short2Mark.length} SA2. Total: ${questions.length}`);
        const expectedCountPaper1 = requirements.mcq1Mark + requirements.mcq2Mark + requirements.short1Mark + requirements.short2Mark;
        
        if (questions.length === 0 && expectedCountPaper1 > 0) { // Only error if we expected questions but got none
             throw new Error(`No questions found for Paper 1 with productionReady=false/null. Please check your database content.`);
        } else if (questions.length < expectedCountPaper1) {
          console.warn(`Warning: Not enough questions for Paper 1 (productionReady=false/null). Expected ${expectedCountPaper1}, found ${questions.length}.`);
        }
    } else {
      return NextResponse.json({ error: { message: `Mock exams for subject '${subjectNameParam}' or paper '${paper}' not implemented yet or invalid requirements.` } }, { status: 501 });
    }

    if (!questions) { // This check might be redundant now with the one above
      console.warn('API: No questions array after filtering logic.');
      return NextResponse.json({ error: { message: 'No questions available for this paper configuration (Post-logic)' } }, { status: 404 });
    }
    
    // Ensure questions is an array even if it's empty, to avoid map error later
    questions = Array.isArray(questions) ? questions : [];


    const formattedQuestions = questions.map(q => {
      let clientCorrectAnswer = q.correctAnswer;
      if (typeof q.correctAnswer === 'string') {
        try {
          const parsed = JSON.parse(q.correctAnswer);
          if(typeof parsed === 'object' || Array.isArray(parsed)) clientCorrectAnswer = parsed;
        } catch (e) { /* ignore, keep as string */ }
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
    console.error('API: Error in mock exam questions route:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch questions for mock exam' } },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}