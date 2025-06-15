// src/app/api/user/update-streak/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

interface StreakRequestBody {
  activityType: string;
}

// Function to calculate current streak based on actual practice history
async function calculateCurrentStreak(userId: string): Promise<number> {
  // Get all completed practice sessions ordered by date
  const completedSessions = await prisma.practiceSession.findMany({
    where: {
      studentId: userId,
      status: "COMPLETED",
      endTime: { not: null },
    },
    select: {
      endTime: true,
    },
    orderBy: {
      endTime: "desc",
    },
  });

  if (completedSessions.length === 0) {
    return 0;
  }

  // Group sessions by date (YYYY-MM-DD format)
  const practiceDates = new Set<string>();
  completedSessions.forEach((session) => {
    if (session.endTime) {
      const dateKey = session.endTime.toISOString().split("T")[0];
      practiceDates.add(dateKey);
    }
  });

  // Convert to sorted array (most recent first)
  const sortedDates = Array.from(practiceDates).sort((a, b) =>
    b.localeCompare(a)
  );

  if (sortedDates.length === 0) {
    return 0;
  }

  const today = new Date();
  const todayDateString = today.toISOString().split("T")[0];

  // Check if user practiced today
  let currentStreak = 0;
  let checkDate = new Date(today);

  // Start checking from today backwards
  for (let i = 0; i < sortedDates.length + 1; i++) {
    const checkDateString = checkDate.toISOString().split("T")[0];

    if (sortedDates.includes(checkDateString)) {
      currentStreak++;
      // Move to previous day
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      // If this is the first day we're checking (today) and there's no practice,
      // check if they practiced yesterday to continue the streak
      if (i === 0) {
        checkDate.setDate(checkDate.getDate() - 1);
        continue;
      } else {
        // Gap found, stop counting
        break;
      }
    }
  }

  return currentStreak;
}

export async function POST(req: NextRequest) {
  const cookieStore = cookies();

  const supabase = createClient();

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized: " + (authError?.message || "No user session") },
        { status: 401 }
      );
    }

    const userId = user.id;

    const { data: studentData, error: studentFetchError } = await supabase
      .from("Student")
      .select("currentStreak, longestStreak, lastActivityDate")
      .eq("id", userId)
      .single();

    if (studentFetchError) {
      console.error(
        "Error fetching student data for streak:",
        studentFetchError
      );
      return NextResponse.json(
        {
          error: "Failed to fetch student data",
          details: studentFetchError.message,
        },
        { status: 500 }
      );
    }

    const today = new Date();
    const todayDateString = today.toISOString().split("T")[0]; // YYYY-MM-DD format for today

    // Calculate the actual current streak based on practice history
    const actualCurrentStreak = await calculateCurrentStreak(userId);

    let currentStreak = actualCurrentStreak;
    let longestStreak = studentData.longestStreak || 0;
    const lastActivityDate = studentData.lastActivityDate; // This is a timestamp from DB

    // Convert lastActivityDate timestamp to YYYY-MM-DD format for comparison
    let lastActivityDateString = null;
    if (lastActivityDate) {
      const lastActivityDateObj = new Date(lastActivityDate);
      lastActivityDateString = lastActivityDateObj.toISOString().split("T")[0];
    }

    let needsDatabaseUpdate = false;
    let newLastActivityDate = lastActivityDate;

    // Check if this is a new activity today
    if (lastActivityDateString !== todayDateString) {
      // New activity today, update last activity date
      newLastActivityDate = todayDateString;
      needsDatabaseUpdate = true;

      // Recalculate streak to account for today's activity
      currentStreak = await calculateCurrentStreak(userId);

      console.log(
        `Streak: New activity today. Recalculated streak: ${currentStreak}. Last activity: ${newLastActivityDate}`
      );
    } else {
      // Activity already logged today, use calculated streak
      console.log(
        `Streak: Activity already logged today (${todayDateString}). Current streak: ${currentStreak}`
      );
    }

    // Update longest streak if current streak surpasses it
    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
      needsDatabaseUpdate = true; // If longestStreak changed, we must update DB
      console.log(`Streak: New longest streak: ${longestStreak}`);
    }

    // Always update if the calculated streak differs from stored streak
    if (currentStreak !== studentData.currentStreak) {
      needsDatabaseUpdate = true;
    }

    if (needsDatabaseUpdate) {
      const { error: updateError } = await supabase
        .from("Student")
        .update({
          currentStreak: currentStreak,
          longestStreak: longestStreak,
          lastActivityDate: newLastActivityDate || todayDateString,
          updatedAt: new Date().toISOString(),
        })
        .eq("id", userId);

      if (updateError) {
        console.error("Error updating streak in DB:", updateError);
        return NextResponse.json(
          {
            error: "Failed to update streak in DB",
            details: updateError.message,
          },
          { status: 500 }
        );
      }
      console.log(
        `DB Streak updated for user ${userId}: Current: ${currentStreak}, Longest: ${longestStreak}, Last Activity: ${
          newLastActivityDate || todayDateString
        }`
      );
    }

    return NextResponse.json({
      success: true,
      currentStreak: currentStreak,
      longestStreak: longestStreak,
      lastActivityDate: newLastActivityDate || todayDateString,
    });
  } catch (error: any) {
    console.error("Error in update-streak endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
