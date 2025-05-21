import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

interface StreakRequestBody {
  activityType: string;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Get request body
    const { activityType } = await req.json() as StreakRequestBody;
    
    // Get the student data
    const { data: studentData, error: userError } = await supabase
      .from('Student')
      .select('currentStreak, longestStreak, lastActivityDate')
      .eq('id', userId)
      .single();
      
    if (userError) {
      console.error('Error fetching user data:', userError);
      return NextResponse.json({ error: 'Failed to fetch user data', details: userError }, { status: 500 });
    }
    
    // Get current date in YYYY-MM-DD format
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    // Calculate streak
    let newStreak = studentData.currentStreak || 0;
    let longestStreak = studentData.longestStreak || 0;
    const lastActivityDate = studentData.lastActivityDate 
      ? new Date(studentData.lastActivityDate) 
      : null;
    
    if (lastActivityDate) {
      lastActivityDate.setHours(0, 0, 0, 0);
      
      // Calculate days between last activity and today
      const timeDiff = today.getTime() - lastActivityDate.getTime();
      const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
      
      if (daysDiff === 1) {
        // Consecutive day - increase streak
        newStreak += 1;
      } else if (daysDiff === 0) {
        // Same day - maintain streak (already logged in today)
        // Do nothing
      } else {
        // More than one day - reset streak
        newStreak = 1;
      }
    } else {
      // First activity ever - start streak at 1
      newStreak = 1;
    }
    
    // Update longest streak if needed
    if (newStreak > longestStreak) {
      longestStreak = newStreak;
    }
    
    // Update user's streak in the database
    const { error: updateError } = await supabase
      .from('Student')
      .update({
        currentStreak: newStreak,
        longestStreak: longestStreak,
        lastActivityDate: todayStr,
        updatedAt: new Date().toISOString()
      })
      .eq('id', userId);
      
    if (updateError) {
      console.error('Error updating streak:', updateError);
      return NextResponse.json({ error: 'Failed to update streak', details: updateError }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      currentStreak: newStreak,
      longestStreak: longestStreak,
      lastActivityDate: todayStr
    });
    
  } catch (error) {
    console.error('Error in update-streak endpoint:', error);
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 });
  }
} 