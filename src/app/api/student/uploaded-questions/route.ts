import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // For now, using a hardcoded student ID - you should implement proper authentication
    const studentId = "student-1";

    // Fetch user-uploaded questions
    // Since we don't have uploadedByStudentId field yet, we'll fetch questions with specific criteria
    const questions = await prisma.question.findMany({
      where: {
        questionNumberOnPage: "user-upload", // This identifies user uploads
        productionReady: false,
      },
      include: {
        subject: { select: { name: true, id: true } },
        topic: { select: { name: true, id: true } },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10, // Limit to recent 10 questions
    });

    // Transform the data to match the expected format
    const transformedQuestions = questions.map((question) => ({
      id: question.id,
      text: question.text,
      questionType: question.questionType,
      options: question.options as any,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      difficulty: question.difficulty,
      imageUrl: question.imageUrl,
      subject: question.subject,
      topic: question.topic,
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
