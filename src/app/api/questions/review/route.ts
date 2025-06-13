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
  const topicId = searchParams.get("topicId");
  const difficulty = searchParams.get("difficulty");
  const questionType = searchParams.get("questionType");
  const productionReady = searchParams.get("productionReady");
  const isRefactored = searchParams.get("isRefactored");
  const questionGroupId = searchParams.get("questionGroupId");
  const search = searchParams.get("search");
  const skip = (page - 1) * limit;

  try {
    const whereCondition: any = {};

    // Add filters based on query parameters
    if (
      subjectId &&
      subjectId !== "undefined" &&
      !isNaN(parseInt(subjectId, 10))
    ) {
      whereCondition.subjectId = parseInt(subjectId, 10);
    }

    if (topicId && topicId !== "undefined" && !isNaN(parseInt(topicId, 10))) {
      whereCondition.topicId = parseInt(topicId, 10);
    }

    if (difficulty && difficulty !== "undefined") {
      whereCondition.difficulty = difficulty;
    }

    if (questionType && questionType !== "undefined") {
      whereCondition.questionType = questionType;
    }

    if (
      productionReady !== null &&
      productionReady !== undefined &&
      productionReady !== "undefined"
    ) {
      whereCondition.productionReady = productionReady === "true";
    }

    if (
      isRefactored !== null &&
      isRefactored !== undefined &&
      isRefactored !== "undefined"
    ) {
      whereCondition.isRefactored = isRefactored === "true";
    }

    if (
      questionGroupId &&
      questionGroupId !== "undefined" &&
      !isNaN(parseInt(questionGroupId, 10))
    ) {
      whereCondition.questionGroupId = parseInt(questionGroupId, 10);
    }

    if (search) {
      whereCondition.text = {
        contains: search,
        mode: "insensitive",
      };
    }

    // If no specific filters are applied, default to showing questions that need review
    if (Object.keys(whereCondition).length === 0) {
      whereCondition.productionReady = false;
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
