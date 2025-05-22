// src/app/api/student/practice-sessions/completed/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { PrismaClient, PracticeSessionStatus, PracticeSessionType } from '@/generated/prisma';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

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

    const completedSessions = await prisma.practiceSession.findMany({
      where: {
        studentId: studentId,
        status: PracticeSessionStatus.COMPLETED,
      },
      select: {
        id: true,
        title: true,
        type: true,
        endTime: true,
        score: true,
        totalQuestions: true,
        correctAnswers: true,
        xpEarned: true,
        subject: { select: { name: true } }, // Include subject name
        topic: { select: { name: true } },   // Include topic name
        basedOnQuestionGroup: { select: { name: true } }, // Include question group name
      },
      orderBy: {
        endTime: 'desc', // Show most recent first
      },
    });

    if (!completedSessions) {
      return NextResponse.json([], { status: 200 }); // Return empty array if none found
    }
    
    // Map to a slightly friendlier structure if needed, or return as is
    const formattedSessions = completedSessions.map(session => ({
        ...session,
        subjectName: session.subject?.name,
        topicName: session.topic?.name,
        questionGroupName: session.basedOnQuestionGroup?.name,
    }));


    return NextResponse.json(formattedSessions);

  } catch (error: any) {
    console.error("API: Error fetching completed practice sessions:", error);
    return NextResponse.json(
      { error: 'Failed to fetch completed practice sessions', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}