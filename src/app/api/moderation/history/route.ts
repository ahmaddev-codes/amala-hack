import { NextRequest, NextResponse } from "next/server";
import { verifyBearerToken, requireRole } from "@/lib/auth";
import { adminFirebaseOperations } from "@/lib/firebase/admin-database";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const moderatorEmail = searchParams.get("moderator") || undefined;
    const days = parseInt(searchParams.get("days") || "30");
    const limit = parseInt(searchParams.get("limit") || "50");
    
    // Verify authentication and role
    const authResult = await verifyBearerToken(request.headers.get("authorization") || undefined);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const roleCheck = requireRole(authResult.user!, ["mod", "admin"]);
    if (!roleCheck.success) {
      return NextResponse.json({ error: roleCheck.error }, { status: 403 });
    }

    const history = await adminFirebaseOperations.getModerationHistory({
      moderatorEmail,
      days,
      limit
    });
    
    return NextResponse.json({
      success: true,
      data: history,
      count: history.length
    });
  } catch (error: any) {
    console.error("❌ Error fetching moderation history:", error);
    return NextResponse.json(
      { error: "Failed to fetch moderation history", details: error.message },
      { status: 500 }
    );
  }
}
