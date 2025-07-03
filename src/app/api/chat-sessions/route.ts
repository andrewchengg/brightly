import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

export async function GET() {
  const cookieStore = cookies();
  const supabase = createClient();

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const studentId = user.id;

    const chatSessions = await prisma.chatSession.findMany({
      where: {
        studentId,
        isActive: true,
      },
      orderBy: {
        lastActivity: "desc",
      },
      include: {
        messages: {
          orderBy: {
            timestamp: "asc",
          },
        },
      },
    });

    // Transform the data to include message count and last message
    const transformedSessions = chatSessions.map((session) => ({
      id: session.id,
      title: session.title,
      isActive: session.isActive,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      messageCount: session.messages.length,
      lastMessage:
        session.messages.length > 0
          ? session.messages[session.messages.length - 1]
          : null,
    }));

    return NextResponse.json({ sessions: transformedSessions });
  } catch (error: any) {
    console.error("API: Error fetching chat sessions:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch chat sessions",
        details: error.message,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST() {
  const cookieStore = cookies();
  const supabase = createClient();

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const studentId = user.id;
    const now = new Date();

    const newSession = await prisma.chatSession.create({
      data: {
        id: crypto.randomUUID(),
        studentId,
        title: "New Chat",
        isActive: true,
        lastActivity: now,
        updatedAt: now,
      },
      include: {
        messages: true,
      },
    });

    // Transform to match the expected format
    const transformedSession = {
      id: newSession.id,
      title: newSession.title,
      isActive: newSession.isActive,
      createdAt: newSession.createdAt,
      lastActivity: newSession.lastActivity,
      messageCount: 0,
      lastMessage: null,
    };

    return NextResponse.json(transformedSession, { status: 201 });
  } catch (error: any) {
    console.error("API: Error creating chat session:", error);
    return NextResponse.json(
      {
        error: "Failed to create chat session",
        details: error.message,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
