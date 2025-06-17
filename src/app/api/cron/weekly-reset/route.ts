import { NextResponse } from "next/server";
// import { resetWeeklyQuests } from '@/lib/weekly-quest-service-raw'; // Temporarily disabled - needs schema update

export async function GET() {
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

    // await resetWeeklyQuests(); // Temporarily disabled - needs schema update
    console.log(
      "Weekly quest reset temporarily disabled - needs schema update"
    );

    return NextResponse.json({
      success: true,
      message: "Weekly quests reset temporarily disabled",
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error("Error during weekly reset:", error);
    return NextResponse.json(
      { error: "Failed to reset weekly quests", details: error.message },
      { status: 500 }
    );
  }
}

// For manual trigger
export async function POST() {
  try {
    // await resetWeeklyQuests(); // Temporarily disabled - needs schema update
    console.log(
      "Manual weekly quest reset temporarily disabled - needs schema update"
    );

    return NextResponse.json({
      success: true,
      message: "Weekly quests reset temporarily disabled",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error during manual weekly reset:", error);
    return NextResponse.json(
      { error: "Failed to reset weekly quests", details: error.message },
      { status: 500 }
    );
  }
}
