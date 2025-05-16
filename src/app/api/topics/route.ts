import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const topics = await prisma.topic.findMany({
      include: {
        subject: true, // Include the subject data
      },
    });

    return NextResponse.json(topics);
  } catch (error) {
    console.error("Error fetching topics:", error);
    return NextResponse.json(
      { error: "Failed to fetch topics" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 