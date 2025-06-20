// src/app/api/student/mastery/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const subjectIdParam = searchParams.get("subjectId");

    // Get all topics for the subject first
    const topics = await prisma.topic.findMany({
      where: subjectIdParam ? { subjectId: parseInt(subjectIdParam) } : {},
      include: {
        subject: {
          select: { id: true, name: true },
        },
      },
    });

    if (topics.length === 0) {
      return NextResponse.json([]);
    }

    // Use Prisma groupBy for efficient aggregation
    const masteryStats = await prisma.studentAnswer.groupBy({
      by: ["questionId"],
      where: {
        practiceSession: {
          studentId: studentId,
        },
        question: {
          topicId: {
            in: topics.map((t) => t.id),
          },
        },
      },
      _count: {
        questionId: true,
      },
      _max: {
        isCorrect: true, // Get the latest attempt result for each question
      },
    });

    // Get question details to map to topics
    const questionIds = masteryStats.map((stat) => stat.questionId);
    const questions = await prisma.question.findMany({
      where: {
        id: {
          in: questionIds,
        },
      },
      select: {
        id: true,
        topicId: true,
      },
    });

    // Calculate mastery per topic
    const topicMastery = new Map<number, { correct: number; total: number }>();

    for (const stat of masteryStats) {
      const question = questions.find((q) => q.id === stat.questionId);
      if (!question) continue;

      const topicId = question.topicId;
      if (!topicMastery.has(topicId)) {
        topicMastery.set(topicId, { correct: 0, total: 0 });
      }

      const current = topicMastery.get(topicId)!;
      current.total += 1;
      if (stat._max.isCorrect) {
        current.correct += 1;
      }
    }

    // Format results
    const result = topics.map((topic) => {
      const stats = topicMastery.get(topic.id) || { correct: 0, total: 0 };
      return {
        topicId: topic.id,
        topicName: topic.name,
        subjectId: topic.subject.id,
        subjectName: topic.subject.name,
        masteryPercentage:
          stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("API: Error calculating student mastery:", error);
    return NextResponse.json(
      { error: "Failed to calculate student mastery", details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
