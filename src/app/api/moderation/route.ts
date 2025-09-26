import { NextRequest, NextResponse } from "next/server";
import { adminFirebaseOperations } from "@/lib/firebase/admin-database";
import { requireRole, verifyBearerToken } from "@/lib/auth";
import { queryBatcher } from "@/lib/database/query-batcher";
import { logAnalyticsEvent } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyBearerToken(request.headers.get("authorization") || undefined);
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });
    }
    
    const roleCheck = requireRole(authResult.user!, ["mod", "admin"]);
    if (!roleCheck.success) {
      return NextResponse.json({ success: false, error: roleCheck.error }, { status: 403 });
    }
    
    // PERFORMANCE: Use query batcher for pending locations
    const pendingLocations = await queryBatcher.batchRead('locations', undefined, {
      field: 'status',
      operator: '==',
      value: 'pending'
    });

    return NextResponse.json({
      success: true,
      data: pendingLocations,
      count: pendingLocations.length,
    });
  } catch (error) {
    console.error("Failed to fetch pending locations:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch pending locations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyBearerToken(request.headers.get("authorization") || undefined);
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });
    }
    
    const roleCheck = requireRole(authResult.user!, ["mod", "admin"]);
    if (!roleCheck.success) {
      return NextResponse.json({ success: false, error: roleCheck.error }, { status: 403 });
    }
    
    const { locationId, action, moderatorId } = await request.json();

    if (!locationId || !action) {
      return NextResponse.json(
        { success: false, error: "Location ID and action are required" },
        { status: 400 }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Action must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    console.log(`🔄 Moderating location ${locationId}: ${action}`);
    const moderatedLocation = await adminFirebaseOperations.moderateLocation(
      locationId,
      action as "approve" | "reject",
      moderatorId || authResult.user!.id
    );
    console.log(`✅ Location ${locationId} ${action}d successfully`);

    // Log analytics with scout tracking
    try {
      await logAnalyticsEvent(
        action === "approve" ? "mod_approve" : "mod_reject",
        `location_id:${locationId},moderator:${moderatorId || authResult.user!.email || authResult.user!.id},action:${action}`
      );
      // Additional scout-specific analytics if location was user-submitted
      if (moderatedLocation.submittedBy && moderatedLocation.discoverySource === "user-submitted") {
        await logAnalyticsEvent(
          action === "approve" ? "scout_submission_approved" : "scout_submission_rejected",
          `location_id:${locationId},scout:${moderatedLocation.submittedBy},moderator:${moderatorId || authResult.user!.email || authResult.user!.id}`
        );
      }
    } catch (error) {
      console.error("Failed to log analytics:", error);
    }

    return NextResponse.json({
      success: true,
      data: moderatedLocation,
      message: `Location ${action}d successfully`,
    });
  } catch (error) {
    console.error("❌ Moderation error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to moderate location",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
