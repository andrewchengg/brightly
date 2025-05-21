import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

interface XpRequestBody {
  xpAmount: number;
  activityType?: string;
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
    const { xpAmount, activityType } = await req.json() as XpRequestBody;
    
    if (!xpAmount || typeof xpAmount !== 'number') {
      return NextResponse.json({ error: 'Invalid XP amount' }, { status: 400 });
    }
    
    // First, get the user's current XP
    const { data: userData, error: userError } = await supabase
      .from('Student')
      .select('xpPoints')
      .eq('id', userId)
      .single();
      
    if (userError) {
      console.error('Error fetching user data:', userError);
      return NextResponse.json({ error: 'Failed to fetch user data', details: userError }, { status: 500 });
    }
    
    // Calculate new XP total
    const currentXP = userData?.xpPoints || 0;
    const newXP = currentXP + xpAmount;
    
    // Calculate level information
    const oldLevel = Math.floor(currentXP / 1000) + 1;
    const newLevel = Math.floor(newXP / 1000) + 1;
    const leveledUp = newLevel > oldLevel;
    
    // Update user's XP in the database
    const { data, error } = await supabase
      .from('Student')
      .update({ xpPoints: newXP, updatedAt: new Date().toISOString() })
      .eq('id', userId);
      
    if (error) {
      console.error('Error updating XP:', error);
      return NextResponse.json({ error: 'Failed to update XP', details: error }, { status: 500 });
    }
    
    // Log the XP award in an activity log if such a table exists
    // We'll skip activity logging for now since it's not critical to the core functionality
    /* 
    try {
      await supabase.from('activity_logs').insert({
        user_id: userId,
        activity_type: activityType || 'xp_earned',
        xp_amount: xpAmount,
        created_at: new Date().toISOString()
      });
    } catch (logError) {
      // Continue even if logging fails
      console.error('Error logging activity:', logError);
    }
    */
    
    return NextResponse.json({
      success: true,
      currentXp: newXP,
      awarded: xpAmount,
      level: newLevel,
      leveledUp: leveledUp,
      previousLevel: oldLevel,
      nextLevelXp: newLevel * 1000,
      progressToNextLevel: ((newXP - (newLevel - 1) * 1000) / 1000) * 100
    });
    
  } catch (error) {
    console.error('Error in award-xp endpoint:', error);
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 });
  }
} 