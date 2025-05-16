import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

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
    const { xpAmount, activityType } = await req.json();
    
    if (!xpAmount || typeof xpAmount !== 'number') {
      return NextResponse.json({ error: 'Invalid XP amount' }, { status: 400 });
    }
    
    // First, get the user's current XP
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('xp_points')
      .eq('id', userId)
      .single();
      
    if (userError) {
      console.error('Error fetching user data:', userError);
      return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
    }
    
    // Calculate new XP total
    const currentXP = userData?.xp_points || 0;
    const newXP = currentXP + xpAmount;
    
    // Update user's XP in the database
    const { data, error } = await supabase
      .from('users')
      .update({ xp_points: newXP, updated_at: new Date().toISOString() })
      .eq('id', userId);
      
    if (error) {
      console.error('Error updating XP:', error);
      return NextResponse.json({ error: 'Failed to update XP' }, { status: 500 });
    }
    
    // Log the XP award in an activity log if such a table exists
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
    
    return NextResponse.json({
      success: true,
      current_xp: newXP,
      awarded: xpAmount
    });
    
  } catch (error) {
    console.error('Error in award-xp endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 