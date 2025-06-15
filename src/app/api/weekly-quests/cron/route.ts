import { NextResponse } from 'next/server';
import { manageWeeklyQuestRotation } from '@/lib/weekly-quest-service-raw';

// This endpoint can be called by cron services (like Vercel Cron, cron-job.org, etc.)
// to automatically rotate weekly quests every Monday
export async function GET() {
  try {
    console.log('🕐 Weekly Quest Cron Job Starting...');
    
    // Check for authorization header (optional security)
    const authHeader = process.env.CRON_SECRET;
    // if (authHeader && request.headers.get('Authorization') !== `Bearer ${authHeader}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const result = await manageWeeklyQuestRotation();
    
    console.log('✅ Weekly Quest Cron Job Completed Successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Weekly quest rotation completed successfully',
      timestamp: new Date().toISOString(),
      ...result
    });
    
  } catch (error: any) {
    console.error('❌ Weekly Quest Cron Job Failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Weekly quest rotation failed',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Also support POST method for webhook compatibility
export async function POST() {
  return await GET();
} 