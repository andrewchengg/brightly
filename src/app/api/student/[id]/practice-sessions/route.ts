import { NextResponse } from "next/server";
import { PrismaClient, PracticeSessionStatus } from "@/generated/prisma";

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: userId } = params;
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status") as PracticeSessionStatus | null;
    const subjectIdParam = searchParams.get("subjectId");
    const limitParam = searchParams.get("limit");

    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    const subjectId = subjectIdParam ? parseInt(subjectIdParam, 10) : undefined;

    // Build where clause
    const whereClause: any = {
      studentId: userId,
    };

    if (status) {
      whereClause.status = status;
    }

    if (subjectId && !isNaN(subjectId)) {
      whereClause.subjectId = subjectId;
    }

    // Fetch practice sessions
    const sessions = await prisma.practiceSession.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      include: {
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
        topic: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(sessions);
  } catch (error: any) {
    console.error("Error fetching practice sessions:", error);
    return NextResponse.json(
      {
        error: {
          message: "Failed to fetch practice sessions",
          details: error.message,
        },
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
