// src/app/api/oral-prompts/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // Your Prisma client instance
import { OralPromptType, DifficultyLevel } from "@/generated/prisma";
import { z } from "zod";

// Add at the beginning of the file, after imports
export const dynamic = "force-dynamic";

// Zod schema for validating incoming data (mirroring the frontend but for backend)
const apiOralPromptSchema = z.object({
  title: z.string().min(1),
  subjectId: z.number().int().positive(),
  topicId: z.number().int().positive().optional().nullable(),
  promptType: z.nativeEnum(OralPromptType),
  description: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((val) => (val === "" ? null : val || null)),
  studentInstructions: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((val) => (val === "" ? null : val || null)),
  imageUrl: z
    .string()
    .url()
    .optional()
    .or(z.literal(""))
    .transform((val) => (val === "" ? null : val || null)),
  videoUrl: z
    .string()
    .url()
    .optional()
    .or(z.literal(""))
    .transform((val) => (val === "" ? null : val || null)),
  guidingQuestions: z
    .array(z.object({ text: z.string().min(1) }))
    .optional()
    .nullable(),
  passageText: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((val) => (val === "" ? null : val || null)),
  difficulty: z
    .nativeEnum(DifficultyLevel)
    .optional()
    .default(DifficultyLevel.MEDIUM),
  keywords: z.array(z.string()).optional().default([]),
  estimatedTimeSeconds: z.number().int().positive().optional().nullable(),
  productionReady: z.boolean().optional().default(false),
});

export async function GET(request: NextRequest) {
  console.log("API /api/oral-prompts GET request received"); // Add this log
  try {
    const { searchParams } = new URL(request.url);
    const subjectIdParam = searchParams.get("subjectId");
    const promptTypeParam = searchParams.get("promptType");
    const productionReadyParam = searchParams.get("productionReady");

    console.log("API Params:", {
      subjectIdParam,
      promptTypeParam,
      productionReadyParam,
    });

    let whereClause: any = {};

    if (subjectIdParam) {
      const subjectId = parseInt(subjectIdParam, 10);
      if (!isNaN(subjectId)) {
        whereClause.subjectId = subjectId;
      } else {
        return NextResponse.json(
          { error: "Invalid subjectId" },
          { status: 400 }
        );
      }
    }

    if (
      promptTypeParam &&
      Object.values(OralPromptType).includes(promptTypeParam as OralPromptType)
    ) {
      whereClause.promptType = promptTypeParam as OralPromptType;
    }

    if (productionReadyParam !== null) {
      // Check if the param exists
      whereClause.productionReady = productionReadyParam === "true";
    }

    console.log("API Prisma Where Clause:", whereClause);

    const oralPrompts = await prisma.oralPrompt.findMany({
      where: whereClause,
      include: {
        subject: {
          select: { id: true, name: true },
        },
        topic: {
          select: { id: true, name: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`API: Found ${oralPrompts.length} oral prompts.`);
    return NextResponse.json({ oralPrompts }, { status: 200 });
  } catch (error: any) {
    console.error("API Error fetching oral prompts:", error);
    return NextResponse.json(
      { error: "Failed to fetch oral prompts", details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: NextRequest) {
  console.log("API /api/oral-prompts POST request received"); // Add this log
  try {
    const body = await request.json();

    const validation = apiOralPromptSchema.safeParse(body);
    if (!validation.success) {
      console.error("API POST Validation Error:", validation.error.flatten());
      return NextResponse.json(
        {
          error: "Invalid data provided",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    const prismaData: any = {
      title: data.title,
      subjectId: data.subjectId,
      promptType: data.promptType,
      description: data.description,
      studentInstructions: data.studentInstructions,
      imageUrl: data.imageUrl,
      videoUrl: data.videoUrl,
      guidingQuestions: data.guidingQuestions
        ? data.guidingQuestions.map((q) => q.text)
        : null, // Ensure it's null if not provided or empty after filter
      passageText: data.passageText,
      difficulty: data.difficulty,
      keywords: data.keywords,
      estimatedTimeSeconds: data.estimatedTimeSeconds,
      productionReady: data.productionReady,
    };

    if (data.topicId) {
      prismaData.topicId = data.topicId;
    }

    console.log("API POST Prisma Data:", prismaData);

    const newOralPrompt = await prisma.oralPrompt.create({
      data: prismaData,
    });

    console.log("API POST Success:", newOralPrompt);
    return NextResponse.json(newOralPrompt, { status: 201 });
  } catch (error: any) {
    console.error("API Error creating oral prompt:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "An oral prompt with similar unique fields already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create oral prompt", details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
