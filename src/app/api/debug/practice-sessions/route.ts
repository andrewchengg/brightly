import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });

  // Get current date in UTC
  const now = new Date();
  const utcNow = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds()
  ));

  // Get start date (7 days ago)
  const startDate = new Date(utcNow);
  startDate.setDate(startDate.getDate() - 7);
  startDate.setUTCHours(0, 0, 0, 0);

  // Set end date to end of current UTC day
  const endDate = new Date(utcNow);
  endDate.setUTCHours(23, 59, 59, 999);

  console.log('Debug Query Date Range:', {
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    now: utcNow.toISOString(),
    localNow: now.toLocaleString()
  });

  const { data: sessions, error } = await supabase
    .from('PracticeSession')
    .select(`
      id,
      startTime,
      endTime,
      totalQuestions,
      correctAnswers,
      durationSeconds,
      Student (
        id,
        name
      )
    `)
    .gte('startTime', startDate.toISOString())
    .lte('startTime', endDate.toISOString())
    .order('startTime', { ascending: true });

  if (error) {
    console.error('Error fetching practice sessions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Process and format the data for easier reading
  const formattedSessions = sessions.map(session => ({
    id: session.id,
    student: session.Student?.name,
    startTime: {
      utc: session.startTime,
      local: new Date(session.startTime).toLocaleString(),
    },
    endTime: {
      utc: session.endTime,
      local: session.endTime ? new Date(session.endTime).toLocaleString() : null,
    },
    totalQuestions: session.totalQuestions,
    correctAnswers: session.correctAnswers,
    durationSeconds: session.durationSeconds
  }));

  return NextResponse.json({
    queryRange: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      now: utcNow.toISOString(),
      localNow: now.toLocaleString()
    },
    sessions: formattedSessions
  });
} 