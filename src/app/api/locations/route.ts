import { NextRequest, NextResponse } from "next/server";
import { firebaseOperations } from "@/lib/firebase/database";
import { AmalaLocation, LocationFilter, Review } from "@/types/location";
import { rateLimit } from "@/lib/auth";
import {
  LocationSubmissionSchema,
  LocationQuerySchema,
  type LocationSubmissionOutput,
  type LocationQueryOutput,
} from "@/lib/validation/location-schemas";
import { checkForDuplicatesWithReasons } from "@/lib/database/dedup-helper";
import { logAnalyticsEvent } from "@/lib/utils";
import { PlacesApiNewService } from "@/lib/services/places-api-new";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters using Zod
    const queryParams: Record<string, any> = {};

    // Convert URLSearchParams to object
    for (const [key, value] of searchParams.entries()) {
      if (queryParams[key]) {
        // Handle arrays (like priceRange, cuisine)
        if (Array.isArray(queryParams[key])) {
          queryParams[key].push(value);
        } else {
          queryParams[key] = [queryParams[key], value];
        }
      } else {
        queryParams[key] = value;
      }
    }

    // Validate with Zod schema
    let validatedQuery: LocationQueryOutput;
    try {
      validatedQuery = LocationQuerySchema.parse(
        queryParams
      ) as LocationQueryOutput;
    } catch (error: any) {
      const errorMessages =
        error.errors
          ?.map((err: any) => `${err.path.join(".")}: ${err.message}`)
          .join(", ") || "Invalid query parameters";
      return NextResponse.json(
        {
          success: false,
          error: "Invalid query parameters",
          details: errorMessages,
        },
        { status: 400 }
      );
    }

    const filters: LocationFilter = {
      searchQuery: validatedQuery.search,
      isOpenNow: validatedQuery.openNow,
      serviceType: validatedQuery.serviceType,
      priceRange: validatedQuery.priceRange,
      cuisine: validatedQuery.cuisine,
      dietary: validatedQuery.dietary,
      features: validatedQuery.features,
      bounds: validatedQuery.bounds,
      sortBy: validatedQuery.sortBy,
    };

    const includeReviews = validatedQuery.includeReviews;
    const statusParam = searchParams.get("status");
    const includeAll = searchParams.get("includeAll") === "true";
    
    // Validate status parameter
    const validStatuses = ["pending", "approved", "rejected"] as const;
    const status = statusParam && validStatuses.includes(statusParam as any) 
      ? statusParam as "pending" | "approved" | "rejected" 
      : null;
    
    let locations;
    if (includeAll) {
      // Get all locations regardless of status (for admin/scout views)
      locations = await firebaseOperations.getAllLocations(filters);
    } else if (status) {
      // Get locations with specific status (for moderation)
      locations = await firebaseOperations.getLocationsByStatus(status);
    } else {
      // Default: get only approved locations
      locations = await firebaseOperations.getLocations(filters);
    }

    const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    console.log(
      "🔑 Server-side Google API Key:",
      googleApiKey ? googleApiKey.substring(0, 20) + "..." : "undefined"
    );
    if (googleApiKey) {
      locations = await Promise.all(
        locations.map(async (location) => {
          // Skip if already enriched (more aggressive: enrich if missing rating/images or default serviceType)
          if (
            location.rating &&
            location.images &&
            location.images.length > 0 &&
            location.serviceType !== "both"
          ) {
            return location;
          }

          const placeId = await PlacesApiNewService.findPlaceId(
            location.address,
            googleApiKey
          );
          if (!placeId) return location;

          const details = await PlacesApiNewService.getPlaceDetails(
            placeId,
            googleApiKey
          );
          if (!details) return location;

          // Generate images
          const images =
            details.photos && details.photos.length > 0
              ? details.photos.map(
                  (photo: any) =>
                    `/api/proxy/google-photo?photoreference=${
                      photo.photoReference
                    }&maxwidth=400&locationName=${encodeURIComponent(
                      details.displayName.text
                    )}&cuisine=${encodeURIComponent(
                      (details.types || []).join(",")
                    )}`
                )
              : location.images || [];

          // Update rating and review count
          const rating = details.rating || location.rating;
          const reviewCount = details.userRatingCount || location.reviewCount;

          // Parse hours
          let hours = location.hours;
          const isOpenNow =
            details.regularOpeningHours?.openNow ?? location.isOpenNow ?? false;
          if (
            details.regularOpeningHours?.periods &&
            details.regularOpeningHours.periods.length > 0
          ) {
            hours = parseGoogleHours(details.regularOpeningHours.periods);
          }

          // Infer service type
          let serviceType = location.serviceType || "both";
          if (details.types) {
            if (
              details.types.includes("meal_takeaway") ||
              details.types.includes("meal_delivery")
            ) {
              serviceType = "takeaway";
            } else if (
              details.types.includes("restaurant") &&
              !serviceType.includes("takeaway")
            ) {
              serviceType = "dine-in";
            } else if (details.types.includes("restaurant")) {
              serviceType = "both";
            }
          }

          // Price range
          let priceRange = location.priceRange;
          if (details.priceLevel !== undefined) {
            priceRange =
              details.priceLevel === "PRICE_LEVEL_FREE" ||
              details.priceLevel === "PRICE_LEVEL_INEXPENSIVE"
                ? "$"
                : details.priceLevel === "PRICE_LEVEL_MODERATE"
                ? "$$"
                : details.priceLevel === "PRICE_LEVEL_EXPENSIVE"
                ? "$$$"
                : "$$$$";
          }

          // Phone and website
          const phone = details.nationalPhoneNumber || location.phone;
          const website = details.websiteUri || location.website;
          const description = location.description; // Places API (New) doesn't have editorial summary in basic fields
          const coordinates = details.location
            ? {
                lat: details.location.latitude,
                lng: details.location.longitude,
              }
            : location.coordinates;

          return {
            ...location,
            images,
            rating,
            reviewCount,
            hours,
            isOpenNow,
            serviceType,
            priceRange,
            phone,
            website,
            description,
            coordinates,
          };
        })
      );
    }

    if (includeReviews) {
      // For small sets, fetch reviews for each
      locations = await Promise.all(
        locations.map(async (location) => {
          const fullLocation = await firebaseOperations.getLocationWithReviews(
            location.id
          );
          return fullLocation || location;
        })
      );
    }

    return NextResponse.json({
      success: true,
      data: locations,
      count: locations.length,
    });
  } catch (error) {
    console.error("Failed to fetch locations:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch locations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit submissions per IP
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rl = rateLimit(`locations:post:${ip}`, 10, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { location } = body;

    // Validate and normalize the location data using Zod
    let validatedLocation: LocationSubmissionOutput;
    try {
      validatedLocation = LocationSubmissionSchema.parse(location);
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

    // Check for duplicates using the dedup helper
    const duplicateCheck = await checkForDuplicatesWithReasons({
      name: validatedLocation.name,
      address: validatedLocation.address,
      coordinates: validatedLocation.coordinates,
    });

    if (duplicateCheck.isDuplicate) {
      // Log duplicate attempt
      await logAnalyticsEvent("duplicate_submission_attempted", undefined, {
        name: validatedLocation.name,
        reason: duplicateCheck.reason,
        similarLocations: duplicateCheck.similarLocations.length,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Duplicate location detected",
          details: duplicateCheck.reason,
          similarLocations: duplicateCheck.similarLocations.slice(0, 3), // Show top 3 similar
          moderationReasons: duplicateCheck.moderationReasons,
        },
        { status: 409 }
      );
    }

    const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    console.log(
      "🔑 Server-side Google API Key:",
      googleApiKey ? googleApiKey.substring(0, 20) + "..." : "undefined"
    );
    let enrichedLocation = { ...validatedLocation };

    if (googleApiKey && validatedLocation.address) {
      const placeId = await PlacesApiNewService.findPlaceId(
        validatedLocation.address,
        googleApiKey
      );
      if (placeId) {
        const details = await PlacesApiNewService.getPlaceDetails(
          placeId,
          googleApiKey
        );
        if (details) {
          // Enrich with Google data
          const images = details.photos
            ? details.photos.map(
                (photo: any) =>
                  `/api/proxy/google-photo?photoreference=${
                    photo.photoReference
                  }&maxwidth=400&locationName=${encodeURIComponent(
                    details.displayName.text
                  )}&cuisine=${encodeURIComponent(
                    (details.types || []).join(",")
                  )}`
              )
            : [];


          // Parse hours from Google
          let hours = validatedLocation.hours;
          if (details.regularOpeningHours?.periods) {
            hours = parseGoogleHours(details.regularOpeningHours.periods);
          }

          enrichedLocation = {
            ...validatedLocation,
            coordinates: details.location
              ? {
                  lat: details.location.latitude,
                  lng: details.location.longitude,
                }
              : validatedLocation.coordinates,
            phone: details.nationalPhoneNumber || validatedLocation.phone,
            website: details.websiteUri || validatedLocation.website,
            rating: details.rating || validatedLocation.rating,
            reviewCount:
              details.userRatingCount || validatedLocation.reviewCount,
            images: [...(validatedLocation.images || []), ...images],
            hours,
            priceRange:
              details.priceLevel !== undefined
                ? details.priceLevel === "PRICE_LEVEL_FREE" ||
                  details.priceLevel === "PRICE_LEVEL_INEXPENSIVE"
                  ? "$"
                  : details.priceLevel === "PRICE_LEVEL_MODERATE"
                  ? "$$"
                  : details.priceLevel === "PRICE_LEVEL_EXPENSIVE"
                  ? "$$$"
                  : "$$$$"
                : validatedLocation.priceRange,
            isOpenNow:
              details.regularOpeningHours?.openNow ??
              validatedLocation.isOpenNow,
            description: validatedLocation.description, // Places API (New) doesn't have editorial summary in basic fields
          };
        }
      }
    }

    // Add submission metadata with required fields and defaults
    const defaultHours = {
      monday: { open: "08:00", close: "20:00", isOpen: false },
      tuesday: { open: "08:00", close: "20:00", isOpen: false },
      wednesday: { open: "08:00", close: "20:00", isOpen: false },
      thursday: { open: "08:00", close: "20:00", isOpen: false },
      friday: { open: "08:00", close: "20:00", isOpen: false },
      saturday: { open: "09:00", close: "19:00", isOpen: false },
      sunday: { open: "10:00", close: "18:00", isOpen: false },
    };

    const locationData = {
      ...enrichedLocation,
      isOpenNow: enrichedLocation.isOpenNow ?? false,
      dietary: enrichedLocation.dietary ?? [],
      features: enrichedLocation.features ?? [],
      hours: enrichedLocation.hours ?? defaultHours,
      status: "pending",
      discoverySource: "user-submitted",
    } as any;

    // Ensure coordinates are provided
    if (
      !locationData.coordinates ||
      !locationData.coordinates.lat ||
      !locationData.coordinates.lng
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Coordinates are required for location submission",
        },
        { status: 400 }
      );
    }

    const newLocation = await firebaseOperations.createLocation(locationData);

    // Log analytics
    await logAnalyticsEvent("location_submitted", newLocation.id, {
      name: newLocation.name,
      source: locationData.discoverySource,
      hasCoordinates: !!newLocation.coordinates,
      hasImages: (newLocation.images?.length || 0) > 0,
    });

    return NextResponse.json({
      success: true,
      data: newLocation,
      message: "Location submitted for review",
    });
  } catch (error) {
    console.error("Failed to create location:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create location" },
      { status: 500 }
    );
  }
}

// Helper function to parse Google opening hours periods into AmalaLocation hours format
function parseGoogleHours(periods: any[]): {
  monday: { open: string; close: string; isOpen: boolean };
  tuesday: { open: string; close: string; isOpen: boolean };
  wednesday: { open: string; close: string; isOpen: boolean };
  thursday: { open: string; close: string; isOpen: boolean };
  friday: { open: string; close: string; isOpen: boolean };
  saturday: { open: string; close: string; isOpen: boolean };
  sunday: { open: string; close: string; isOpen: boolean };
} {
  const dayMap: { [key: number]: string } = {
    0: "sunday",
    1: "monday",
    2: "tuesday",
    3: "wednesday",
    4: "thursday",
    5: "friday",
    6: "saturday",
  };

  const hours: {
    monday: { open: string; close: string; isOpen: boolean };
    tuesday: { open: string; close: string; isOpen: boolean };
    wednesday: { open: string; close: string; isOpen: boolean };
    thursday: { open: string; close: string; isOpen: boolean };
    friday: { open: string; close: string; isOpen: boolean };
    saturday: { open: string; close: string; isOpen: boolean };
    sunday: { open: string; close: string; isOpen: boolean };
  } = {
    monday: { open: "08:00", close: "20:00", isOpen: false },
    tuesday: { open: "08:00", close: "20:00", isOpen: false },
    wednesday: { open: "08:00", close: "20:00", isOpen: false },
    thursday: { open: "08:00", close: "20:00", isOpen: false },
    friday: { open: "08:00", close: "20:00", isOpen: false },
    saturday: { open: "09:00", close: "19:00", isOpen: false },
    sunday: { open: "10:00", close: "18:00", isOpen: false },
  };

  if (periods && periods.length > 0) {
    periods.forEach((period: any) => {
      const openDay = dayMap[period.open?.day];
      const closeDay = period.close ? dayMap[period.close.day] : openDay;
      const openTime = formatTime(period.open?.time);
      const closeTime = period.close ? formatTime(period.close?.time) : "23:00";

      if (openDay && openDay in hours) {
        (hours as any)[openDay] = {
          open: openTime,
          close: closeTime,
          isOpen: false,
        };
      }
    });
  }

  return hours;
}

function formatTime(timeStr: string | undefined): string {
  if (!timeStr || typeof timeStr !== "string") {
    return "00:00"; // Default fallback time
  }
  if (timeStr.length === 4) {
    return `${timeStr.substring(0, 2)}:${timeStr.substring(2)}`;
  }
  return timeStr;
}
