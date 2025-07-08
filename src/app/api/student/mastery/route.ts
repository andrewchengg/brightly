// src/app/api/student/mastery/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { PrismaClient } from "@/generated/prisma";

export const dynamic = "force-dynamic";

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

    // Get all topics for the subject
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

    // Simple mastery calculation for each topic
    const result = [];

    for (const topic of topics) {
      // Count total attempts and correct answers for this topic
      const totalAttempts = await prisma.studentAnswer.count({
        where: {
          practiceSession: {
            studentId: studentId,
          },
          question: {
            topicId: topic.id,
          },
        },
      });

      const correctAnswers = await prisma.studentAnswer.count({
        where: {
          practiceSession: {
            studentId: studentId,
          },
          question: {
            topicId: topic.id,
          },
          isCorrect: true,
        },
      });

      // Simple formula: (Correct / Total) × 100
      const masteryPercentage =
        totalAttempts > 0
          ? Math.round((correctAnswers / totalAttempts) * 100)
          : 0;

      result.push({
        topicId: topic.id,
        topicName: topic.name,
        subjectId: topic.subject.id,
        subjectName: topic.subject.name,
        masteryPercentage,
        questionsAttempted: totalAttempts,
        questionsCorrect: correctAnswers,
      });
    }

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
