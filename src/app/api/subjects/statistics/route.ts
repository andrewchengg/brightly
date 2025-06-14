import { NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Get all subjects with their topics and question counts
    const subjects = await prisma.subject.findMany({
      include: {
        topics: {
          include: {
            _count: {
              select: {
                questions: {
                  where: {
                    OR: [{ productionReady: false }, { isRefactored: false }],
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            questions: {
              where: {
                OR: [{ productionReady: false }, { isRefactored: false }],
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Transform the data to include statistics
    const subjectsWithStats = subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      totalQuestionsForReview: subject._count.questions,
      topics: subject.topics.map((topic) => ({
        id: topic.id,
        name: topic.name,
        questionsForReview: topic._count.questions,
      })),
    }));

    return NextResponse.json({ subjects: subjectsWithStats });
  } catch (error: any) {
    console.error("API: Error fetching subjects with statistics:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch subjects with statistics",
        details: error.message,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
