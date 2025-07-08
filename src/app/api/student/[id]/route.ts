import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { calculateLevel } from "@/lib/xp-utils";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const student = await prisma.student.findUnique({
      where: { id: params.id },
      select: {
        name: true,
        xpPoints: true,
        img: true,
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Calculate level based on XP points
    const level = calculateLevel(student.xpPoints);

    return NextResponse.json({
      name: student.name,
      level,
      img: student.img,
    });
  } catch (error) {
    console.error("Error fetching student:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
