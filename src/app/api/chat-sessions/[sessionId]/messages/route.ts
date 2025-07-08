import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PrismaClient } from "@/generated/prisma";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

// GET /api/chat-sessions/[sessionId]/messages - Get messages for a specific chat session
export async function GET(
  req: NextRequest,
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

    // Verify session belongs to user
    const session = await prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        studentId: user.id,
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Chat session not found or access denied" },
        { status: 404 }
      );
    }

    // Get query parameters for pagination
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Fetch messages for the session
    const messages = await prisma.chatMessage.findMany({
      where: {
        sessionId: sessionId,
      },
      orderBy: {
        timestamp: "asc", // Chronological order for chat display
      },
      take: limit,
      skip: offset,
    });

    return NextResponse.json({
      messages,
      session: {
        id: session.id,
        title: session.title,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
      },
      success: true,
    });
  } catch (error: any) {
    console.error("Error fetching chat messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat messages" },
      { status: 500 }
    );
  }
}
