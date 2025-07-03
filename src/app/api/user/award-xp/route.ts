// src/app/api/user/award-xp/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { PrismaClient } from "@/generated/prisma";
import {
  calculateLevel,
  calculateNextLevelXP,
  calculateProgressToNextLevel,
  checkLevelUp,
} from "@/lib/xp-utils";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

interface XpRequestBody {
  xpAmount: number;
  activityType?: string;
}

export async function POST(req: NextRequest) {
  const cookieStore = cookies();

  // Use Supabase for authentication only
  const supabase = createClient();

  try {
    // Get the authenticated user for security
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized: " + (authError?.message || "No user session") },
        { status: 401 }
      );
    }

    const userId = user.id;

    const { xpAmount, activityType } = (await req.json()) as XpRequestBody;

    if (xpAmount == null || typeof xpAmount !== "number") {
      return NextResponse.json({ error: "Invalid XP amount" }, { status: 400 });
    }

    console.log(
      `💎 Awarding ${xpAmount} XP to student ${userId} for ${
        activityType || "activity"
      }`
    );

    // Use Prisma to fetch student data (consistent with rest of app)
    const student = await prisma.student.findUnique({
      where: { id: userId },
      select: {
        xpPoints: true,
        name: true,
        username: true,
      },
    });

    if (!student) {
      console.error(`Student not found: ${userId}`);
      return NextResponse.json(
        {
          error: "Student not found",
          details: `No student record found for user ID: ${userId}`,
        },
        { status: 404 }
      );
    }

    const currentXP = student.xpPoints || 0;
    const newXP = currentXP + xpAmount;

    console.log(`📊 XP update: ${currentXP} → ${newXP} (+${xpAmount})`);

    const levelUpInfo = checkLevelUp(currentXP, newXP);
    const newLevel = calculateLevel(newXP);

    // Use Prisma to update student XP (consistent with rest of app)
    const updatedStudent = await prisma.student.update({
      where: { id: userId },
      data: {
        xpPoints: newXP,
        level: newLevel, // Update calculated level as well
        updatedAt: new Date(),
      },
      select: {
        xpPoints: true,
        level: true,
        name: true,
      },
    });

    console.log(
      `✅ XP awarded successfully to ${
        student.name || student.username
      }: ${xpAmount} XP`
    );

    if (levelUpInfo.leveledUp) {
      console.log(
        `🎉 Level up! ${
          student.name || student.username
        } reached level ${newLevel}!`
      );
    }

    return NextResponse.json({
      success: true,
      currentXp: updatedStudent.xpPoints,
      awarded: xpAmount,
      level: newLevel,
      leveledUp: levelUpInfo.leveledUp,
      previousLevel: levelUpInfo.oldLevel,
      nextLevelXp: calculateNextLevelXP(newLevel),
      progressToNextLevel: calculateProgressToNextLevel(newXP),
    });
  } catch (error: any) {
    console.error("❌ Error in award-xp endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
