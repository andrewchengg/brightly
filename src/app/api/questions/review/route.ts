// src/app/api/questions/review/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { PrismaClient } from "@/generated/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings"; // Assuming you have this

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(
    searchParams.get("limit") || ITEM_PER_PAGE.toString(),
    10
  );
  const subjectId = searchParams.get("subjectId");
  const skip = (page - 1) * limit;

  try {
    const whereCondition: any = {
      productionReady: false,
    };

    // Add subject filter if provided
    if (subjectId) {
      whereCondition.subjectId = parseInt(subjectId, 10);
    }

    const questions = await prisma.question.findMany({
      where: whereCondition,
      include: {
        topic: { select: { id: true, name: true, subjectId: true } },
        subject: { select: { id: true, name: true } },
        questionGroup: { select: { id: true, name: true } },
        tags: { include: { tag: true } },
      },
      orderBy: {
        createdAt: "asc", // Or by ID, or some other deterministic order
      },
      skip,
      take: limit,
    });

    const totalQuestions = await prisma.question.count({
      where: whereCondition,
    });

    return NextResponse.json({
      questions,
      totalQuestions,
      currentPage: page,
      totalPages: Math.ceil(totalQuestions / limit),
    });
  } catch (error: any) {
    console.error("API: Error fetching questions for review:", error);
    return NextResponse.json(
      { error: "Failed to fetch questions for review", details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
