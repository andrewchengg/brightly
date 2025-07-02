// src/app/api/questions/review/[questionId]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import {
  PrismaClient,
  QuestionType,
  DifficultyLevel,
} from "@/generated/prisma";
import { withAdminAuth } from "@/lib/api-protection";

const prisma = new PrismaClient();

export async function PATCH(
  request: NextRequest,
  { params }: { params: { questionId: string } }
) {
  const { questionId } = params;
  const id = parseInt(questionId, 10);

  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid question ID" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { tags, ...questionData } = body;

    // Type assertions/validations for enum fields if necessary
    if (
      questionData.questionType &&
      !Object.values(QuestionType).includes(
        questionData.questionType as QuestionType
      )
    ) {
      return NextResponse.json(
        { error: `Invalid questionType: ${questionData.questionType}` },
        { status: 400 }
      );
    }
    if (
      questionData.difficulty &&
      !Object.values(DifficultyLevel).includes(
        questionData.difficulty as DifficultyLevel
      )
    ) {
      return NextResponse.json(
        { error: `Invalid difficulty: ${questionData.difficulty}` },
        { status: 400 }
      );
    }

    const updatePayload: any = { ...questionData };

    // Handle tags separately: disconnect old, connect new
    if (Array.isArray(tags)) {
      // First, remove existing tag associations for this question
      await prisma.questionTag.deleteMany({
        where: { questionId: id },
      });
      // Then, create new associations
      if (tags.length > 0) {
        const tagOps = [];
        for (const tagName of tags) {
          if (typeof tagName === "string" && tagName.trim() !== "") {
            const tag = await prisma.tag.upsert({
              where: { name: tagName.trim() },
              update: {},
              create: { name: tagName.trim() },
            });
            tagOps.push({ tagId: tag.id });
          }
        }
        if (tagOps.length > 0) {
          updatePayload.tags = {
            create: tagOps.map((op) => ({ tagId: op.tagId })),
          };
        }
      }
    }

    const updatedQuestion = await prisma.question.update({
      where: { id },
      data: updatePayload,
      include: {
        // Include relations to send back the full updated object
        topic: { select: { id: true, name: true, subjectId: true } },
        subject: { select: { id: true, name: true } },
        questionGroup: { select: { id: true, name: true } },
        tags: { include: { tag: true } },
      },
    });

    return NextResponse.json(updatedQuestion);
  } catch (error: any) {
    console.error(`API: Error updating question ${questionId}:`, error);
    if (error.code === "P2025") {
      // Record to update not found
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      {
        error: "Failed to update question",
        details: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { questionId: string } }
) {
  return withAdminAuth(async (auth) => {
    try {
      const questionId = parseInt(params.questionId, 10);

      if (isNaN(questionId)) {
        return NextResponse.json(
          { error: "Invalid question ID" },
          { status: 400 }
        );
      }

      // Check if question exists
      const existingQuestion = await prisma.question.findUnique({
        where: { id: questionId },
        include: {
          studentAnswers: true,
          archivedVersion: true,
          tags: true,
          reports: true,
        },
      });

      if (!existingQuestion) {
        return NextResponse.json(
          { error: "Question not found" },
          { status: 404 }
        );
      }

      // Delete the question (this will cascade delete related records due to Prisma schema constraints)
      await prisma.question.delete({
        where: { id: questionId },
      });

      return NextResponse.json({
        message: "Question deleted successfully",
        questionId: questionId,
      });
    } catch (error: any) {
      console.error("API: Error deleting question:", error);
      return NextResponse.json(
        { error: "Failed to delete question", details: error.message },
        { status: 500 }
      );
    } finally {
      await prisma.$disconnect();
    }
  });
}
