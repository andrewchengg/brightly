import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Update the student's walkthrough completion status
    const updatedStudent = await prisma.student.update({
      where: { id: user.id },
      data: { walkthroughComplete: true },
      select: {
        id: true,
        name: true,
        walkthroughComplete: true,
      },
    });

    return NextResponse.json({
      success: true,
      student: updatedStudent,
    });

  } catch (error) {
    console.error("Error completing walkthrough:", error);
    return NextResponse.json(
      { error: "Failed to complete walkthrough" },
      { status: 500 }
    );
  }
} 