import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const questionGroups = await prisma.questionGroup.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({ questionGroups });
  } catch (error) {
    console.error("Error fetching question groups:", error);
    return NextResponse.json(
      { error: { message: "Failed to fetch question groups" } },
      { status: 500 }
    );
  }
}
