import { NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";
import { generateQuestsForAllStudents } from "@/lib/quest-service";
import { withAdminAuth } from "@/lib/api-protection";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

// POST /api/weekly-quests/generate-all - Generate quests for all eligible users
export async function POST() {
  return withAdminAuth(async (auth) => {
    try {
      console.log("🚀 Starting quest generation for all eligible students...");

      const result = await generateQuestsForAllStudents();

      return NextResponse.json({
        success: true,
        message: "Quest generation completed",
        studentsProcessed: result.processed,
        studentsFailed: result.failed,
        totalQuests: result.processed * 5, // Assuming 5 quests per student
      });
    } catch (error: any) {
      console.error("❌ Error in bulk quest generation:", error);
      return NextResponse.json(
        { error: "Failed to generate quests", details: error.message },
        { status: 500 }
      );
    }
  });
}
