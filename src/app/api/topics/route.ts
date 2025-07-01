// src/app/api/topics/route.ts
import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { withAdminAuth } from "@/lib/api-protection";

const topicCreateSchema = z.object({
  name: z.string().min(1, "Topic name is required"),
  description: z.string().optional().nullable(),
  subjectId: z.number().int().positive("Subject ID is required"),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subjectIdParam = searchParams.get("subjectId");

    const query: any = {};
    if (subjectIdParam) {
      const subjectId = parseInt(subjectIdParam, 10);
      if (!isNaN(subjectId)) {
        query.subjectId = subjectId;
      } else {
        return NextResponse.json(
          { error: "Invalid subjectId parameter" },
          { status: 400 }
        );
      }
    }

    const topics = await prisma.topic.findMany({
      where: query,
      include: {
        subject: true,
      },
      orderBy: {
        name: "asc", // Optional: order topics alphabetically
      },
    });

    return NextResponse.json(topics);
  } catch (error) {
    console.error("Error fetching topics:", error);
    return NextResponse.json(
      { error: "Failed to fetch topics" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return withAdminAuth(async (auth) => {
    try {
      const body = await request.json();
      const validation = topicCreateSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          {
            error: "Invalid data provided",
            details: validation.error.flatten().fieldErrors,
          },
          { status: 400 }
        );
      }

      const { name, description, subjectId } = validation.data;

      // Check if subject exists
      const subjectExists = await prisma.subject.findUnique({
        where: { id: subjectId },
      });
      if (!subjectExists) {
        return NextResponse.json(
          { error: `Subject with ID ${subjectId} not found.` },
          { status: 404 }
        );
      }

      // Check for duplicate topic name within the same subject
      const existingTopic = await prisma.topic.findUnique({
        where: {
          name_subjectId: {
            // Using the @@unique constraint defined in schema
            name: name,
            subjectId: subjectId,
          },
        },
      });

      if (existingTopic) {
        return NextResponse.json(
          { error: `Topic "${name}" already exists for this subject.` },
          { status: 409 }
        );
      }

      const newTopic = await prisma.topic.create({
        data: {
          name,
          description,
          subjectId,
        },
      });

      return NextResponse.json(newTopic, { status: 201 });
    } catch (error: any) {
      console.error("API Error creating topic:", error);
      if (error.code === "P2002") {
        // Prisma unique constraint error (backup check)
        return NextResponse.json(
          { error: "A topic with this name already exists for the subject." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Failed to create topic", details: error.message },
        { status: 500 }
      );
    } finally {
      await prisma.$disconnect();
    }
  });
}
