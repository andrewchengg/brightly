import { NextResponse } from 'next/server';
import { resetWeeklyQuests } from '@/lib/weekly-quest-service-raw';

export async function GET() {
  try {
    // Check if it's Monday (start of week)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    if (dayOfWeek !== 1) {
      return NextResponse.json({ 
        message: 'Not Monday - weekly reset skipped',
        currentDay: dayOfWeek 
      });
    }

    await resetWeeklyQuests();

    return NextResponse.json({ 
      success: true,
      message: 'Weekly quests reset successfully',
      timestamp: now.toISOString()
    });
  } catch (error: any) {
    console.error('Error during weekly reset:', error);
    return NextResponse.json(
      { error: 'Failed to reset weekly quests', details: error.message },
      { status: 500 }
    );
  }
}

// For manual trigger
export async function POST() {
  try {
    await resetWeeklyQuests();

    return NextResponse.json({ 
      success: true,
      message: 'Weekly quests reset manually triggered',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error during manual weekly reset:', error);
    return NextResponse.json(
      { error: 'Failed to reset weekly quests', details: error.message },
      { status: 500 }
    );
  }
} 