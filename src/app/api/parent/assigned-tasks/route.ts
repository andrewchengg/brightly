import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get("childId");

    // Build where clause
    const whereClause: any = {
      assignedByParentId: user.id,
    };

    // If childId is provided, filter by specific child
    if (childId) {
      whereClause.studentId = childId;
    }

    // Get all practice sessions assigned by this parent
    const assignedTasks = await prisma.practiceSession.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
        topic: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transform the data for easier consumption
    const formattedTasks = assignedTasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      type: task.type,
      totalQuestions: task.totalQuestions,
      correctAnswers: task.correctAnswers,
      xpEarned: task.xpEarned,
      durationSeconds: task.durationSeconds,
      assignedAt: task.createdAt.toISOString(),
      startTime: task.startTime?.toISOString(),
      endTime: task.endTime?.toISOString(),
      child: {
        id: task.student.id,
        name: task.student.name,
        username: task.student.username,
      },
      subject: task.subject
        ? {
            id: task.subject.id,
            name: task.subject.name,
          }
        : null,
      topic: task.topic
        ? {
            id: task.topic.id,
            name: task.topic.name,
          }
        : null,
      // Calculate completion percentage for in-progress tasks
      progressPercentage:
        task.status === "IN_PROGRESS" && (task.totalQuestions || 0) > 0
          ? Math.round(
              ((task.correctAnswers || 0) / (task.totalQuestions || 1)) * 100
            )
          : task.status === "COMPLETED"
          ? 100
          : 0,
      // Calculate accuracy for completed tasks
      accuracy:
        task.status === "COMPLETED" && (task.totalQuestions || 0) > 0
          ? Math.round(
              ((task.correctAnswers || 0) / (task.totalQuestions || 1)) * 100
            )
          : null,
    }));

    // Group by status for easier display
    const groupedTasks = {
      pending: formattedTasks.filter((task) => task.status === "IN_PROGRESS"),
      inProgress: formattedTasks.filter(
        (task) => task.status === "IN_PROGRESS"
      ),
      completed: formattedTasks.filter((task) => task.status === "COMPLETED"),
      all: formattedTasks,
    };

    return NextResponse.json(groupedTasks);
  } catch (error) {
    console.error("Error fetching assigned tasks:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
