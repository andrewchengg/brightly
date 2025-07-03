import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PrismaClient } from "@/generated/prisma";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

// GET /api/chat-sessions - Get all chat sessions for the authenticated user
export async function GET(req: NextRequest) {
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

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Fetch chat sessions for the user
    const chatSessions = await prisma.chatSession.findMany({
      where: {
        studentId: user.id,
      },
      include: {
        messages: {
          orderBy: {
            timestamp: "desc",
          },
          take: 1, // Just the latest message for preview
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: {
        lastActivity: "desc",
      },
      take: limit,
      skip: offset,
    });

    // Transform the data for frontend consumption
    const sessionsWithPreview = chatSessions.map((session) => ({
      id: session.id,
      title: session.title,
      isActive: session.isActive,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      messageCount: session._count.messages,
      lastMessage: session.messages[0] || null,
    }));

    return NextResponse.json({
      sessions: sessionsWithPreview,
      success: true,
    });
  } catch (error: any) {
    console.error("Error fetching chat sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat sessions" },
      { status: 500 }
    );
  }
}

// POST /api/chat-sessions - Create a new chat session
export async function POST(req: NextRequest) {
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

    const { title } = await req.json();

    // Create new chat session
    const chatSession = await prisma.chatSession.create({
      data: {
        studentId: user.id,
        title: title || null,
      },
    });

    return NextResponse.json({
      session: chatSession,
      success: true,
    });
  } catch (error: any) {
    console.error("Error creating chat session:", error);
    return NextResponse.json(
      { error: "Failed to create chat session" },
      { status: 500 }
    );
  }
}
