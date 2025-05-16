import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { topicId: string } }
) {
  try {
    const topicId = parseInt(params.topicId);
    
    if (isNaN(topicId)) {
      return NextResponse.json(
        { error: "Invalid topic ID" },
        { status: 400 }
      );
    }

    const topic = await prisma.topic.findUnique({
      where: {
        id: topicId,
      },
      include: {
        subject: true,
      },
    });

    if (!topic) {
      return NextResponse.json(
        { error: "Topic not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(topic);
  } catch (error) {
    console.error("Error fetching topic:", error);
    return NextResponse.json(
      { error: "Failed to fetch topic" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 