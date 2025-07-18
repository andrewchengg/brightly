// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PracticeSessionStatus, PracticeSessionType } from "@/generated/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json(
        { error: "Student ID is required" },
        { status: 400 }
      );
    }

    const assignedTasks = await prisma.practiceSession.findMany({
      where: {
        studentId: studentId,
        status: PracticeSessionStatus.IN_PROGRESS,
        assignedByParentId: { not: null },
      },
      include: {
        subject: { select: { id: true, name: true } },
        topic: { select: { id: true, name: true } },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    });

    const formattedTasks = assignedTasks.map((task) => {
      let mockExamPaperIdentifier: "paper1" | "paper2" | null = null;
      if (task.type === PracticeSessionType.MOCK_EXAM) {
        if (task.title?.toLowerCase().includes("paper 1"))
          mockExamPaperIdentifier = "paper1";
        else if (task.title?.toLowerCase().includes("paper 2"))
          mockExamPaperIdentifier = "paper2";
      }

      return {
        ...task,
        subjectName: task.subject?.name,
        topicName: task.topic?.name,
        mockExamPaperIdentifier,
      };
    });

    return NextResponse.json(formattedTasks);
  } catch (error) {
    console.error("Error fetching assigned practice sessions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
