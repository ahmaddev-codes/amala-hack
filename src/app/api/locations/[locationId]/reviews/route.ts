import { NextRequest, NextResponse } from "next/server";
import { firebaseOperations } from "@/lib/firebase/database";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const { locationId } = await params;

    if (!locationId) {
      return NextResponse.json(
        { success: false, error: "Location ID is required" },
        { status: 400 }
      );
    }

    // Fetch approved reviews for this location
    try {
      const reviews = await firebaseOperations.getReviewsByLocationId(locationId);

      // Filter for approved reviews and sort by date
      const approvedReviews = reviews
        .filter(review => review.status === "approved")
        .sort((a, b) => new Date(b.date_posted).getTime() - new Date(a.date_posted).getTime())
        .slice(0, 10);

      return NextResponse.json({
        success: true,
        reviews: approvedReviews,
      });
    } catch (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch reviews" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Reviews API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
