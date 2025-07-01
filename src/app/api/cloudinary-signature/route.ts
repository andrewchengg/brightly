import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getAuthenticatedUser } from "@/lib/secure-auth";

export async function GET() {
  // SECURITY FIX: Require authentication before generating signatures
  const auth = await getAuthenticatedUser();

  if (!auth) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }
  try {
    // Configure Cloudinary with your credentials
    cloudinary.config({
      cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });

    // Generate a timestamp for the signature
    const timestamp = Math.round(new Date().getTime() / 1000);

    // The upload preset to use (should be created in your Cloudinary dashboard)
    const uploadPreset = "brightly_profile";

    // Generate the signature
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp: timestamp,
        upload_preset: uploadPreset,
      },
      process.env.CLOUDINARY_API_SECRET || ""
    );

    // SECURITY FIX: Don't expose API keys to frontend
    return NextResponse.json({
      signature,
      timestamp,
      cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      // Remove apiKey from response - it's already configured on frontend
      uploadPreset,
    });
  } catch (error) {
    console.error("Error generating Cloudinary signature:", error);
    return NextResponse.json(
      { error: "Failed to generate signature" },
      { status: 500 }
    );
  }
}
