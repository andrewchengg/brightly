import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PrismaClient } from "@/generated/prisma";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    // Authenticate user
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { sessionId } = params;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Check if the session belongs to the user
    const chatSession = await prisma.chatSession.findUnique({
      where: {
        id: sessionId,
      },
    });

    if (!chatSession) {
      return NextResponse.json(
        { error: "Chat session not found" },
        { status: 404 }
      );
    }

    if (chatSession.studentId !== user.id) {
      return NextResponse.json(
        { error: "You don't have permission to delete this session" },
        { status: 403 }
      );
    }

    // Delete all messages in the session first (due to foreign key constraints)
    await prisma.chatMessage.deleteMany({
      where: {
        sessionId: sessionId,
      },
    });

    // Delete the session itself
    await prisma.chatSession.delete({
      where: {
        id: sessionId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Chat session deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting chat session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
