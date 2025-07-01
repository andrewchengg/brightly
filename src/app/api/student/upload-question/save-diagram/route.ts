import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    console.log("🖼️ Diagram save route started");

    // Get authenticated user
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { questionId, croppedImageBase64, cropCoordinates } = body;

    if (!questionId || !croppedImageBase64) {
      return NextResponse.json(
        { error: "Missing required fields: questionId, croppedImageBase64" },
        { status: 400 }
      );
    }

    // Verify the question belongs to the user
    const question = await prisma.studentUploadedQuestion.findFirst({
      where: {
        id: questionId,
        studentId: user.id,
      },
    });

    if (!question) {
      return NextResponse.json(
        { error: "Question not found or unauthorized" },
        { status: 404 }
      );
    }

    // Save cropped image to Cloudinary
    const diagramUrl = await saveCroppedImageToCloudinary(
      croppedImageBase64,
      `diagram-${questionId}`
    );

    if (!diagramUrl) {
      return NextResponse.json(
        { error: "Failed to save cropped diagram" },
        { status: 500 }
      );
    }

    // Update the question record with diagram info
    const updatedQuestion = await prisma.studentUploadedQuestion.update({
      where: { id: questionId },
      data: {
        diagramUrl: diagramUrl,
        cropCoordinates: cropCoordinates || null,
        hasDiagram: true,
      },
    });

    console.log("✅ Diagram saved:", diagramUrl);

    return NextResponse.json({
      success: true,
      diagramUrl: diagramUrl,
      message: "Diagram saved successfully",
    });
  } catch (error) {
    console.error("❌ Diagram save error:", error);
    return NextResponse.json(
      { error: "Failed to save diagram" },
      { status: 500 }
    );
  }
}

// Save cropped image to Cloudinary (more reliable than Supabase storage)
async function saveCroppedImageToCloudinary(
  imageBase64: string,
  filename: string
): Promise<string | null> {
  try {
    // Use Cloudinary upload API
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`;

    const formData = new FormData();
    formData.append("file", `data:image/jpeg;base64,${imageBase64}`);
    formData.append(
      "upload_preset",
      process.env.CLOUDINARY_UPLOAD_PRESET || "ml_default"
    );
    formData.append("public_id", filename);
    formData.append("folder", "question-diagrams");

    const response = await fetch(cloudinaryUrl, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Cloudinary upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log("✅ Uploaded to Cloudinary:", result.secure_url);
    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary upload failed:", error);

    // Fallback: return a data URL for development
    console.log("⚠️ Using fallback data URL for diagram");
    return `data:image/jpeg;base64,${imageBase64}`;
  }
}
