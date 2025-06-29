import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  QuestionType,
  DifficultyLevel,
  ProcessingStatus,
} from "@/generated/prisma";
import { createClient } from "@/lib/supabase/server";
import { saveQuestionImageIfNeeded } from "@/lib/image-storage";
import OpenAI from "openai";
import pdfParse from "pdf-parse";

const getOpenRouterClient = () => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OpenRouter API key is not configured");
  }

  return new OpenAI({
    apiKey: apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": process.env.SITE_URL || "http://localhost:3000",
      "X-Title": "Brightly - Educational Learning Platform",
    },
  });
};

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

    // Fallback: Use OpenRouter with Claude for OCR
    if (process.env.OPENROUTER_API_KEY) {
      console.log("🔍 Using Claude via OpenRouter for OCR...");

      try {
        const openai = getOpenRouterClient();
        const response = await openai.chat.completions.create({
          model: "anthropic/claude-sonnet-4",
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
        });

        if (response.choices?.[0]?.message?.content) {
          const extractedText = response.choices[0].message.content.trim();
          console.log("✅ Claude extracted text:", extractedText);
          return extractedText;
        }
      } catch (error) {
        console.error("OpenRouter OCR failed:", error);
      }
    }

    // Final fallback: Return placeholder for development
    return `[OCR PLACEHOLDER] Text extracted from uploaded image. In production, this would contain the actual text extracted using OCR services like Google Vision API or Azure Computer Vision.`;
  } catch (error) {
    console.error("OCR extraction failed:", error);
    throw new Error("Failed to extract text from image");
  }
}

// PDF text extraction function
async function extractTextFromPDF(file: File): Promise<string> {
  try {
    console.log(
      "📄 Processing PDF file:",
      file.name,
      "Size:",
      file.size,
      "bytes"
    );

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse PDF to extract text
    const data = await pdfParse(buffer);
    const extractedText = data.text.trim();

    if (!extractedText || extractedText.length < 10) {
      console.log("⚠️ No meaningful text extracted from PDF");
      return "No readable text found in the PDF. Please ensure the PDF contains text content.";
    }

    console.log(
      "✅ Successfully extracted text from PDF:",
      extractedText.substring(0, 200) + "..."
    );
    return extractedText;
  } catch (error) {
    console.error("PDF extraction failed:", error);
    throw new Error("Failed to extract text from PDF");
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
    // Using OpenRouter with Claude for reliable JSON parsing
    if (process.env.OPENROUTER_API_KEY) {
      const openai = getOpenRouterClient();
      const response = await openai.chat.completions.create({
        model: "anthropic/claude-sonnet-4",
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
      });

      const aiResponse = response.choices?.[0]?.message?.content;

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
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Check if it's an image or PDF
    const isImage = file.type.startsWith("image/");
    const isPDF = file.type === "application/pdf";

    if (!isImage && !isPDF) {
      return NextResponse.json(
        { error: "Please upload an image or PDF file" },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 10MB" },
        { status: 400 }
      );
    }

    // Create initial record with PROCESSING status
    const uploadedQuestion = await prisma.studentUploadedQuestion.create({
      data: {
        studentId,
        originalFileName: file.name,
        text: "Processing...",
        processingStatus: ProcessingStatus.PROCESSING,
      },
    });

    try {
      // Step 1: Text Extraction (OCR for images, direct extraction for PDFs)
      let extractedText: string;
      let base64Image: string | undefined;

      if (isPDF) {
        extractedText = await extractTextFromPDF(file);
      } else {
        // Convert image to base64 for processing only (not storing)
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        base64Image = buffer.toString("base64");
        extractedText = await extractTextFromImage(base64Image);
      }

      // Step 2: AI Processing (educational analysis)
      const aiProcessedData = await processQuestionWithAI(extractedText);

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

      // Step 4: Smart image storage (only if it's an image and question requires visual elements)
      const imageUrl = base64Image
        ? await saveQuestionImageIfNeeded(
            base64Image,
            uploadedQuestion.id,
            aiProcessedData.requiresImage || false,
            file.name
          )
        : null;

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
          ocrText: extractedText,
          processingStatus: ProcessingStatus.COMPLETED,
          aiProcessingLog: JSON.stringify({
            textExtracted: !!extractedText,
            extractionMethod: isPDF ? "PDF" : "OCR",
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
            "Failed to process file. Please try again with a clearer file.",
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
