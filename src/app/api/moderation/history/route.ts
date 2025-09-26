import { NextRequest, NextResponse } from "next/server";
import { verifyBearerToken, requireRole } from "@/lib/auth";
import { adminFirebaseOperations } from "@/lib/firebase/admin-database";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const moderatorEmail = searchParams.get("moderator") || undefined;
    const days = parseInt(searchParams.get("days") || "30");
    const limit = parseInt(searchParams.get("limit") || "20"); // Reduced default for pagination
    const page = parseInt(searchParams.get("page") || "1");
    const cursor = searchParams.get("cursor") || undefined; // For cursor-based pagination
    
    // Verify authentication and role
    const authResult = await verifyBearerToken(request.headers.get("authorization") || undefined);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const roleCheck = requireRole(authResult.user!, ["mod", "admin"]);
    if (!roleCheck.success) {
      return NextResponse.json({ error: roleCheck.error }, { status: 403 });
    }

    const result = await adminFirebaseOperations.getModerationHistoryPaginated({
      moderatorEmail,
      days,
      limit,
      cursor
    });
    
    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: {
        currentPage: page,
        limit,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
        totalCount: result.totalCount
      }
    });
  } catch (error: any) {
    console.error("❌ Error fetching moderation history:", error);
    return NextResponse.json(
      { error: "Failed to fetch moderation history", details: error.message },
      { status: 500 }
    );
  }
}
