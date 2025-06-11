import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ProcessingStatus } from "@/generated/prisma";

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const studentId = user.id;

    // Fetch user-uploaded questions from the new StudentUploadedQuestion table
    const uploadedQuestions = await prisma.studentUploadedQuestion.findMany({
      where: {
        studentId,
        processingStatus: ProcessingStatus.COMPLETED, // Only show successfully processed questions
      },
      include: {
        subject: { select: { name: true, id: true } },
        topic: { select: { name: true, id: true } },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20, // Limit to recent 20 questions
    });

    // Transform the data to match the expected format
    const transformedQuestions = uploadedQuestions.map((question) => ({
      id: question.id,
      text: question.text,
      questionType: question.questionType,
      options: question.options as any,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      hint: question.hint,
      difficulty: question.difficulty,
      subject: question.subject || { id: 0, name: "Unknown" },
      topic: question.topic || { id: 0, name: "General" },
      processingStatus: question.processingStatus,
      createdAt: question.createdAt,
      originalFileName: question.originalFileName,
    }));

    return NextResponse.json(transformedQuestions);
  } catch (error) {
    console.error("Error fetching uploaded questions:", error);
    return NextResponse.json(
      { error: "Failed to fetch uploaded questions" },
      { status: 500 }
    );
  }
}
