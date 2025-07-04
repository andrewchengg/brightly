import { NextRequest, NextResponse } from "next/server";
import {
  triggerManualQuestRotation,
  getQuestRotationStatus,
  performWeeklyQuestRotation,
} from "@/lib/weekly-quest-scheduler";

export const dynamic = "force-dynamic";

// GET: Check quest rotation status
export async function GET() {
  try {
    const status = await getQuestRotationStatus();

    return NextResponse.json({
      success: true,
      status,
      message: "Quest rotation status retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting quest rotation status:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get quest rotation status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST: Trigger manual quest rotation
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === "rotate") {
      console.log("🔧 Manual quest rotation requested via API");
      const result = await triggerManualQuestRotation();

      if (result.success) {
        return NextResponse.json({
          success: true,
          message: result.message,
          details: result.details,
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            error: result.message,
          },
          { status: 500 }
        );
      }
    } else if (action === "auto-rotate") {
      console.log("🤖 Automatic quest rotation check requested");
      const result = await performWeeklyQuestRotation();

      return NextResponse.json({
        success: result.success,
        message: result.message,
        studentsProcessed: result.studentsProcessed,
        questsGenerated: result.questsGenerated,
        oldQuestsCleanedUp: result.oldQuestsCleanedUp,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action. Use "rotate" or "auto-rotate"',
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error during quest rotation:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to perform quest rotation",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
