import { NextRequest, NextResponse } from "next/server";
import { verifyBearerToken, requireRole } from "@/lib/auth";
import { adminFirebaseOperations } from "@/lib/firebase/admin-database";
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
    const authResult = await verifyBearerToken(authHeader || undefined);
    
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const roleCheck = requireRole(authResult.user!, ["mod", "admin"]);
    if (!roleCheck.success) {
      return NextResponse.json(
        { success: false, error: roleCheck.error },
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
          details: validation.error.issues 
        },
        { status: 400 }
      );
    }

    const { reviewId, action, reason } = validation.data;

    // Update the review in the database using admin operations
    const updatedReview = await adminFirebaseOperations.updateReviewStatus(
      reviewId, 
      action === "approve" ? "approved" : "rejected",
      authResult.user!.email
    );
    
    if (!updatedReview) {
      return NextResponse.json(
        { success: false, error: "Review not found" },
        { status: 404 }
      );
    }

    // If approved, update the location's rating
    if (action === "approve") {
      await adminFirebaseOperations.updateLocationRating(updatedReview.location_id);
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
