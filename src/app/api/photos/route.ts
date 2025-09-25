// Photo upload API - Handle restaurant photo uploads with Cloudinary
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, verifyBearerToken } from "@/lib/auth";
import { adminFirebaseOperations } from "@/lib/firebase/admin-database";
import cloudinary, { getUploadOptions } from "@/lib/cloudinary/config";

// POST /api/photos/upload - Upload photos for restaurants (requires auth)
export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const rl = rateLimit(`photos:upload:${ip}`, 20, 60_000); // 20 uploads per minute max

    if (!rl.allowed) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Rate limit exceeded. Please wait before uploading more photos.",
        },
        { status: 429 }
      );
    }

    // Check if user is authenticated
    const authResult = await verifyBearerToken(request.headers.get("authorization") || undefined);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: "You must be signed in to upload photos" },
        { status: 401 }
      );
    }
    
    const user = authResult.user;

    const formData = await request.formData();
    const file = formData.get("photo") as File;
    const locationId = formData.get("locationId") as string;
    const caption = formData.get("caption") as string;

    if (!file || !locationId) {
      return NextResponse.json(
        { success: false, error: "Photo file and location ID are required" },
        { status: 400 }
      );
    }

    // Validate file type and size
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Only JPEG, PNG, and WebP images are allowed",
        },
        { status: 400 }
      );
    }

    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: "File size must be less than 5MB" },
        { status: 400 }
      );
    }

    // Check if location exists
    const location = await adminFirebaseOperations.getLocationById(locationId);
    if (!location) {
      return NextResponse.json(
        { success: false, error: "Location not found" },
        { status: 404 }
      );
    }

    // Generate unique public ID for Cloudinary
    const publicId = `restaurant_photos/${locationId}/${user.id}/${Date.now()}_${Math.random()
      .toString(36)
      .substring(7)}`;

    try {
      // Convert File to Buffer for Cloudinary
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Upload to Cloudinary
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          getUploadOptions('amala-restaurant-photos', publicId),
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(buffer);
      });
      
      const result = uploadResult as any;
      const downloadURL = result.secure_url;

      // Save photo metadata to Firestore using admin SDK
      const photoId = await adminFirebaseOperations.createPhoto({
        location_id: locationId,
        user_id: user.id,
        user_name: user.email?.split('@')[0] || "Anonymous",
        cloudinary_url: downloadURL,
        cloudinary_public_id: result.public_id,
        description: caption || "",
        status: "approved", // Auto-approve for now, can add moderation later
      });

      // Log analytics event using admin SDK
      await adminFirebaseOperations.createAnalyticsEvent({
        event_type: "photo_uploaded",
        location_id: locationId,
        metadata: {
          photo_id: photoId,
          file_size: file.size,
          content_type: file.type,
          user_id: user.id,
        },
      });

      return NextResponse.json({
        success: true,
        photo: {
          id: photoId,
          url: downloadURL,
          caption: caption,
          status: "approved",
        },
        message: "Photo uploaded successfully!",
      });
    } catch (uploadError) {
      console.error("Cloudinary photo upload error:", uploadError);
      return NextResponse.json(
        { success: false, error: "Failed to upload photo to Cloudinary" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Photo upload error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload photo" },
      { status: 500 }
    );
  }
}

// GET /api/photos?locationId=xxx - Get approved photos for a location
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

    if (!locationId) {
      return NextResponse.json(
        { success: false, error: "Location ID is required" },
        { status: 400 }
      );
    }

    // Get approved photos for the location using admin SDK
    const photos = await adminFirebaseOperations.getPhotosByLocation(locationId, limit);

    return NextResponse.json({
      success: true,
      photos: photos.map(photo => ({
        id: photo.id,
        photo_url: photo.cloudinary_url,
        caption: photo.description,
        uploader_name: photo.user_name,
        created_at: photo.uploaded_at?.toISOString() || new Date().toISOString(),
      })),
      pagination: {
        page,
        limit,
        total: photos.length,
        totalPages: 1, // Simplified pagination
        hasNext: false,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Get photos error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch photos" },
      { status: 500 }
    );
  }
}
