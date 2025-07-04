import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const startDate = searchParams.get('startDate') || new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
  const endDate = searchParams.get('endDate') || new Date().toISOString();

  console.log('\n[DEBUG] Data Flow Analysis');
  console.log('----------------------------------------');

  // 1. Current Time Information
  const now = new Date();
  const serverInfo = {
    currentTime: {
      local: now.toLocaleString(),
      utc: now.toUTCString(),
      iso: now.toISOString(),
      timestamp: now.getTime(),
    },
    queryRange: {
      start: startDate,
      end: endDate,
    }
  };
  console.log('\n1. Server Information:', serverInfo);

  // 2. Raw Practice Sessions
  const supabase = createRouteHandlerClient({ cookies });
  const { data: sessions, error: sessionsError } = await supabase
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
    .gte('startTime', startDate)
    .lte('startTime', endDate)
    .order('startTime', { ascending: true });

  if (sessionsError) {
    console.error('Error fetching sessions:', sessionsError);
    return NextResponse.json({ error: sessionsError.message }, { status: 500 });
  }

  const rawSessions = sessions?.map(s => ({
    id: s.id,
    student: s.Student?.name,
    startTime: {
      raw: s.startTime,
      local: new Date(s.startTime).toLocaleString(),
      utc: new Date(s.startTime).toUTCString()
    },
    endTime: s.endTime ? {
      raw: s.endTime,
      local: new Date(s.endTime).toLocaleString(),
      utc: new Date(s.endTime).toUTCString()
    } : null,
    questions: s.totalQuestions,
    correct: s.correctAnswers,
    duration: s.durationSeconds
  }));

  console.log('\n2. Raw Practice Sessions:', rawSessions);

  // 3. Daily Stats Processing
  const dailyStats = new Map();
  const startDateTime = new Date(startDate);
  const endDateTime = new Date(endDate);

  // Initialize all dates
  let currentDate = new Date(startDateTime);
  while (currentDate <= endDateTime) {
    const dateKey = currentDate.toISOString().split('T')[0];
    dailyStats.set(dateKey, {
      date: dateKey,
      questions: 0,
      correctAnswers: 0,
      timeSpent: 0,
      accuracy: 0
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Process sessions into daily stats
  const processedDays = new Map();
  sessions?.forEach(session => {
    const sessionDate = new Date(session.startTime).toISOString().split('T')[0];
    const stats = dailyStats.get(sessionDate) || {
      date: sessionDate,
      questions: 0,
      correctAnswers: 0,
      timeSpent: 0,
      accuracy: 0
    };
    
    stats.questions += session.totalQuestions || 0;
    stats.correctAnswers += session.correctAnswers || 0;
    stats.timeSpent += session.durationSeconds || 0;
    stats.accuracy = stats.questions > 0 
      ? Math.round((stats.correctAnswers / stats.questions) * 100) 
      : 0;

    processedDays.set(sessionDate, stats);
  });

  // 4. Final Data Structure
  const finalData = {
    serverInfo,
    rawSessions,
    dailyStats: Array.from(dailyStats.values()),
    processedDays: Array.from(processedDays.values()),
    dateAnalysis: {
      startDate: {
        raw: startDate,
        parsed: new Date(startDate).toLocaleString(),
        utc: new Date(startDate).toUTCString()
      },
      endDate: {
        raw: endDate,
        parsed: new Date(endDate).toLocaleString(),
        utc: new Date(endDate).toUTCString()
      },
      totalDays: Math.ceil((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60 * 24))
    }
  };

  console.log('\n3. Final Data Structure:', finalData);

  return NextResponse.json(finalData);
} 