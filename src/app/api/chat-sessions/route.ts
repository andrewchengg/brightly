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

    return NextResponse.json(chatSessions);
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

    const newSession = await prisma.chatSession.create({
      data: {
        studentId,
        title: "New Chat",
        isActive: true,
        lastActivity: new Date(),
      },
      include: {
        messages: true,
      },
    });

    return NextResponse.json(newSession, { status: 201 });
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
