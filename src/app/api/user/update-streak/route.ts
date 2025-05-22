// src/app/api/user/update-streak/route.ts
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
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) { /* Ignored for server components */ }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) { /* Ignored for server components */ }
        },
      },
    }
  );

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: ' + (authError?.message || 'No user session') }, { status: 401 });
    }
    
    const userId = user.id;
    const { activityType } = await req.json() as StreakRequestBody; // activityType not currently used but kept
    
    const { data: studentData, error: studentFetchError } = await supabase
      .from('Student')
      .select('currentStreak, longestStreak, lastActivityDate')
      .eq('id', userId)
      .single();
      
    if (studentFetchError) {
      console.error('Error fetching student data for streak:', studentFetchError);
      return NextResponse.json({ error: 'Failed to fetch student data', details: studentFetchError.message }, { status: 500 });
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let newStreak = studentData.currentStreak || 0;
    let longestStreak = studentData.longestStreak || 0;
    const lastActivityDateStr = studentData.lastActivityDate;
    let lastActivityDateEpoch = 0;

    if (lastActivityDateStr) {
      const lastDate = new Date(lastActivityDateStr);
      lastDate.setHours(0,0,0,0);
      lastActivityDateEpoch = lastDate.getTime();
    }
    
    const todayEpoch = today.getTime();
    const oneDayMilliseconds = 24 * 60 * 60 * 1000;

    if (lastActivityDateEpoch === 0) {
        newStreak = 1;
    } else if (todayEpoch === lastActivityDateEpoch) {
        // Activity already logged today
    } else if (todayEpoch - lastActivityDateEpoch === oneDayMilliseconds) {
        newStreak += 1;
    } else {
        newStreak = 1; // Streak broken
    }
    
    if (newStreak > longestStreak) {
      longestStreak = newStreak;
    }
    
    if (lastActivityDateEpoch === 0 || todayEpoch > lastActivityDateEpoch) {
        const { error: updateError } = await supabase
          .from('Student')
          .update({
            currentStreak: newStreak,
            longestStreak: longestStreak,
            lastActivityDate: today.toISOString().split('T')[0],
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