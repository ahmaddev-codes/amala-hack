import { NextRequest, NextResponse } from "next/server";
import { firebaseOperations } from "@/lib/firebase/database";
import { verifyFirebaseToken } from "@/lib/firebase/auth-middleware";
import { z } from "zod";

const ReviewSubmissionSchema = z.object({
  location_id: z.string().min(1),
  rating: z.number().min(1).max(5),
  text: z.string().min(1).max(1000).optional(),
  photos: z.array(z.string().url()).max(5).optional(), // Max 5 photos per review
});

// Rate limiting helper (simple in-memory implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }

  if (record.count >= maxRequests) {
    return { allowed: false };
  }

  record.count++;
  return { allowed: true };
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit submissions per IP
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rl = rateLimit(`reviews:post:${ip}`, 10, 60_000); // 10 reviews per minute
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Try again later." },
        { status: 429 }
      );
    }

    // Verify Firebase authentication
    let user;
    try {
      user = await verifyFirebaseToken(request);
      console.log("✅ Firebase auth successful:", user.uid);
    } catch (authError) {
      console.error("❌ Firebase auth failed:", authError);
      return NextResponse.json(
        {
          success: false,
          error: "You must be signed in to leave a review",
          debug: {
            authError:
              authError instanceof Error ? authError.message : "Unknown error",
            hasAuthHeader: !!request.headers.get("authorization"),
          },
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate the review data
    let validatedReview;
    try {
      validatedReview = ReviewSubmissionSchema.parse(body);
    } catch (error: any) {
      const errorMessages =
        error.errors
          ?.map((err: any) => `${err.path.join(".")}: ${err.message}`)
          .join(", ") || "Validation failed";
      return NextResponse.json(
        { success: false, error: "Validation failed", details: errorMessages },
        { status: 400 }
      );
    }

    // Check if location exists
    const location = await firebaseOperations.getLocationById(
      validatedReview.location_id
    );
    if (!location) {
      return NextResponse.json(
        { success: false, error: "Location not found" },
        { status: 404 }
      );
    }

    // Check if user has already reviewed this location
    const existingReviews =
      await firebaseOperations.getReviewsByLocationAndUser(
        validatedReview.location_id,
        user.uid
      );
    if (existingReviews.length > 0) {
      return NextResponse.json(
        { success: false, error: "You have already reviewed this location" },
        { status: 409 }
      );
    }

    // Create the review
    const reviewData = {
      ...validatedReview,
      author: user.email || "Anonymous",
      user_id: user.uid,
      date_posted: new Date(),
      status: "pending" as const, // Reviews are pending moderation by default
    };

    const newReview = await firebaseOperations.createReview(reviewData);

    // Update location's average rating and review count
    await firebaseOperations.updateLocationRating(validatedReview.location_id);

    return NextResponse.json({
      success: true,
      data: newReview,
      message: "Review submitted successfully",
    });
  } catch (error) {
    console.error("Failed to create review:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create review" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("location_id");
    const userId = searchParams.get("user_id");
    const status = searchParams.get("status");

    // If status is provided without locationId, fetch all reviews with that status (for moderation)
    if (status && !locationId) {
      const reviews = await firebaseOperations.getReviewsByStatus(status);
      return NextResponse.json({
        success: true,
        data: reviews,
        count: reviews.length,
      });
    }

    if (!locationId) {
      return NextResponse.json(
        { success: false, error: "location_id is required when status is not provided" },
        { status: 400 }
      );
    }

    let reviews;
    if (userId) {
      // Get reviews for a specific user and location
      reviews = await firebaseOperations.getReviewsByLocationAndUser(
        locationId,
        userId
      );
    } else {
      // Get all reviews for a location
      reviews = await firebaseOperations.getReviewsByLocation(locationId);
    }

    // Filter by status if provided
    if (status) {
      reviews = reviews.filter((review: any) => review.status === status);
    }

    return NextResponse.json({
      success: true,
      data: reviews,
      count: reviews.length,
    });
  } catch (error) {
    console.error("Failed to fetch reviews:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}
