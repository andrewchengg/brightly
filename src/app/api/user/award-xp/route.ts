import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

interface XpRequestBody {
  xpAmount: number;
  activityType?: string;
}

export async function POST(req: NextRequest) {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );

  try {
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
      return NextResponse.json({ error: 'Failed to fetch user data', details: userError.message }, { status: 500 });
    }
    
    // Calculate new XP total
    const currentXP = userData?.xpPoints || 0;
    const newXP = currentXP + xpAmount;
    
    // Calculate level information
    const oldLevel = Math.floor(currentXP / 1000) + 1;
    const newLevel = Math.floor(newXP / 1000) + 1;
    const leveledUp = newLevel > oldLevel;
    
    // Update user's XP in the database
    const { error: updateError } = await supabase
      .from('Student')
      .update({ xpPoints: newXP, updatedAt: new Date().toISOString() })
      .eq('id', userId);
      
    if (updateError) {
      console.error('Error updating XP:', updateError);
      return NextResponse.json({ error: 'Failed to update XP', details: updateError.message }, { status: 500 });
    }
    
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
    
  } catch (error: any) {
    console.error('Error in award-xp endpoint:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}