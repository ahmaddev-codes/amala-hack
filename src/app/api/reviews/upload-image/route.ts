import { NextRequest, NextResponse } from "next/server";
import { verifyBearerToken } from "@/lib/auth";
import cloudinary, { getUploadOptions } from "@/lib/cloudinary/config";

export async function POST(request: NextRequest) {
  try {
    // Verify Bearer token authentication
    const authResult = await verifyBearerToken(request.headers.get("authorization") || undefined);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: "Authentication required to upload images" },
        { status: 401 }
      );
    }
    console.log("✅ Image upload - Bearer auth successful:", authResult.user.id);

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const locationId = formData.get("locationId") as string;
    const userId = formData.get("userId") as string;

    if (!file || !locationId || !userId) {
      return NextResponse.json(
        { error: "Missing required fields: file, locationId, userId" },
        { status: 400 }
      );
    }

    // Verify the userId matches the authenticated user
    if (userId !== authResult.user.id) {
      return NextResponse.json(
        { error: "User ID mismatch" },
        { status: 403 }
      );
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are allowed" },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 5MB" },
        { status: 400 }
      );
    }

    try {
      // Convert File to Buffer for Cloudinary
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Generate unique public ID
      const publicId = `${userId}_${locationId}_${Date.now()}_${Math.random()
        .toString(36)
        .substring(7)}`;
      
      // Upload to Cloudinary
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          getUploadOptions('amala-reviews', publicId),
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(buffer);
      });
      
      const result = uploadResult as any;
      console.log(`✅ Image uploaded successfully to Cloudinary: ${result.secure_url}`);

      return NextResponse.json({
        success: true,
        imageUrl: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
      });
    } catch (uploadError) {
      console.error("❌ Cloudinary upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload image to Cloudinary" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("❌ Error uploading image:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}