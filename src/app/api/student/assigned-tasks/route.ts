import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { PrismaClient } from "@/generated/prisma";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the student record
    const student = await prisma.student.findUnique({
      where: { id: user.id },
      select: { id: true, name: true },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Get all practice sessions assigned to this student by parents
    const assignedTasks = await prisma.practiceSession.findMany({
      where: {
        studentId: student.id,
        assignedByParentId: { not: null }, // Only parent-assigned tasks
      },
      include: {
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
        assignedByParent: {
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
      assignedBy: task.assignedByParent
        ? {
            id: task.assignedByParent.id,
            name: task.assignedByParent.name,
          }
        : null,
      // Calculate accuracy for completed tasks
      accuracy:
        task.status === "COMPLETED" && (task.totalQuestions || 0) > 0
          ? Math.round(
              ((task.correctAnswers || 0) / (task.totalQuestions || 1)) * 100
            )
          : null,
      // Calculate time spent in minutes
      timeSpentMinutes: task.durationSeconds
        ? Math.round(task.durationSeconds / 60)
        : null,
    }));

    // Group by status for easier display
    const groupedTasks = {
      pending: formattedTasks.filter((task) => task.status === "NOT_STARTED"),
      inProgress: formattedTasks.filter(
        (task) => task.status === "IN_PROGRESS"
      ),
      completed: formattedTasks.filter((task) => task.status === "COMPLETED"),
      all: formattedTasks,
    };

    return NextResponse.json(groupedTasks);
  } catch (error) {
    console.error("Error fetching student assigned tasks:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
