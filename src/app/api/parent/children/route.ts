import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all children of the parent
    const children = await prisma.student.findMany({
      where: { parentId: user.id },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        img: true,
        level: true,
        xpPoints: true,
        classId: true,
        gradeId: true,
        grade: {
          select: {
            id: true,
            level: true,
            name: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({ children });
  } catch (error) {
    console.error("Error fetching parent children:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
