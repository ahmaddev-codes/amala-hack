import { NextRequest, NextResponse } from "next/server";
import { verifyBearerToken, requireRole } from "@/lib/auth";
import { firebaseOperations } from "@/lib/firebase/database";
import { z } from "zod";

const ReviewModerationSchema = z.object({
  reviewId: z.string().min(1),
  action: z.enum(["approve", "reject"]),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Verify authentication and role
    const authHeader = request.headers.get("authorization");
    const user = await verifyBearerToken(authHeader);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    if (!requireRole(user, ["mod", "admin"])) {
      return NextResponse.json(
        { success: false, error: "Moderator or admin role required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = ReviewModerationSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid request data",
          details: validation.error.errors 
        },
        { status: 400 }
      );
    }

    const { reviewId, action, reason } = validation.data;

    // Update review status
    const updateData: any = {
      status: action === "approve" ? "approved" : "rejected",
      moderatedAt: new Date(),
      moderatedBy: user.email,
    };

    if (reason) {
      updateData.moderationReason = reason;
    }

    // Update the review in the database
    const updatedReview = await firebaseOperations.updateReview(reviewId, updateData);
    
    if (!updatedReview) {
      return NextResponse.json(
        { success: false, error: "Review not found" },
        { status: 404 }
      );
    }

    // If approved, update the location's rating
    if (action === "approve") {
      await firebaseOperations.updateLocationRating(updatedReview.location_id);
    }

    return NextResponse.json({
      success: true,
      data: updatedReview,
      message: `Review ${action}d successfully`,
    });
  } catch (error) {
    console.error("Failed to moderate review:", error);
    return NextResponse.json(
      { success: false, error: "Failed to moderate review" },
      { status: 500 }
    );
  }
}
