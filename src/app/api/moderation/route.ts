import { NextRequest, NextResponse } from "next/server";
import { dbOperations } from "@/lib/database/supabase";

export async function GET() {
  try {
    const pendingLocations = await dbOperations.getPendingLocations();

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

    const moderatedLocation = await dbOperations.moderateLocation(
      locationId,
      action,
      moderatorId
    );

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
