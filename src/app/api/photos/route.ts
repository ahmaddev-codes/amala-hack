// Photo upload API - Handle restaurant photo uploads with Firebase
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, verifyBearerToken } from "@/lib/auth";
import { firebaseOperations } from "@/lib/firebase/database";
import { storage } from "@/lib/firebase/config";
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, query, where, getDocs, orderBy, limit as firestoreLimit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

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
    const user = await verifyBearerToken(request.headers.get("authorization"));
    if (!user) {
      return NextResponse.json(
        { success: false, error: "You must be signed in to upload photos" },
        { status: 401 }
      );
    }

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
    const location = await firebaseOperations.getLocationById(locationId);
    if (!location) {
      return NextResponse.json(
        { success: false, error: "Location not found" },
        { status: 404 }
      );
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `restaurant-photos/${locationId}/${user.id}/${Date.now()}.${fileExt}`;

    try {
      // Upload to Firebase Storage
      const storageRef = ref(storage, fileName);
      const fileBuffer = await file.arrayBuffer();
      const uploadResult = await uploadBytes(storageRef, fileBuffer, {
        contentType: file.type,
      });

      // Get download URL
      const downloadURL = await getDownloadURL(uploadResult.ref);

      // Save photo metadata to Firestore
      const photosRef = collection(db, 'restaurant_photos');
      const photoDoc = await addDoc(photosRef, {
        location_id: locationId,
        locationId: locationId,
        uploaded_by: user.id,
        uploader_name: user.email?.split('@')[0] || "Anonymous",
        photo_url: downloadURL,
        caption: caption || null,
        file_name: fileName,
        file_size: file.size,
        content_type: file.type,
        status: "approved", // Auto-approve for now, can add moderation later
        created_at: Timestamp.now(),
        createdAt: Timestamp.now(),
      });

      // Log analytics event
      const analyticsRef = collection(db, 'analytics_events');
      await addDoc(analyticsRef, {
        event_type: "photo_uploaded",
        location_id: locationId,
        metadata: {
          photo_id: photoDoc.id,
          file_size: file.size,
          content_type: file.type,
          user_id: user.id,
        },
        user_id: user.id,
        created_at: Timestamp.now(),
      });

      return NextResponse.json({
        success: true,
        photo: {
          id: photoDoc.id,
          url: downloadURL,
          caption: caption,
          status: "approved",
        },
        message: "Photo uploaded successfully!",
      });
    } catch (uploadError) {
      console.error("Photo upload error:", uploadError);
      return NextResponse.json(
        { success: false, error: "Failed to upload photo" },
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

    // Get approved photos for the location
    const photosRef = collection(db, 'restaurant_photos');
    const photosQuery = query(
      photosRef,
      where('location_id', '==', locationId),
      where('status', '==', 'approved'),
      orderBy('created_at', 'desc'),
      firestoreLimit(limit)
    );

    const photosSnapshot = await getDocs(photosQuery);
    const photos = photosSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        photo_url: data.photo_url,
        caption: data.caption,
        uploader_name: data.uploader_name,
        created_at: data.created_at?.toDate()?.toISOString() || new Date().toISOString(),
      };
    });

    // Get total count (simplified - just return current page info)
    const totalPages = Math.ceil(photos.length / limit);

    return NextResponse.json({
      success: true,
      photos: photos || [],
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
