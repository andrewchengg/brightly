import { NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { topicId: string } }
) {
  try {
    const topicId = parseInt(params.topicId, 10);

    if (isNaN(topicId)) {
      return NextResponse.json({ error: "Invalid topic ID" }, { status: 400 });
    }

    // Get topic info
    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      include: {
        subject: {
          select: { id: true, name: true },
        },
      },
    });

    if (!topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    // Get all questions for this topic that need review
    const questions = await prisma.question.findMany({
      where: {
        topicId,
        OR: [{ productionReady: false }, { isRefactored: false }],
      },
      include: {
        topic: { select: { id: true, name: true, subjectId: true } },
        subject: { select: { id: true, name: true } },
        questionGroup: { select: { id: true, name: true } },
        tags: { include: { tag: true } },
      },
      orderBy: [
        { createdAt: "asc" }, // oldest first
      ],
    });

    return NextResponse.json({
      topic: {
        id: topic.id,
        name: topic.name,
        subject: topic.subject,
      },
      questions,
      totalQuestions: questions.length,
    });
  } catch (error: any) {
    console.error("API: Error fetching questions for topic:", error);
    return NextResponse.json(
      { error: "Failed to fetch questions for topic", details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
