import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

interface StreakRequestBody {
  activityType: string;
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
    const { activityType } = await req.json() as StreakRequestBody;
    
    // Get the student data
    const { data: studentData, error: userError } = await supabase
      .from('Student')
      .select('currentStreak, longestStreak, lastActivityDate')
      .eq('id', userId)
      .single();
      
    if (userError) {
      console.error('Error fetching user data:', userError);
      return NextResponse.json({ error: 'Failed to fetch user data', details: userError.message }, { status: 500 });
    }
    
    // Get current date in YYYY-MM-DD format
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to the start of the day
    
    // Calculate streak
    let newStreak = studentData.currentStreak || 0;
    let longestStreak = studentData.longestStreak || 0;
    const lastActivityDateStr = studentData.lastActivityDate;
    let lastActivityDateEpoch = 0;

    if (lastActivityDateStr) {
      const lastDate = new Date(lastActivityDateStr);
      lastDate.setHours(0,0,0,0); // Normalize
      lastActivityDateEpoch = lastDate.getTime();
    }
    
    const todayEpoch = today.getTime();
    const oneDayMilliseconds = 24 * 60 * 60 * 1000;

    if (lastActivityDateEpoch === 0) { // First activity ever
        newStreak = 1;
    } else if (todayEpoch === lastActivityDateEpoch) {
        // Activity already logged today, streak remains the same
        // (newStreak is already studentData.currentStreak)
    } else if (todayEpoch - lastActivityDateEpoch === oneDayMilliseconds) {
        // Consecutive day
        newStreak += 1;
    } else {
        // Gap in activity, reset streak
        newStreak = 1;
    }
    
    // Update longest streak if needed
    if (newStreak > longestStreak) {
      longestStreak = newStreak;
    }
    
    // Update user's streak in the database only if it's a new day of activity or first activity
    if (lastActivityDateEpoch === 0 || todayEpoch > lastActivityDateEpoch) {
        const { error: updateError } = await supabase
          .from('Student')
          .update({
            currentStreak: newStreak,
            longestStreak: longestStreak,
            lastActivityDate: today.toISOString().split('T')[0], // Store as YYYY-MM-DD
            updatedAt: new Date().toISOString()
          })
          .eq('id', userId);
          
        if (updateError) {
          console.error('Error updating streak:', updateError);
          return NextResponse.json({ error: 'Failed to update streak', details: updateError.message }, { status: 500 });
        }
    }
    
    return NextResponse.json({
      success: true,
      currentStreak: newStreak,
      longestStreak: longestStreak,
      lastActivityDate: today.toISOString().split('T')[0]
    });
    
  } catch (error: any) {
    console.error('Error in update-streak endpoint:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}