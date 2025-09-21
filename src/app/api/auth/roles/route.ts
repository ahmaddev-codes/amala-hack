import { NextRequest, NextResponse } from "next/server";
import { adminFirebaseOperations } from "@/lib/firebase/admin-database";

export async function POST(request: NextRequest) {
  try {
    // Check content type
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { success: false, error: 'Content-Type must be application/json' },
        { status: 400 }
      );
    }

    // Parse JSON body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    const { email, uid } = body;

    if (!email || !uid) {
      return NextResponse.json(
        { success: false, error: "Email and UID are required" },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase();
    console.log(`🔍 [roles API] Processing request for email: ${emailLower}, uid: ${uid}`);

    // Try database first, fallback to environment variables
    let roles: Array<"user" | "scout" | "mod" | "admin"> = ["user"];

    try {
      // First, check if user exists in database
      const existingUser = await adminFirebaseOperations.checkUserExists(emailLower);

      if (existingUser.exists && existingUser.user) {
        // User exists in database, use their roles
        roles = existingUser.user.roles || ["user"];
        console.log(`✅ [roles API] Found existing user ${emailLower} with roles:`, roles);
      } else {
        // New user or database unavailable - try environment fallback
        console.log(`⚠️ [roles API] User not found in database or database error, trying environment fallback`);
        const envRoles = await adminFirebaseOperations.getUserRolesWithFallback(emailLower);
        roles = envRoles as Array<"user" | "scout" | "mod" | "admin">;
        console.log(`✅ [roles API] Environment fallback roles for ${emailLower}:`, roles);
      }
    } catch (error) {
      console.error('❌ [roles API] Database operation failed, using environment fallback:', error);
      // Fallback to environment variables on any database error
      const envRoles = await adminFirebaseOperations.getUserRolesWithFallback(emailLower);
      roles = envRoles as Array<"user" | "scout" | "mod" | "admin">;
      console.log(`✅ [roles API] Environment fallback roles after error for ${emailLower}:`, roles);
    }

    // Only create user record if database is available and user doesn't exist
    if (roles.length === 1 && roles[0] === 'user') {
      // This is a new user with only default role, try to create database record
      try {
        await adminFirebaseOperations.createOrUpdateUser({
          email: emailLower,
          roles: roles,
          displayName: "", // Will be updated from Firebase Auth profile
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log(`✅ [roles API] Created new user record for ${emailLower} with default roles:`, roles);
      } catch (error) {
        console.error("❌ [roles API] Failed to create user record (non-critical):", error);
        // Continue with the roles even if database creation fails
      }
    }

    console.log(`✅ [roles API] Final roles for ${emailLower}:`, roles);
    return NextResponse.json({
      success: true,
      roles,
      email: emailLower,
      uid,
    });
  } catch (error) {
    console.error("❌ [roles API] Role assignment error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to assign roles" },
      { status: 500 }
    );
  }
}