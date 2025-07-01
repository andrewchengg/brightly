import { NextResponse } from "next/server";
import { resetWeeklyQuests } from "@/lib/weekly-quest-service";
import { withAdminAuth } from "@/lib/api-protection";

export async function GET() {
  return withAdminAuth(async (auth) => {
    try {
      const now = new Date();

      // Check if today is Monday (1 = Monday in getDay())
      const dayOfWeek = now.getDay();
      if (dayOfWeek !== 1) {
        return NextResponse.json({
          message: "Not Monday - weekly reset skipped",
          currentDay: dayOfWeek,
        });
      }

      console.log("🔄 Starting weekly quest reset...");
      await resetWeeklyQuests();
      console.log("✅ Weekly quest reset completed");

      return NextResponse.json({
        success: true,
        message: "Weekly quests reset completed",
        timestamp: now.toISOString(),
      });
    } catch (error: any) {
      console.error("❌ Error during weekly reset:", error);
      return NextResponse.json(
        { error: "Failed to reset weekly quests", details: error.message },
        { status: 500 }
      );
    }
  });
}

// For manual trigger
export async function POST() {
  return withAdminAuth(async (auth) => {
    try {
      console.log("🔄 Starting manual weekly quest reset...");
      await resetWeeklyQuests();
      console.log("✅ Manual weekly quest reset completed");

      return NextResponse.json({
        success: true,
        message: "Weekly quests reset completed",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("❌ Error during manual weekly reset:", error);
      return NextResponse.json(
        { error: "Failed to reset weekly quests", details: error.message },
        { status: 500 }
      );
    }
  });
}
