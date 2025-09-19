import { NextRequest, NextResponse } from "next/server";
import { firebaseOperations } from "@/lib/firebase/database";
import { requireRole, verifyBearerToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyBearerToken(request.headers.get("authorization") || undefined);
    if (!requireRole(auth, ["mod", "admin"])) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    const pendingLocations = await firebaseOperations.getPendingLocations();

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
    const auth = await verifyBearerToken(request.headers.get("authorization") || undefined);
    if (!requireRole(auth, ["mod", "admin"])) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
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

    const moderatedLocation = await firebaseOperations.moderateLocation(
      locationId,
      action,
      moderatorId || auth?.email || auth?.id
    );

    // Log analytics
    try {
      await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_type: action === "approve" ? "mod_approve" : "mod_reject", location_id: locationId, metadata: { moderator: moderatorId || auth?.email || auth?.id } }),
      });
    } catch {}

    return NextResponse.json({
      success: true,
      data: moderatedLocation,
      message: `Location ${action}d successfully`,
    });
  } catch (error) {
    console.error("Moderation failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to moderate location" },
      { status: 500 }
    );
  }
}
