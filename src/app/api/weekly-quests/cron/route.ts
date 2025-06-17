import { NextResponse } from "next/server";
// import { manageWeeklyQuestRotation } from '@/lib/weekly-quest-service-raw'; // Temporarily disabled - needs schema update

// This endpoint can be called by cron services (like Vercel Cron, cron-job.org, etc.)
// to automatically rotate weekly quests every Monday
export async function GET() {
  try {
    // await manageWeeklyQuestRotation(); // Temporarily disabled - needs schema update
    console.log(
      "Weekly quest rotation temporarily disabled - needs schema update"
    );

    return NextResponse.json({
      message: "Weekly quest rotation temporarily disabled",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in weekly quest cron:", error);
    return NextResponse.json(
      { error: "Failed to manage weekly quest rotation" },
      { status: 500 }
    );
  }
}

// Also support POST method for webhook compatibility
export async function POST() {
  return await GET();
}
