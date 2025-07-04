import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

interface Student {
  id: string;
  name: string;
}

interface PracticeSession {
  id: string;
  startTime: string;
  endTime: string | null;
  totalQuestions: number;
  correctAnswers: number;
  durationSeconds: number;
  Student: Student | null;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function debugSessions() {
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

  console.log('\nQuerying Practice Sessions with date range:');
  console.log('----------------------------------------');
  console.log('Current time (Local):', now.toLocaleString());
  console.log('Current time (UTC):', utcNow.toISOString());
  console.log('Start date (UTC):', startDate.toISOString());
  console.log('End date (UTC):', endDate.toISOString());
  console.log('----------------------------------------\n');

  const { data: rawSessions, error } = await supabase
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
    return;
  }

  // Type assertion after validating the structure
  const sessions = (rawSessions || []) as unknown as PracticeSession[];
  console.log('Found', sessions.length, 'practice sessions:\n');

  sessions.forEach((session, index) => {
    const startLocal = new Date(session.startTime).toLocaleString();
    const endLocal = session.endTime ? new Date(session.endTime).toLocaleString() : 'N/A';
    
    console.log(`Session ${index + 1}:`);
    console.log('----------------------------------------');
    console.log('Student:', session.Student?.name);
    console.log('Start Time (UTC):', session.startTime);
    console.log('Start Time (Local):', startLocal);
    console.log('End Time (UTC):', session.endTime);
    console.log('End Time (Local):', endLocal);
    console.log('Questions:', session.totalQuestions);
    console.log('Correct:', session.correctAnswers);
    console.log('Duration:', session.durationSeconds, 'seconds');
    console.log('----------------------------------------\n');
  });
}

debugSessions().catch(console.error); 