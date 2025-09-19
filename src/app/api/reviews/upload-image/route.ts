import { NextRequest, NextResponse } from "next/server";
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/config';
import { verifyFirebaseToken } from '@/lib/firebase/auth-middleware';

export async function POST(request: NextRequest) {
  try {
    // Verify Firebase authentication
    let user;
    try {
      user = await verifyFirebaseToken(request);
      console.log("✅ Image upload - Firebase auth successful:", user.uid);
    } catch (authError) {
      console.error("❌ Image upload - Firebase auth failed:", authError);
      return NextResponse.json(
        { error: "Authentication required to upload images" },
        { status: 401 }
      );
    }

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
    if (userId !== user.uid) {
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

    // Generate unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/${locationId}/${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}.${fileExt}`;
    const filePath = `review-images/${fileName}`;

    try {
      // Create storage reference
      const storageRef = ref(storage, filePath);
      
      // Convert File to ArrayBuffer for Firebase
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Upload to Firebase Storage
      const snapshot = await uploadBytes(storageRef, uint8Array, {
        contentType: file.type,
      });
      
      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      console.log(`✅ Image uploaded successfully to Firebase: ${downloadURL}`);

      return NextResponse.json({
        success: true,
        imageUrl: downloadURL,
        filePath: filePath,
      });
    } catch (uploadError) {
      console.error("❌ Firebase Storage upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload image to Firebase Storage" },
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