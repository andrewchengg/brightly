import { NextResponse } from "next/server";
import { performWeeklyQuestRotation } from "@/lib/weekly-quest-scheduler";

// This endpoint can be called by cron services (like Vercel Cron, cron-job.org, etc.)
// to automatically rotate weekly quests every Monday
export async function GET() {
  try {
    console.log("🔄 Starting automated weekly quest rotation...");

    const result = await performWeeklyQuestRotation();

    if (result.success) {
      console.log("✅ Weekly quest rotation completed successfully");
      return NextResponse.json({
        success: true,
        message: result.message,
        studentsProcessed: result.studentsProcessed,
        questsGenerated: result.questsGenerated,
        oldQuestsCleanedUp: result.oldQuestsCleanedUp,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.error("❌ Weekly quest rotation failed:", result.message);
      return NextResponse.json(
        {
          success: false,
          error: "Quest rotation failed",
          details: result.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("❌ Error in weekly quest cron:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to manage weekly quest rotation",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Also support POST method for webhook compatibility
export async function POST() {
  return await GET();
}
