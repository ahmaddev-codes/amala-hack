import { NextRequest, NextResponse } from "next/server";
import { firebaseOperations } from "@/lib/firebase/database";
import { PlacesApiNewService } from "@/lib/services/places-api-new";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { locationId, address, name, forceRefresh = false } = body;

    if (!locationId || !address || !name) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!googleApiKey) {
      return NextResponse.json(
        { success: false, error: "Google API key not configured" },
        { status: 500 }
      );
    }

    console.log(`🔍 Enriching location: ${name} at ${address}`);

    // Find place ID using Places API
    const placeId = await PlacesApiNewService.findPlaceId(
      address,
      googleApiKey
    );
    if (!placeId) {
      console.log(`❌ No place ID found for ${name}`);
      return NextResponse.json(
        { success: false, error: "Place not found in Google Places API" },
        { status: 404 }
      );
    }

    console.log(`🎯 Found place ID: ${placeId}`);

    // Get detailed information from Places API
    const details = await PlacesApiNewService.getPlaceDetails(
      placeId,
      googleApiKey
    );
    if (!details) {
      console.log(`❌ No details found for place ID: ${placeId}`);
      return NextResponse.json(
        { success: false, error: "Could not fetch place details" },
        { status: 404 }
      );
    }

    console.log(`📍 Got place details:`, {
      name: details.displayName?.text,
      rating: details.rating,
      reviewCount: details.userRatingCount,
      photosCount: details.photos?.length || 0,
    });

    // Generate image URLs from Places API photos
    const images =
      details.photos && details.photos.length > 0
        ? details.photos
            .slice(0, 5)
            .map(
              (photo: any) =>
                `/api/proxy/google-photo?photoreference=${
                  photo.name
                }&maxwidth=400&locationName=${encodeURIComponent(
                  details.displayName?.text || name
                )}&cuisine=Nigerian`
            )
        : [];

    // Parse hours from Places API
    const hours: Record<string, { open: string; close: string; isOpen: boolean }> = {};
    let isOpenNow = false;

    if (details.regularOpeningHours) {
      isOpenNow = details.regularOpeningHours.openNow || false;

      if (details.regularOpeningHours.periods) {
        const dayNames = [
          "sunday",
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
        ];

        details.regularOpeningHours.periods.forEach((period: any) => {
          if (period.open) {
            const dayName = dayNames[period.open.day];
            hours[dayName] = {
              open: `${period.open.hour}:${period.open.minute
                .toString()
                .padStart(2, "0")}`,
              close: period.close
                ? `${period.close.hour}:${period.close.minute
                    .toString()
                    .padStart(2, "0")}`
                : "23:59",
              isOpen: true,
            };
          }
        });
      }
    }

    // Update location in database with enriched data
    const enrichedData = {
      rating: details.rating || undefined,
      reviewCount: details.userRatingCount || undefined,
      images: images,
      isOpenNow: isOpenNow,
      hours: Object.keys(hours).length > 0 ? hours : undefined,
      phone: details.nationalPhoneNumber || undefined,
      website: details.websiteUri || undefined,
      placeId: placeId,
      // Keep existing data and add Places API data
      enrichedAt: new Date().toISOString(),
      enrichmentSource: "google-places-api",
    };

    // Update the location in Firebase
    let updatedLocation = null;
    try {
      // First, delete existing Google Places API reviews for this location
      await firebaseOperations.deleteReviewsBySource(locationId, "google-places-api");

      // Insert new reviews from Places API
      if (details.reviews && details.reviews.length > 0) {
        const reviewsToInsert = details.reviews
          .slice(0, 5)
          .map((review: any) => ({
            location_id: locationId,
            author: review.authorAttribution.displayName || "Google User",
            rating: review.rating,
            text: review.text.text || review.originalText.text,
            date_posted: new Date(),
            status: "approved" as const,
            source: "google-places-api",
            author_photo: review.authorAttribution.photoUri || null,
            publish_time_description:
              review.relativePublishTimeDescription || null,
          }));

        for (const review of reviewsToInsert) {
          try {
            await firebaseOperations.createReview(review);
          } catch (reviewError) {
            console.error("❌ Failed to insert review:", reviewError);
          }
        }
        console.log(`✅ Inserted ${reviewsToInsert.length} reviews`);
      }

      // Update the location with enriched data
      updatedLocation = await firebaseOperations.updateLocation(locationId, enrichedData);

      if (!updatedLocation) {
        console.error("❌ Database update error: Location not found");
        return NextResponse.json(
          { success: false, error: "Failed to update location in database" },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error("❌ Database update error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to update location in database" },
        { status: 500 }
      );
    }

    console.log(`✅ Successfully enriched ${name} with Places API data`);

    return NextResponse.json({
      success: true,
      data: {
        locationId,
        placeId,
        enrichedData,
        updatedLocation,
      },
    });
  } catch (error) {
    console.error("❌ Enrichment error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check enrichment status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");

    if (!locationId) {
      return NextResponse.json(
        { success: false, error: "Location ID required" },
        { status: 400 }
      );
    }

    const location = await firebaseOperations.getLocationById(locationId);
    if (!location) {
      return NextResponse.json(
        { success: false, error: "Location not found" },
        { status: 404 }
      );
    }

    const hasRealData = !!(
      location.rating &&
      location.rating > 0 &&
      location.images &&
      location.images.length > 0 &&
      !location.images[0].includes("placeholder") &&
      location.reviewCount &&
      location.reviewCount > 0
    );

    return NextResponse.json({
      success: true,
      data: {
        locationId,
        name: location.name,
        hasRealData,
        rating: location.rating,
        reviewCount: location.reviewCount,
        imagesCount: location.images?.length || 0,
        enrichedAt: location.enrichedAt,
        enrichmentSource: location.enrichmentSource,
      },
    });
  } catch (error) {
    console.error("❌ Enrichment status check error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
