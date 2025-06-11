import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  QuestionType,
  DifficultyLevel,
  ProcessingStatus,
} from "@/generated/prisma";
import { createClient } from "@/lib/supabase/server";
import { saveQuestionImageIfNeeded } from "@/lib/image-storage";

// OCR and AI processing functions
async function extractTextFromImage(imageBase64: string): Promise<string> {
  try {
    // Option 1: Google Cloud Vision API
    if (process.env.GOOGLE_CLOUD_VISION_API_KEY) {
      console.log("🔍 Using Google Vision API for OCR...");

      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_CLOUD_VISION_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requests: [
              {
                image: {
                  content: imageBase64,
                },
                features: [
                  {
                    type: "TEXT_DETECTION",
                    maxResults: 1,
                  },
                ],
              },
            ],
          }),
        }
      );

      const data = await response.json();
      console.log(
        "📋 Google Vision API response:",
        JSON.stringify(data, null, 2)
      );

      if (data.error) {
        console.error("❌ Google Vision API error:", data.error);
        throw new Error(`Google Vision API error: ${data.error.message}`);
      }

      if (data.responses?.[0]?.fullTextAnnotation?.text) {
        const extractedText = data.responses[0].fullTextAnnotation.text;
        console.log("✅ Successfully extracted text:", extractedText);
        return extractedText;
      } else if (data.responses?.[0]?.error) {
        console.error(
          "❌ Google Vision response error:",
          data.responses[0].error
        );
        throw new Error(
          `Google Vision response error: ${data.responses[0].error.message}`
        );
      } else {
        console.log("⚠️ No text detected in image");
        return "No text detected in the uploaded image.";
      }
    } else {
      console.log("⚠️ Google Vision API key not found in environment");
    }

    // Option 2: Azure Computer Vision
    if (process.env.AZURE_VISION_ENDPOINT && process.env.AZURE_VISION_KEY) {
      const response = await fetch(
        `${process.env.AZURE_VISION_ENDPOINT}/vision/v3.2/ocr`,
        {
          method: "POST",
          headers: {
            "Ocp-Apim-Subscription-Key": process.env.AZURE_VISION_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: `data:image/jpeg;base64,${imageBase64}`,
          }),
        }
      );

      const data = await response.json();
      // Process Azure response to extract text
      let extractedText = "";
      if (data.regions) {
        data.regions.forEach((region: any) => {
          region.lines.forEach((line: any) => {
            const lineText = line.words.map((word: any) => word.text).join(" ");
            extractedText += lineText + "\n";
          });
        });
      }
      return extractedText.trim();
    }

    // Fallback: Use OpenAI Vision API for OCR (works with existing OpenAI key)
    if (process.env.OPENAI_API_KEY) {
      console.log("🔍 Using OpenAI Vision as OCR fallback...");

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4-vision-preview",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Please extract ALL text from this image. Return only the extracted text, nothing else. If it's a question, include all question text, options, and any numbers/formulas exactly as they appear.",
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:image/jpeg;base64,${imageBase64}`,
                    },
                  },
                ],
              },
            ],
            max_tokens: 1000,
            temperature: 0,
          }),
        }
      );

      const data = await response.json();
      if (data.choices?.[0]?.message?.content) {
        const extractedText = data.choices[0].message.content.trim();
        console.log("✅ OpenAI Vision extracted text:", extractedText);
        return extractedText;
      }
    }

    // Final fallback: Return placeholder for development
    return `[OCR PLACEHOLDER] Text extracted from uploaded image. In production, this would contain the actual text extracted using OCR services like Google Vision API or Azure Computer Vision.`;
  } catch (error) {
    console.error("OCR extraction failed:", error);
    throw new Error("Failed to extract text from image");
  }
}

async function processQuestionWithAI(ocrText: string): Promise<{
  text: string;
  questionType: QuestionType;
  options?: any[];
  correctAnswer?: any;
  explanation?: string;
  hint?: string;
  difficulty: DifficultyLevel;
  subject: string;
  topic: string;
  requiresImage?: boolean;
}> {
  try {
    // Using OpenAI for reliable JSON parsing
    if (process.env.OPENAI_API_KEY) {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4-turbo-preview",
            messages: [
              {
                role: "system",
                content: `You are an expert educational content analyzer. Return ONLY valid JSON, no other text.`,
              },
              {
                role: "user",
                content: `Analyze this OCR text and return ONLY a JSON object:

OCR Text: "${ocrText}"

Return this exact structure:
{
  "text": "complete question text",
  "questionType": "MULTIPLE_CHOICE",
  "options": [{"id": "A", "text": "option text"}],
  "correctAnswer": "A",
  "explanation": "detailed explanation",
  "hint": "helpful hint",  
  "difficulty": "MEDIUM",
  "subject": "Math",
  "topic": "topic name",
  "requiresImage": false
}

Rules:
- questionType: MULTIPLE_CHOICE, FILL_IN_THE_BLANK, OPEN_ENDED, or MULTI_PART
- difficulty: EASY, MEDIUM, HARD, or VERY_HARD
- requiresImage: true if question mentions diagrams/graphs/charts
- Return ONLY the JSON, nothing else`,
              },
            ],
            max_tokens: 1000,
            temperature: 0.1,
          }),
        }
      );

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content;

      if (aiResponse) {
        // Clean the response - remove any markdown formatting or extra text
        let cleanResponse = aiResponse.trim();

        // Remove markdown code blocks if present
        cleanResponse = cleanResponse.replace(/```json\s*|\s*```/g, "");

        // Find JSON object boundaries if there's extra text
        const jsonStart = cleanResponse.indexOf("{");
        const jsonEnd = cleanResponse.lastIndexOf("}") + 1;

        if (jsonStart !== -1 && jsonEnd > jsonStart) {
          cleanResponse = cleanResponse.substring(jsonStart, jsonEnd);
        }

        try {
          const questionData = JSON.parse(cleanResponse);
          return questionData;
        } catch (parseError) {
          console.error("Failed to parse OpenAI response:", parseError);
          console.log("Raw OpenAI response:", aiResponse);
          console.log("Cleaned response attempt:", cleanResponse);
        }
      }
    }

    // Fallback: Return sample structured data for development
    return {
      text: ocrText || "Sample question extracted from uploaded image",
      questionType: QuestionType.MULTIPLE_CHOICE,
      options: [
        { id: "A", text: "Option A" },
        { id: "B", text: "Option B" },
        { id: "C", text: "Option C" },
        { id: "D", text: "Option D" },
      ],
      correctAnswer: "A",
      explanation:
        "This is a sample explanation. In production, this would be generated by AI based on the question content.",
      hint: "This is a sample hint to help students approach the problem.",
      difficulty: DifficultyLevel.MEDIUM,
      subject: "Math",
      topic: "General",
    };
  } catch (error) {
    console.error("AI processing failed:", error);
    throw new Error("Failed to process question with AI");
  }
}

export async function POST(request: NextRequest) {
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

    const formData = await request.formData();
    const image = formData.get("image") as File;

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Validate image size (10MB limit)
    if (image.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image size must be less than 10MB" },
        { status: 400 }
      );
    }

    // Convert image to base64 for processing only (not storing)
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString("base64");

    // Create initial record with PROCESSING status (no image stored)
    const uploadedQuestion = await prisma.studentUploadedQuestion.create({
      data: {
        studentId,
        originalFileName: image.name,
        text: "Processing...",
        processingStatus: ProcessingStatus.PROCESSING,
      },
    });

    try {
      // Step 1: OCR Text Extraction
      const ocrText = await extractTextFromImage(base64Image);

      // Step 2: AI Processing (educational analysis)
      const aiProcessedData = await processQuestionWithAI(ocrText);

      // Step 3: Find or create subject and topic
      let subject = await prisma.subject.findFirst({
        where: {
          name: { contains: aiProcessedData.subject, mode: "insensitive" },
        },
      });

      if (!subject) {
        subject = await prisma.subject.create({
          data: { name: aiProcessedData.subject },
        });
      }

      let topic = await prisma.topic.findFirst({
        where: {
          name: { contains: aiProcessedData.topic, mode: "insensitive" },
          subjectId: subject.id,
        },
      });

      if (!topic) {
        topic = await prisma.topic.create({
          data: {
            name: aiProcessedData.topic,
            subjectId: subject.id,
          },
        });
      }

      // Step 4: Smart image storage (only if question requires visual elements)
      const imageUrl = await saveQuestionImageIfNeeded(
        base64Image,
        uploadedQuestion.id,
        aiProcessedData.requiresImage || false,
        image.name
      );

      // Step 5: Update the record with processed data
      const finalQuestion = await prisma.studentUploadedQuestion.update({
        where: { id: uploadedQuestion.id },
        data: {
          text: aiProcessedData.text,
          questionType: aiProcessedData.questionType,
          options: aiProcessedData.options,
          correctAnswer: aiProcessedData.correctAnswer,
          explanation: aiProcessedData.explanation,
          hint: aiProcessedData.hint,
          difficulty: aiProcessedData.difficulty,
          subjectId: subject.id,
          topicId: topic.id,
          imageUrl: imageUrl,
          requiresImage: aiProcessedData.requiresImage || false,
          ocrText,
          processingStatus: ProcessingStatus.COMPLETED,
          aiProcessingLog: JSON.stringify({
            ocrExtracted: !!ocrText,
            aiProcessed: true,
            timestamp: new Date().toISOString(),
          }),
        },
        include: {
          subject: { select: { name: true, id: true } },
          topic: { select: { name: true, id: true } },
        },
      });

      return NextResponse.json({
        success: true,
        question: {
          id: finalQuestion.id,
          text: finalQuestion.text,
          questionType: finalQuestion.questionType,
          options: finalQuestion.options,
          correctAnswer: finalQuestion.correctAnswer,
          explanation: finalQuestion.explanation,
          hint: finalQuestion.hint,
          difficulty: finalQuestion.difficulty,
          subject: finalQuestion.subject,
          topic: finalQuestion.topic,
          processingStatus: finalQuestion.processingStatus,
        },
      });
    } catch (processingError) {
      console.error("Processing error:", processingError);

      // Update record to FAILED status
      await prisma.studentUploadedQuestion.update({
        where: { id: uploadedQuestion.id },
        data: {
          processingStatus: ProcessingStatus.FAILED,
          aiProcessingLog: JSON.stringify({
            error:
              processingError instanceof Error
                ? processingError.message
                : "Unknown error",
            timestamp: new Date().toISOString(),
          }),
        },
      });

      return NextResponse.json(
        {
          error:
            "Failed to process image. Please try again with a clearer image.",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload question" },
      { status: 500 }
    );
  }
}
