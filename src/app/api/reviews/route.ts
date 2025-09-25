import { NextRequest, NextResponse } from "next/server";
import { adminFirebaseOperations } from "@/lib/firebase/admin-database";
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
    const location = await adminFirebaseOperations.getLocationById(
      validatedReview.location_id
    );
    if (!location) {
      return NextResponse.json(
        { success: false, error: "Location not found" },
        { status: 404 }
      );
    }

    // Allow multiple reviews per user per location
    console.log(`User ${user.uid} submitting review for location ${validatedReview.location_id}`);

    // Create review using admin SDK
    const newReview = await adminFirebaseOperations.createReview({
      ...validatedReview,
      user_id: user.uid,
      user_name: user.name || "Anonymous",
      user_photo: user.picture || null,
    });

    // If review has photos and is auto-approved, add them to location photos
    if (validatedReview.photos && validatedReview.photos.length > 0) {
      console.log(`Adding ${validatedReview.photos.length} photos from review to location photos`);
      
      try {
        // Add each photo to the location's photo collection
        for (const photoUrl of validatedReview.photos) {
          // Extract public_id from Cloudinary URL for proper storage
          const publicIdMatch = photoUrl.match(/\/([^\/]+)\.(jpg|jpeg|png|gif|webp)$/i);
          const publicId = publicIdMatch ? publicIdMatch[1] : `review_photo_${Date.now()}`;
          
          await adminFirebaseOperations.createPhoto({
            location_id: validatedReview.location_id,
            cloudinary_url: photoUrl,
            cloudinary_public_id: publicId,
            user_id: user.uid,
            user_name: user.name || "Anonymous",
            description: `Photo from review: ${validatedReview.text?.substring(0, 100) || 'User review'}`,
            status: 'approved' // Auto-approve photos from reviews
          });
        }
        console.log(`✅ Successfully added ${validatedReview.photos.length} photos to location`);
      } catch (photoError) {
        console.error('❌ Error adding review photos to location:', photoError);
        // Don't fail the review submission if photo addition fails
      }
    }

    // Update location's average rating and review count
    await adminFirebaseOperations.updateLocationRating(validatedReview.location_id);

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
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const locationId = url.searchParams.get("location_id");
    const userId = url.searchParams.get("user_id");
    
    // Handle user-specific review queries (requires auth)
    if (locationId && userId) {
      try {
        const user = await verifyFirebaseToken(request);
        
        // Verify the requesting user matches the user_id parameter
        if (user.uid !== userId) {
          return NextResponse.json({ success: false, error: "Forbidden - Can only access your own reviews" }, { status: 403 });
        }
        
        const reviews = await adminFirebaseOperations.getReviewsByLocationAndUser(locationId, userId);
        return NextResponse.json({ success: true, reviews });
      } catch (authError) {
        console.error("❌ Auth failed for user review query:", authError);
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
      }
    }
    
    // Handle location-specific reviews (public)
    if (locationId) {
      try {
        const reviews = await adminFirebaseOperations.getReviewsByLocation(locationId);
        // Filter to only approved reviews for public access
        const approvedReviews = reviews.filter((review: any) => review.status === 'approved');
        return NextResponse.json({ success: true, reviews: approvedReviews });
      } catch (error) {
        console.error("Error fetching location reviews:", error);
        return NextResponse.json(
          { success: false, error: "Failed to fetch location reviews" },
          { status: 500 }
        );
      }
    }
    
    if (status) {
      // Only allow moderators/admins to filter by status
      try {
        const user = await verifyFirebaseToken(request);
        
        // Check if user has mod or admin role
        const userRoles = await adminFirebaseOperations.getUserRoles(user.email || '');
        const hasModeratorAccess = userRoles.includes('mod') || userRoles.includes('admin');
        
        if (!hasModeratorAccess) {
          return NextResponse.json({ success: false, error: "Forbidden - Moderator access required" }, { status: 403 });
        }
      } catch (authError) {
        console.error("❌ Auth failed for status filtering:", authError);
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
      }
      
      try {
        console.log(`🔍 Fetching reviews with status: ${status}`);
        const reviews = await adminFirebaseOperations.getReviewsByStatus(status);
        console.log(`✅ Found ${reviews.length} reviews with status: ${status}`);
        return NextResponse.json({ success: true, data: reviews });
      } catch (error) {
        console.error(`❌ Error fetching reviews by status ${status}:`, error);
        return NextResponse.json(
          { success: false, error: `Failed to fetch ${status} reviews` },
          { status: 500 }
        );
      }
    }
    
    // Get all approved reviews for regular users (no auth required for public reviews)
    try {
      const reviews = await adminFirebaseOperations.getReviewsByStatus("approved");
      return NextResponse.json({ success: true, data: reviews });
    } catch (error) {
      console.error("Error fetching all reviews:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch reviews" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in GET /api/reviews:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH method for moderating reviews
export async function PATCH(request: NextRequest) {
  try {
    // Verify authentication and role using admin SDK
    const user = await verifyFirebaseToken(request);
    
    // Check if user has mod or admin role
    const userRoles = await adminFirebaseOperations.getUserRoles(user.email || '');
    const hasModeratorAccess = userRoles.includes('mod') || userRoles.includes('admin');
    
    if (!hasModeratorAccess) {
      return NextResponse.json({ success: false, error: "Forbidden - Moderator access required" }, { status: 403 });
    }

    const { reviewId, action, moderatorId } = await request.json();

    if (!reviewId || !action) {
      return NextResponse.json(
        { success: false, error: "Review ID and action are required" },
        { status: 400 }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Action must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    console.log(`🔄 Moderating review ${reviewId}: ${action}`);
    const status = action === "approve" ? "approved" : "rejected";
    const moderatedReview = await adminFirebaseOperations.updateReviewStatus(
      reviewId,
      status,
      moderatorId || user.uid
    );
    console.log(`✅ Review ${reviewId} ${action}d successfully`);

    return NextResponse.json({
      success: true,
      data: moderatedReview,
      message: `Review ${action}d successfully`,
    });
  } catch (error) {
    console.error("❌ Review moderation error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to moderate review",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
