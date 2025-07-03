// src/app/api/practice-sessions/[id]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { PrismaClient, PracticeSessionStatus } from "@/generated/prisma";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

const prisma = new PrismaClient();

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

// Function to update streak in database
async function updateStreakInDatabase(userId: string): Promise<void> {
  const supabase = createClient();

  // Get current student data
  const { data: studentData, error: studentFetchError } = await supabase
    .from("Student")
    .select("currentStreak, longestStreak, lastActivityDate")
    .eq("id", userId)
    .single();

  if (studentFetchError) {
    console.error(
      "Error fetching student data for streak update:",
      studentFetchError
    );
    return;
  }

  // Calculate the actual current streak based on practice history
  const recalculatedStreak = await calculateCurrentStreak(userId);

  // Keep the longest streak as-is, but ensure it's at least as long as the current streak
  const longestStreak = Math.max(
    studentData.longestStreak || 0,
    recalculatedStreak
  );
  const today = new Date().toISOString().split("T")[0];

  // Update the database with the recalculated values
  const { error: updateError } = await supabase
    .from("Student")
    .update({
      currentStreak: recalculatedStreak,
      longestStreak: longestStreak,
      lastActivityDate: today,
      updatedAt: new Date().toISOString(),
    })
    .eq("id", userId);

  if (updateError) {
    console.error("Error updating streak in database:", updateError);
  } else {
    console.log(
      `Streak updated for user ${userId}: Current: ${recalculatedStreak}, Longest: ${longestStreak}`
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const cookieStore = cookies();
  const supabase = createClient();
  try {
    const { id: practiceSessionId } = params;
    const body = await request.json();
    // Ensure totalQuestions is destructured if sent for update
    const { status, endTime, durationSeconds, correctAnswers, totalMarksEarned, totalPossibleMarks, xpEarned, totalQuestions } =
      body;

    const {
      data: { user: authUser },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionToUpdate = await prisma.practiceSession.findUnique({
      where: { id: practiceSessionId },
    });
    if (!sessionToUpdate) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (sessionToUpdate?.studentId !== authUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updateData: any = { updatedAt: new Date() };
    if (status !== undefined) {
      updateData.status = status;
      console.log(
        `API PATCH /practice-sessions: Updating status to ${status} for session ${practiceSessionId}`
      );
    }
    if (endTime !== undefined) updateData.endTime = new Date(endTime);
    if (durationSeconds !== undefined) updateData.durationSeconds = Number(durationSeconds);
    if (correctAnswers !== undefined) updateData.correctAnswers = Number(correctAnswers);
    if (totalMarksEarned !== undefined) updateData.totalMarksEarned = Number(totalMarksEarned);
    if (totalPossibleMarks !== undefined) updateData.totalPossibleMarks = Number(totalPossibleMarks);
    if (xpEarned !== undefined) updateData.xpEarned = Number(xpEarned);

    // Crucially, handle totalQuestions if it's part of the PATCH payload
    // This is typically set when questions are first loaded for a session, or when finalizing a "both papers" exam.
    if (totalQuestions !== undefined) {
      updateData.totalQuestions = Number(totalQuestions);
      console.log(
        `API PATCH /practice-sessions: Updating totalQuestions to ${updateData.totalQuestions} for session ${practiceSessionId}`
      );
    }

    const updatedPracticeSession = await prisma.practiceSession.update({
      where: { id: practiceSessionId },
      data: updateData,
      include: { student: true },
    });

    // Create/Update Result record when session is COMPLETED
    if (
      updatedPracticeSession.status === PracticeSessionStatus.COMPLETED &&
      updatedPracticeSession.studentId
    ) {
      await prisma.result.upsert({
        where: { practiceSessionId: updatedPracticeSession.id },
        update: {
          totalMarksEarned: updatedPracticeSession.totalMarksEarned || 0,
          totalPossibleMarks: updatedPracticeSession.totalPossibleMarks || 0,
          submittedAt: updatedPracticeSession.endTime || new Date(),
        },
        create: {
          studentId: updatedPracticeSession.studentId,
          practiceSessionId: updatedPracticeSession.id,
          totalMarksEarned: updatedPracticeSession.totalMarksEarned || 0,
          totalPossibleMarks: updatedPracticeSession.totalPossibleMarks || 0,
          submittedAt: updatedPracticeSession.endTime || new Date(),
        },
      });
      console.log(
        `API PATCH /practice-sessions: Upserted Result for session ${practiceSessionId}`
      );

      // Update streak when session is completed
      try {
        await updateStreakInDatabase(updatedPracticeSession.studentId);
        console.log(
          `API PATCH /practice-sessions: Updated streak for user ${updatedPracticeSession.studentId} after session completion`
        );
      } catch (error) {
        console.error("Error updating streak after session completion:", error);
        // Don't fail the request if streak update fails
      }
    }

    console.log(`Practice session ${updatedPracticeSession.id} updated: ${updatedPracticeSession.status}, Marks: ${updatedPracticeSession.totalMarksEarned}/${updatedPracticeSession.totalPossibleMarks}, Correct: ${updatedPracticeSession.correctAnswers}, TotalQ: ${updatedPracticeSession.totalQuestions}`);
    return NextResponse.json(updatedPracticeSession);
  } catch (error: any) {
    console.error("API PATCH Error for /practice-sessions/[id]:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to update practice session",
        details: error.stack,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookieStore = cookies();

  const supabase = createClient();

  try {
    const { id: practiceSessionId } = params;

    if (!practiceSessionId) {
      return NextResponse.json(
        { error: "Practice Session ID is required" },
        { status: 400 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.warn(
        "API DELETE /practice-sessions/[id]: Unauthorized access attempt."
      );
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionToDelete = await prisma.practiceSession.findUnique({
      where: { id: practiceSessionId },
      select: { studentId: true },
    });

    if (!sessionToDelete) {
      return NextResponse.json(
        { message: "Practice session not found" },
        { status: 404 }
      );
    }

    if (sessionToDelete.studentId !== user.id) {
      console.warn(
        `API DELETE /practice-sessions/[id]: Forbidden. User ${user.id} tried to delete session ${practiceSessionId} owned by ${sessionToDelete.studentId}.`
      );
      return NextResponse.json(
        { error: "Forbidden: You can only delete your own practice sessions" },
        { status: 403 }
      );
    }

    await prisma.studentAnswer.deleteMany({
      where: { practiceSessionId: practiceSessionId },
    });

    await prisma.result.deleteMany({
      where: { practiceSessionId: practiceSessionId },
    });

    await prisma.practiceSession.delete({
      where: { id: practiceSessionId },
    });

    console.log("API: PracticeSession deleted:", practiceSessionId);
    return NextResponse.json(
      { message: "Practice session discarded successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("API: Error deleting practice session:", error);
    if (error.code === "P2025") {
      return NextResponse.json(
        { message: "Practice session already deleted or not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      {
        error: "Failed to delete practice session",
        details: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
