import { NextRequest, NextResponse } from "next/server";
import { verifyBearerToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    console.log("🎭 User roles endpoint called");

    // Verify Bearer token authentication
    const authHeader = request.headers.get("authorization");
    const userInfo = await verifyBearerToken(authHeader || undefined);

    if (!userInfo) {
      console.log("❌ Invalid or missing Bearer token");
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log(
      "✅ Authenticated user:",
      userInfo.email,
      "roles:",
      userInfo.roles
    );
    console.log("🔍 Role details:", {
      email: userInfo.email,
      userId: userInfo.id,
      rolesArray: userInfo.roles,
      rolesCount: userInfo.roles.length,
    });

    return NextResponse.json({
      success: true,
      data: {
        email: userInfo.email,
        userId: userInfo.id,
        roles: userInfo.roles,
      },
    });
  } catch (error) {
    console.error("💥 User roles error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
