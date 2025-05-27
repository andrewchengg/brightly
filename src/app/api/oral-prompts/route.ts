// src/app/api/oral-prompts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // Your Prisma client instance
import { OralPromptType, DifficultyLevel } from '@/generated/prisma';
import { z } from 'zod';

// Zod schema for validating incoming data (mirroring the frontend but for backend)
// This is good practice for API route validation
const apiOralPromptSchema = z.object({
  title: z.string().min(1),
  subjectId: z.number().int().positive(),
  topicId: z.number().int().positive().optional().nullable(),
  promptType: z.nativeEnum(OralPromptType),
  description: z.string().optional().nullable(),
  studentInstructions: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  videoUrl: z.string().url().optional().nullable(),
  guidingQuestions: z.array(z.object({ text: z.string().min(1) })).optional().nullable(), // Frontend sends array of objects
  passageText: z.string().optional().nullable(),
  difficulty: z.nativeEnum(DifficultyLevel).optional().default(DifficultyLevel.MEDIUM),
  keywords: z.array(z.string()).optional().default([]),
  estimatedTimeSeconds: z.number().int().positive().optional().nullable(),
  productionReady: z.boolean().optional().default(false),
});


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate incoming data (optional but highly recommended)
    const validation = apiOralPromptSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid data provided", details: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    
    const data = validation.data;

    // Prepare data for Prisma create
    const prismaData: any = {
      title: data.title,
      subjectId: data.subjectId,
      promptType: data.promptType,
      description: data.description,
      studentInstructions: data.studentInstructions,
      imageUrl: data.imageUrl,
      videoUrl: data.videoUrl,
      // Convert guidingQuestions from [{text: "Q1"}] to JSON string array ["Q1"] for Json? field
      guidingQuestions: data.guidingQuestions ? data.guidingQuestions.map(q => q.text) : undefined,
      passageText: data.passageText,
      difficulty: data.difficulty,
      keywords: data.keywords,
      estimatedTimeSeconds: data.estimatedTimeSeconds,
      productionReady: data.productionReady,
    };

    if (data.topicId) {
      prismaData.topicId = data.topicId;
    }

    const newOralPrompt = await prisma.oralPrompt.create({
      data: prismaData,
    });

    return NextResponse.json(newOralPrompt, { status: 201 });

  } catch (error: any) {
    console.error("API Error creating oral prompt:", error);
    if (error.code === 'P2002') { // Prisma unique constraint error
        return NextResponse.json({ error: "An oral prompt with similar unique fields already exists." }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Failed to create oral prompt", details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}