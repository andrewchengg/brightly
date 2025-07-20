import { NextResponse, NextRequest } from "next/server";
import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: sessionId } = params;
    const { reason, timestamp } = await request.json();

    console.log(`🗑️ Abandoning session ${sessionId} - Reason: ${reason}`);

    // Mark session as abandoned (proper ABANDONED status)
    await prisma.practiceSession.update({
      where: { id: sessionId },
      data: {
        status: "ABANDONED", // Properly mark as abandoned
        endTime: new Date(timestamp),
        abandonedAt: new Date(timestamp),
        updatedAt: new Date(timestamp),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Session marked as abandoned",
    });
  } catch (error) {
    console.error("❌ Abandon session error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to mark session as abandoned" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
