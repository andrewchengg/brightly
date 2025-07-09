import { NextResponse, NextRequest } from "next/server";
import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: sessionId } = params;
    const { lastActivity, timestamp } = await request.json();

    // Update session with heartbeat (using updatedAt to track activity)
    await prisma.practiceSession.update({
      where: { id: sessionId },
      data: {
        updatedAt: new Date(timestamp),
      },
    });

    console.log(`💓 Heartbeat received for session ${sessionId}`);

    return NextResponse.json({
      success: true,
      message: "Heartbeat recorded",
    });
  } catch (error) {
    console.error("❌ Heartbeat error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to record heartbeat" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
