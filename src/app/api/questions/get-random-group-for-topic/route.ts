// src/app/api/questions/get-random-group-for-topic/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const topicIdParam = searchParams.get("topicId");

  if (!topicIdParam) {
    return NextResponse.json(
      { error: { message: "topicId is required" } },
      { status: 400 }
    );
  }

  const topicId = parseInt(topicIdParam, 10);
  if (isNaN(topicId)) {
    return NextResponse.json(
      { error: { message: "Invalid topicId" } },
      { status: 400 }
    );
  }

  try {
    console.log(`API: Finding a question group for topicId: ${topicId}`);

    // First, check if this topic belongs to Chinese (subjectId 4)
    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      select: { subjectId: true, name: true },
    });

    if (!topic) {
      return NextResponse.json(
        { error: { message: `Topic with ID ${topicId} not found.` } },
        { status: 404 }
      );
    }

    const isChineseTopic = topic.subjectId === 4;

    // Build where clause based on subject
    const whereClause: any = {
      topicId: topicId,
      questionGroupId: { not: null },
    };

    if (isChineseTopic) {
      // For Chinese topics, allow questions with productionReady = false
      console.log(
        `API: Chinese topic detected (${topic.name}), allowing productionReady = false`
      );
    } else {
      // For other subjects, only fetch production-ready questions
      whereClause.productionReady = true;
    }

    // Find questions belonging to this topic that also have a questionGroupId
    const questionsInTopicWithGroup = await prisma.question.findMany({
      where: whereClause,
      select: {
        questionGroupId: true,
      },
      distinct: ["questionGroupId"], // Get unique questionGroupIds
    });

    if (!questionsInTopicWithGroup || questionsInTopicWithGroup.length === 0) {
      const errorMsg = isChineseTopic
        ? `No question groups found with Chinese questions for topic ID ${topicId}.`
        : `No question groups found with production-ready questions for topic ID ${topicId}.`;

      return NextResponse.json(
        {
          error: {
            message: errorMsg,
          },
        },
        { status: 404 }
      );
    }

    const validQuestionGroupIds = questionsInTopicWithGroup
      .map((q) => q.questionGroupId)
      .filter((id) => id !== null) as number[];

    if (validQuestionGroupIds.length === 0) {
      return NextResponse.json(
        {
          error: {
            message: `No valid question groups extracted for topic ID ${topicId}.`,
          },
        },
        { status: 404 }
      );
    }

    // Now, from these valid group IDs, fetch the actual groups that have a description (passage)
    const potentialGroups = await prisma.questionGroup.findMany({
      where: {
        id: { in: validQuestionGroupIds },
        description: { not: null }, // Must have a passage
        // You might add other conditions, e.g., group.questions.some({ productionReady: true }) if not already filtered
      },
      select: {
        id: true,
        // Potentially other fields if you want to make a more informed "random" choice later
      },
    });

    if (!potentialGroups || potentialGroups.length === 0) {
      return NextResponse.json(
        {
          error: {
            message: `No question groups with actual passages found for topic ID ${topicId}. Check descriptions.`,
          },
        },
        { status: 404 }
      );
    }

    // Pick one randomly for now
    const randomIndex = Math.floor(Math.random() * potentialGroups.length);
    const selectedQuestionGroupId = potentialGroups[randomIndex].id;

    console.log(
      `API: Selected questionGroupId ${selectedQuestionGroupId} for topicId ${topicId}`
    );
    return NextResponse.json({ questionGroupId: selectedQuestionGroupId });
  } catch (error: any) {
    console.error(
      `API: Error finding question group for topic ${topicId}:`,
      error
    );
    return NextResponse.json(
      {
        error: {
          message: "Failed to find a suitable question group",
          details: error.message,
        },
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
