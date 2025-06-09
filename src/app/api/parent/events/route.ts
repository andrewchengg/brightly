import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all children of the parent
    const children = await prisma.student.findMany({
      where: { parentId: user.id },
      select: { id: true, name: true },
    });

    if (children.length === 0) {
      return NextResponse.json([]);
    }

    const childIds = children.map((child) => child.id);

    // Get personal events for all children
    const personalEvents = await prisma.event.findMany({
      where: {
        studentId: { in: childIds },
      },
      include: {
        student: {
          select: { name: true },
        },
      },
      orderBy: {
        startTime: "asc",
      },
    });

    // Transform personal events
    const formattedPersonalEvents = personalEvents.map((event) => ({
      id: `personal-${event.id}`,
      title: `${event.title} (${event.student?.name})`,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime.toISOString(),
      description: event.description,
      type: "personal",
      childName: event.student?.name,
    }));

    return NextResponse.json(formattedPersonalEvents);
  } catch (error) {
    console.error("Error fetching parent events:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
