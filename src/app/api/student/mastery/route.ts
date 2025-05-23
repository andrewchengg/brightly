// src/app/api/student/mastery/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const subjectIdParam = searchParams.get('subjectId');

    // Fetch all student answers for the given student, optionally filtered by subject
    const studentAnswers = await prisma.studentAnswer.findMany({
      where: {
        practiceSession: {
          studentId: studentId,
        },
        question: subjectIdParam ? { subjectId: parseInt(subjectIdParam) } : undefined,
      },
      select: {
        isCorrect: true,
        questionId: true, // For identifying unique questions
        question: {
          select: {
            topicId: true,
            topic: {
              select: { 
                name: true,
                subjectId: true, // Ensure subjectId is on topic
                subject: { select: { name: true } } // And subject itself for name
              },
            },
          },
        },
      },
    });

    if (!studentAnswers || studentAnswers.length === 0) {
      return NextResponse.json([], { status: 200 }); // No answers, so no mastery data
    }

    // Calculate mastery per topic
    const masteryData: Record<number, {
        correctCount: number;
        attemptedUniqueQuestions: Set<number>; // To store unique question IDs attempted
        topicName: string;
        subjectId: number;
        subjectName: string;
    }> = {};

    for (const answer of studentAnswers) {
      if (!answer.question || !answer.question.topic || !answer.question.topic.subject) continue; 

      const topicId = answer.question.topicId;
      
      if (!masteryData[topicId]) {
        masteryData[topicId] = {
          correctCount: 0,
          attemptedUniqueQuestions: new Set(),
          topicName: answer.question.topic.name,
          subjectId: answer.question.topic.subjectId,
          subjectName: answer.question.topic.subject.name,
        };
      }

      // Add question to attempted set for this topic
      masteryData[topicId].attemptedUniqueQuestions.add(answer.questionId);

      // This logic assumes we only want to count a question as "correct" for mastery
      // if its LATEST attempt was correct. Since StudentAnswer uses upsert on
      // (practiceSessionId, questionId), each record is the latest for that specific question in that session.
      // If a student attempts the same question across DIFFERENT sessions, we need more complex logic
      // to determine "overall" latest correctness for that question.
      // For Phase 1, this simpler approach is: if *any* attempt at a question in a topic was correct,
      // we count it towards the "correct" count for that topic's unique questions.
      // A better Phase 1.5 would be: only count a unique question as correct if its *most recent* StudentAnswer record isCorrect=true.

      // To implement "latest attempt across all sessions for a given question":
      // This query doesn't directly give us that. We'd need to process or query differently.
      // Let's start with a simpler interpretation for Phase 1:
      // "For each topic, what percentage of *distinct questions* attempted in that topic were marked correct in *at least one* of their attempts?"
      // This is still not ideal. A better Phase 1 is:
      // "For each topic, count distinct questions. For each distinct question, check its latest answer. Sum correct latest answers."

      // Let's refine the processing logic for a more accurate Phase 1:
      // 1. Group answers by topicId and then by questionId.
      // 2. For each questionId within a topic, find the latest attempt (isCorrect status).
    }
    
    // More accurate calculation:
    const aggregatedByQuestion: Record<string, { isCorrectOnLatest: boolean; topicId: number; topicName: string; subjectId: number; subjectName: string }> = {};

    for (const answer of studentAnswers) {
        if (!answer.question || !answer.question.topic || !answer.question.topic.subject) continue;
        // Assuming StudentAnswer already reflects the latest attempt because of upsert on (practiceSessionId, questionId).
        // If a question can appear in multiple sessions, and we want true latest across all, this needs more.
        // For now, we'll consider each studentAnswer record for a question as an "instance" of an attempt.
        // This logic below will aggregate by topic, then calculate unique correct / unique attempted.
        
        const key = `${answer.question.topicId}-${answer.questionId}`; // Unique key for question within a topic
        
        // For a true "latest attempt for this question" logic, you would sort studentAnswers by attemptedAt desc
        // and only take the first one for each questionId.
        // The current StudentAnswer schema with upsert on (practiceSessionId, questionId) means each record
        // IS the latest for that question *within that specific session*.
        // If a student does Q1 in SessionA (wrong) and Q1 in SessionB (right), both StudentAnswer records exist.

        // Let's refine: group by question ID first, and take the latest `isCorrect` status.
        // This is still a bit complex without a sub-query or more advanced Prisma features not easily done here.
        //
        // Sticking to a simpler Phase 1: count unique questions attempted per topic,
        // and count unique questions where *at least one attempt was correct*.
        // This is still not ideal. Let's go with:
        // Number of distinct questions answered correctly / Number of distinct questions attempted (for that topic)

        const topicId = answer.question.topicId;
        if (!masteryData[topicId]) {
            masteryData[topicId] = {
                correctCount: 0,
                attemptedUniqueQuestions: new Set(),
                topicName: answer.question.topic.name,
                subjectId: answer.question.topic.subjectId,
                subjectName: answer.question.topic.subject.name,
            };
        }
        masteryData[topicId].attemptedUniqueQuestions.add(answer.questionId);
        // To count a question as "correctly mastered" if it was answered correctly at least once.
        // A more robust way: for each unique question, find its LATEST studentAnswer and check isCorrect.
        // For now, if ANY attempt for a question was correct, and it's the one we are processing, count it.
        // This means we need to ensure we only count each *question* once for the "correctCount".
        // We can do this by keeping track of correctly answered unique questions.
    }

    // Refined calculation based on unique questions
    const finalMasteryData: Record<number, {
        correctUniqueQuestions: Set<number>; // Stores IDs of unique questions answered correctly
        attemptedUniqueQuestions: Set<number>;
        topicName: string;
        subjectId: number;
        subjectName: string;
    }> = {};

    for (const answer of studentAnswers) {
        if (!answer.question || !answer.question.topic || !answer.question.topic.subject) continue;
        const topicId = answer.question.topicId;

        if (!finalMasteryData[topicId]) {
            finalMasteryData[topicId] = {
                correctUniqueQuestions: new Set(),
                attemptedUniqueQuestions: new Set(),
                topicName: answer.question.topic.name,
                subjectId: answer.question.topic.subjectId,
                subjectName: answer.question.topic.subject.name,
            };
        }
        finalMasteryData[topicId].attemptedUniqueQuestions.add(answer.questionId);
        if (answer.isCorrect) {
            finalMasteryData[topicId].correctUniqueQuestions.add(answer.questionId);
        }
    }


    const result = Object.entries(finalMasteryData).map(([topicIdStr, data]) => {
      const topicId = parseInt(topicIdStr);
      const correctCount = data.correctUniqueQuestions.size;
      const attemptedCount = data.attemptedUniqueQuestions.size;
      return {
        topicId: topicId,
        topicName: data.topicName,
        subjectId: data.subjectId,
        subjectName: data.subjectName,
        masteryPercentage: attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0,
      };
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("API: Error calculating student mastery:", error);
    return NextResponse.json(
      { error: 'Failed to calculate student mastery', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}