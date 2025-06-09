import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { QuestionType, DifficultyLevel } from "@/generated/prisma";

export async function POST(request: NextRequest) {
  try {
    // For now, using a hardcoded student ID - you should implement proper authentication
    const studentId = "student-1";

    const formData = await request.formData();
    const image = formData.get("image") as File;

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Convert image to base64 for AI processing
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString("base64");

    // For now, we'll mock the AI extraction with some sample data
    // In a real implementation, you would call an AI service like OpenAI Vision
    const extractedData = {
      text: "Sample extracted question from uploaded image",
      subject: "Math",
      topic: "Algebra",
      questionType: QuestionType.MULTIPLE_CHOICE,
      options: [
        { id: "A", text: "Option A" },
        { id: "B", text: "Option B" },
        { id: "C", text: "Option C" },
        { id: "D", text: "Option D" },
      ],
      correctAnswer: "A",
      difficulty: DifficultyLevel.MEDIUM,
    };

    // Find or create subject and topic
    let subject = await prisma.subject.findFirst({
      where: { name: { contains: extractedData.subject, mode: "insensitive" } },
    });

    if (!subject) {
      subject = await prisma.subject.create({
        data: { name: extractedData.subject },
      });
    }

    let topic = await prisma.topic.findFirst({
      where: {
        name: {
          contains: extractedData.topic || "General",
          mode: "insensitive",
        },
        subjectId: subject.id,
      },
    });

    if (!topic) {
      topic = await prisma.topic.create({
        data: {
          name: extractedData.topic || "General",
          subjectId: subject.id,
        },
      });
    }

    // Store the image URL (in production, upload to cloud storage)
    const imageUrl = `data:${image.type};base64,${base64Image}`;

    // Create the question in database
    const question = await prisma.question.create({
      data: {
        text: extractedData.text,
        questionType: extractedData.questionType,
        options: extractedData.options,
        correctAnswer: extractedData.correctAnswer,
        difficulty: extractedData.difficulty,
        pointsAwarded: 10,
        subjectId: subject.id,
        topicId: topic.id,
        imageUrl: imageUrl,
        productionReady: false,
        pdfPageNumber: 0,
        questionNumberOnPage: "user-upload",
      },
      include: {
        subject: { select: { name: true, id: true } },
        topic: { select: { name: true, id: true } },
      },
    });

    return NextResponse.json({
      success: true,
      question: {
        id: question.id,
        text: question.text,
        questionType: question.questionType,
        options: question.options,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        difficulty: question.difficulty,
        subject: question.subject,
        topic: question.topic,
      },
    });
  } catch (error) {
    console.error("Error processing uploaded question:", error);
    return NextResponse.json(
      { error: "Failed to process uploaded question" },
      { status: 500 }
    );
  }
}
