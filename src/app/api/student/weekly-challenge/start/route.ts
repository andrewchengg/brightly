// src/app/api/student/weekly-challenge/start/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { PrismaClient, PracticeSessionType, PracticeSessionStatus, DifficultyLevel, QuestionType as PrismaQuestionType } from '@/generated/prisma';
import { getCurrentChallengeWeekStartDate } from '@/lib/dateUtils';

const prisma = new PrismaClient();

interface OptionClient { id: string; text: string; }

function formatOptionsForClient(options: any): OptionClient[] {
  if (!options) return [];
  try {
    let parsedOptions = options;
    // If options is a string, try to parse it as JSON
    if (typeof options === 'string') {
      if ((options.startsWith('{') && options.endsWith('}')) || (options.startsWith('[') && options.endsWith(']'))) {
        parsedOptions = JSON.parse(options);
      } else {
        // If it's a simple string not intended to be JSON, return empty or handle as needed
        return []; 
      }
    }

    // If it's an array (either from JSON parse or already an array)
    if (Array.isArray(parsedOptions)) {
      return parsedOptions.map((opt, index) => {
        if (typeof opt === 'object' && opt !== null && opt.id && opt.text) {
          return { id: String(opt.id), text: String(opt.text) };
        }
        // If elements are just strings, create IDs
        return { id: String.fromCharCode(97 + index), text: String(opt) };
      });
    }
    
    // If it's an object (key-value pairs)
    if (typeof parsedOptions === 'object' && parsedOptions !== null) {
      return Object.entries(parsedOptions).map(([key, value]) => ({
        id: key,
        text: String(value)
      }));
    }
    
    return []; // Fallback for unknown format
  } catch (error) {
    console.error("Error formatting options for client in weekly challenge:", error, "Original options:", options);
    return [];
  }
}

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) { try { cookieStore.set({ name, value, ...options }) } catch (error) { /* Ignored */ }},
        remove(name: string, options: CookieOptions) { try { cookieStore.set({ name, value: '', ...options }) } catch (error) { /* Ignored */ }},
      },
    }
  );
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const studentId = user.id;
    const challengeWeekId = getCurrentChallengeWeekStartDate();

    let existingSession = await prisma.practiceSession.findFirst({
      where: {
        studentId,
        type: PracticeSessionType.WEEKLY_CHALLENGE,
        challengeWeekIdentifier: challengeWeekId,
      },
      include: {
        studentAnswers: {
          include: {
            question: { include: { topic: { select: { name: true, id: true, subjectId: true } } } }
          },
          orderBy: { question: { id: 'asc' } } 
        }
      }
    });

    if (existingSession?.status === PracticeSessionStatus.COMPLETED) {
      return NextResponse.json({ message: 'Weekly challenge already completed for this week.', status: 'COMPLETED', practiceSessionId: existingSession.id }, { status: 200 });
    }

    if (existingSession) { // IN_PROGRESS or NOT_STARTED
      const questionsForClient = existingSession.studentAnswers.map(sa => {
        let clientCorrectAnswer = sa.question.correctAnswer;
        if (typeof sa.question.correctAnswer === 'string') {
            try { 
              const parsed = JSON.parse(sa.question.correctAnswer);
              if(typeof parsed === 'object' || Array.isArray(parsed)) clientCorrectAnswer = parsed;
            } catch (e) { /* ignore if not json */ }
        }
        return {
          ...sa.question,
          options: formatOptionsForClient(sa.question.options),
          correctAnswer: clientCorrectAnswer,
          topic: sa.question.topic ? { ...sa.question.topic } : { id: 0, name: "Unknown Topic", subjectId: 0 } // Ensure topic is always an object
        };
      });
      return NextResponse.json({
        practiceSessionId: existingSession.id,
        questions: questionsForClient,
        status: 'RESUMED',
        sessionDetails: existingSession 
      }, { status: 200 });
    }

    const allHardQuestions = await prisma.question.findMany({
      where: {
        difficulty: { in: [DifficultyLevel.HARD, DifficultyLevel.VERY_HARD] },
      },
      include: { topic: {select: { name: true, id: true, subjectId: true } } }
    });

    if (allHardQuestions.length < 5) {
      return NextResponse.json({ error: 'Not enough hard questions available for the challenge.' }, { status: 500 });
    }

    const selectedQuestions = [...allHardQuestions].sort(() => 0.5 - Math.random()).slice(0, 5);

    const newSession = await prisma.practiceSession.create({
      data: {
        studentId,
        title: `Weekly Challenge - ${challengeWeekId.toLocaleDateString()}`,
        type: PracticeSessionType.WEEKLY_CHALLENGE,
        status: PracticeSessionStatus.NOT_STARTED,
        totalQuestions: 5,
        challengeWeekIdentifier: challengeWeekId,
        startTime: new Date(),
      }
    });
    
    await prisma.studentAnswer.createMany({
        data: selectedQuestions.map(q => ({
            practiceSessionId: newSession.id,
            questionId: q.id,
        }))
    });

    const questionsForClient = selectedQuestions.map(q => {
       let clientCorrectAnswer = q.correctAnswer;
       if (typeof q.correctAnswer === 'string') {
           try { 
             const parsed = JSON.parse(q.correctAnswer);
             if(typeof parsed === 'object' || Array.isArray(parsed)) clientCorrectAnswer = parsed;
           } catch (e) { /* ignore */ }
       }
      return {
        ...q,
        options: formatOptionsForClient(q.options),
        correctAnswer: clientCorrectAnswer,
        topic: q.topic ? { ...q.topic } : { id: 0, name: "Unknown Topic", subjectId: 0 } // Ensure topic is always an object
      };
    });

    return NextResponse.json({
      practiceSessionId: newSession.id,
      questions: questionsForClient,
      status: 'CREATED',
      sessionDetails: newSession
    }, { status: 201 });

  } catch (error: any) {
    console.error("API: Error starting weekly challenge:", error);
    return NextResponse.json({ error: 'Failed to start weekly challenge', details: error.message, stack: error.stack }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}