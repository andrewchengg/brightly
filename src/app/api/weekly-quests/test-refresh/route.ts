import { NextResponse } from "next/server";
import { triggerQuestRefresh } from "@/lib/quest-refresh";

export const dynamic = "force-dynamic";

// GET /api/weekly-quests/test-refresh - Test the quest refresh system
export async function GET() {
  try {
    console.log("🧪 Testing quest refresh system...");

    // Simulate what happens after a practice session completes
    setTimeout(() => {
      console.log("🎯 Triggering quest refresh event...");
      triggerQuestRefresh();
      console.log("✅ Quest refresh event triggered successfully!");
    }, 100);

    return NextResponse.json({
      success: true,
      message: "Quest refresh test completed",
      instructions: [
        "1. Open the student dashboard in a browser",
        "2. Watch the Weekly Quests section",
        "3. Call this endpoint to trigger a refresh",
        "4. You should see the quest data update automatically without page refresh",
      ],
      eventTriggered: true,
    });
  } catch (error: any) {
    console.error("❌ Error testing quest refresh:", error);
    return NextResponse.json(
      { error: "Failed to test quest refresh", details: error.message },
      { status: 500 }
    );
  }
}
