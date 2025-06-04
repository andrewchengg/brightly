// src/app/api/practice-sessions/[id]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { PrismaClient, PracticeSessionStatus } from "@/generated/prisma";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

const prisma = new PrismaClient();

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
    const { status, endTime, score, correctAnswers, xpEarned, totalQuestions } =
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
    if (
      status &&
      PracticeSessionStatus[status as keyof typeof PracticeSessionStatus]
    ) {
      updateData.status = status;
      console.log(
        `API PATCH /practice-sessions: Updating status to ${status} for session ${practiceSessionId}`
      );
    }
    if (endTime) updateData.endTime = new Date(endTime);
    if (score !== undefined) updateData.score = Number(score);
    if (correctAnswers !== undefined)
      updateData.correctAnswers = Number(correctAnswers);
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
          score: updatedPracticeSession.score || 0,
          submittedAt: updatedPracticeSession.endTime || new Date(),
        },
        create: {
          score: updatedPracticeSession.score || 0,
          practiceSessionId: updatedPracticeSession.id,
          studentId: updatedPracticeSession.studentId,
          submittedAt: updatedPracticeSession.endTime || new Date(),
        },
      });
      console.log(
        `API PATCH /practice-sessions: Upserted Result for session ${practiceSessionId}`
      );
    }

    console.log(
      `API PATCH /practice-sessions: Successfully updated session ${practiceSessionId}. Status: ${updatedPracticeSession.status}, Score: ${updatedPracticeSession.score}, Correct: ${updatedPracticeSession.correctAnswers}, TotalQ: ${updatedPracticeSession.totalQuestions}`
    );
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
