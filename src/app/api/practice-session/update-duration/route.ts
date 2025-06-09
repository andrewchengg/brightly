import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, durationSeconds } = await request.json();

    if (!sessionId || durationSeconds === undefined) {
      return NextResponse.json(
        { error: "Session ID and duration are required" },
        { status: 400 }
      );
    }

    // Update the practice session with current duration
    const updatedSession = await prisma.practiceSession.update({
      where: { id: sessionId },
      data: {
        durationSeconds: Math.floor(durationSeconds),
        // Also update the endTime if not already set
        ...(durationSeconds > 0 && { endTime: new Date() }),
      },
    });

    return NextResponse.json({
      success: true,
      durationSeconds: updatedSession.durationSeconds,
    });
  } catch (error) {
    console.error("Error updating session duration:", error);
    return NextResponse.json(
      { error: "Failed to update session duration" },
      { status: 500 }
    );
  }
}
