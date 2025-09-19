// Authentication API route - Firebase handles auth client-side
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, verifyBearerToken } from "@/lib/auth";

// POST /api/auth/signin - Not needed with Firebase (client-side auth)
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { success: false, error: "Authentication is handled client-side with Firebase" },
    { status: 400 }
  );
}

// GET /api/auth/user - Get current user info from Firebase token
export async function GET(request: NextRequest) {
  try {
    const user = await verifyBearerToken(request.headers.get("authorization") || undefined);
    
    if (!user) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        roles: user.roles,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get user info" },
      { status: 500 }
    );
  }
}

// DELETE /api/auth/signout - Not needed with Firebase (client-side auth)
export async function DELETE(request: NextRequest) {
  return NextResponse.json(
    { success: false, error: "Sign out is handled client-side with Firebase" },
    { status: 400 }
  );
}

