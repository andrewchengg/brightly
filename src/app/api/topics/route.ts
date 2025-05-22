import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subjectId');
    
    // Build query with optional subject filter
    const query: any = {};
    if (subjectId) {
      query.subjectId = parseInt(subjectId);
    }
    
    const topics = await prisma.topic.findMany({
      where: query,
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
  }
} 