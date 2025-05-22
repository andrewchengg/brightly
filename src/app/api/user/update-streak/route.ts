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
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) { try { cookieStore.set({ name, value, ...options }) } catch (error) { /* Ignored */ }},
        remove(name: string, options: CookieOptions) { try { cookieStore.set({ name, value: '', ...options }) } catch (error) { /* Ignored */ }},
      },
    }
  );

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: ' + (authError?.message || 'No user session') }, { status: 401 });
    }
    
    const userId = user.id;
    
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
    const todayDateString = today.toISOString().split('T')[0]; // YYYY-MM-DD format for today

    let currentStreak = studentData.currentStreak || 0;
    let longestStreak = studentData.longestStreak || 0;
    const lastActivityDateString = studentData.lastActivityDate; // Should be YYYY-MM-DD from DB

    let needsDatabaseUpdate = false;
    let newLastActivityDate = lastActivityDateString;

    if (!lastActivityDateString) {
      // First activity ever for this user
      currentStreak = 1;
      newLastActivityDate = todayDateString;
      needsDatabaseUpdate = true;
      console.log(`Streak: First activity. New streak: 1. Last activity: ${newLastActivityDate}`);
    } else {
      // User has prior activity
      if (lastActivityDateString === todayDateString) {
        // Activity already logged today. Streak does NOT change.
        // lastActivityDate also does not change. No DB update needed for streak logic itself.
        console.log(`Streak: Activity already logged today (${todayDateString}). Current streak: ${currentStreak}`);
        // needsDatabaseUpdate remains false unless longestStreak changes below
      } else {
        // It's a new day for activity
        newLastActivityDate = todayDateString; // Update last activity to today
        needsDatabaseUpdate = true; // We'll be updating at least lastActivityDate

        const lastActivityDay = new Date(lastActivityDateString); // Already YYYY-MM-DD
        const dayBeforeToday = new Date(today);
        dayBeforeToday.setDate(today.getDate() - 1);
        const dayBeforeTodayString = dayBeforeToday.toISOString().split('T')[0];

        if (lastActivityDateString === dayBeforeTodayString) {
          // Consecutive day
          currentStreak += 1;
          console.log(`Streak: Consecutive day. New streak: ${currentStreak}. Last activity: ${newLastActivityDate}`);
        } else {
          // Streak broken, reset to 1
          currentStreak = 1;
          console.log(`Streak: Broken. New streak: 1. Last activity: ${newLastActivityDate}`);
        }
      }
    }
    
    // Update longest streak if current streak surpasses it
    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
      needsDatabaseUpdate = true; // If longestStreak changed, we must update DB
      console.log(`Streak: New longest streak: ${longestStreak}`);
    }
    
    if (needsDatabaseUpdate) {
      const { error: updateError } = await supabase
        .from('Student')
        .update({
          currentStreak: currentStreak,
          longestStreak: longestStreak,
          lastActivityDate: newLastActivityDate, // Always update to the new last activity date if an update occurs
          updatedAt: new Date().toISOString()
        })
        .eq('id', userId);
          
      if (updateError) {
        console.error('Error updating streak in DB:', updateError);
        return NextResponse.json({ error: 'Failed to update streak in DB', details: updateError.message }, { status: 500 });
      }
      console.log(`DB Streak updated for user ${userId}: Current: ${currentStreak}, Longest: ${longestStreak}, Last Activity: ${newLastActivityDate}`);
    }
    
    return NextResponse.json({
      success: true,
      currentStreak: currentStreak,
      longestStreak: longestStreak,
      lastActivityDate: newLastActivityDate // Return the potentially updated lastActivityDate
    });
    
  } catch (error: any) {
    console.error('Error in update-streak endpoint:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}