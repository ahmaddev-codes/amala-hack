import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { dbOperations } from "@/lib/database/supabase";
import { LocationFilter, Review } from "@/types/location";

async function fetchPlaceDetails(placeId: string, apiKey: string): Promise<any> {
  try {
    const fields = "name,formatted_address,geometry,photos,reviews,rating,user_ratings_total,opening_hours,price_level,website,formatted_phone_number";
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/place/details/json`,
      {
        params: {
          place_id: placeId,
          fields,
          key: apiKey,
        },
      }
    );
    return response.data.result;
  } catch (error) {
    console.error(`Failed to fetch details for place ${placeId}:`, error);
    return null;
  }
}

async function findPlaceId(address: string, apiKey: string): Promise<string | null> {
  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/place/textsearch/json`,
      {
        params: {
          query: address,
          key: apiKey,
        },
      }
    );
    if (response.data.results && response.data.results.length > 0) {
      return response.data.results[0].place_id;
    }
    return null;
  } catch (error) {
    console.error(`Failed to find place_id for address ${address}:`, error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filters: LocationFilter = {
      searchQuery: searchParams.get("search") || undefined,
      isOpenNow: searchParams.get("openNow") === "true" || undefined,
      serviceType:
        (searchParams.get("serviceType") as
          | "dine-in"
          | "takeaway"
          | "both"
          | "all") || undefined,
      priceRange:
        (searchParams
          .getAll("priceRange")
          .filter((pr) => ["$", "$$", "$$$", "$$$$"].includes(pr)) as (
          | "$"
          | "$$"
          | "$$$"
          | "$$$$"
        )[]) || undefined,
      cuisine: searchParams.getAll("cuisine") || undefined,
    };

    const includeReviews = searchParams.get("includeReviews") === "true";
    let locations = await dbOperations.getLocations(filters);

    const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (googleApiKey) {
      locations = await Promise.all(locations.map(async (location) => {
        // Skip if already enriched (more aggressive: enrich if missing rating/images or default serviceType)
        if (
          location.rating &&
          location.images &&
          location.images.length > 0 &&
          location.serviceType !== "both"
        ) {
          return location;
        }

        const placeId = await findPlaceId(location.address, googleApiKey);
        if (!placeId) return location;

        const details = await fetchPlaceDetails(placeId, googleApiKey);
        if (!details) return location;

        // Generate images
        const images =
          details.photos && details.photos.length > 0
            ? details.photos.map((photo: any) =>
                `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${googleApiKey}`
              )
            : location.images || [];

        // Update rating and review count
        const rating = details.rating || location.rating;
        const reviewCount = details.user_ratings_total || location.reviewCount;

        // Parse hours
        let hours = location.hours;
        const isOpenNow = details.opening_hours?.open_now ?? location.isOpenNow ?? false;
        if (details.opening_hours?.periods && details.opening_hours.periods.length > 0) {
          hours = parseGoogleHours(details.opening_hours.periods);
        }

        // Infer service type
        let serviceType = location.serviceType || "both";
        if (details.types) {
          if (details.types.includes("meal_takeaway") || details.types.includes("meal_delivery")) {
            serviceType = "takeaway";
          } else if (details.types.includes("restaurant") && !serviceType.includes("takeaway")) {
            serviceType = "dine-in";
          } else if (details.types.includes("restaurant")) {
            serviceType = "both";
          }
        }

        // Price range
        let priceRange = location.priceRange;
        if (details.price_level !== undefined) {
          priceRange =
            details.price_level === 0 || details.price_level === 1
              ? "$"
              : details.price_level === 2
              ? "$$"
              : details.price_level === 3
              ? "$$$"
              : "$$$$";
        }

        // Phone and website
        const phone = details.formatted_phone_number || location.phone;
        const website = details.website || location.website;
        const description = details.editorial_summary?.overview || location.description;
        const coordinates = details.geometry?.location || location.coordinates;

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
      }));
    }

    if (includeReviews) {
      // For small sets, fetch reviews for each
      locations = await Promise.all(locations.map(async (location) => {
        const fullLocation = await dbOperations.getLocationWithReviews(location.id);
        return fullLocation;
      }));
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
    const body = await request.json();
    const { location } = body;

    // Basic validation
    if (!location.name || !location.address) {
      return NextResponse.json(
        { success: false, error: "Name and address are required" },
        { status: 400 }
      );
    }

    const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    let enrichedLocation = { ...location };

    if (googleApiKey && location.address) {
      const placeId = await findPlaceId(location.address, googleApiKey);
      if (placeId) {
        const details = await fetchPlaceDetails(placeId, googleApiKey);
        if (details) {
          // Enrich with Google data
          const images = details.photos ? details.photos.map((photo: any) =>
            `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${googleApiKey}`
          ) : [];

          const reviews: Review[] = details.reviews ? details.reviews.slice(0, 5).map((r: any) => ({
            id: crypto.randomUUID(),
            location_id: '', // Set after insert
            author: r.author_name,
            rating: r.rating,
            text: r.text,
            date_posted: new Date(r.time * 1000),
            status: 'approved' as const,
          })) : [];

          // Estimate priceInfo from price_level if no real price
          const priceLevelMap = {
            0: '₦500-1500',
            1: '₦1500-3000',
            2: '₦3000-5000',
            3: '₦5000-10000',
            4: '₦10000+',
          };
          const estimatedPrice = priceLevelMap[details.price_level as 0 | 1 | 2 | 3 | 4] || '₦2000-4000';

          enrichedLocation = {
            ...location,
            coordinates: details.geometry.location,
            phone: details.formatted_phone_number || location.phone,
            website: details.website || location.website,
            rating: details.rating,
            reviewCount: details.user_ratings_total,
            images,
            reviews,
            priceRange: details.price_level !== undefined ? (details.price_level === 0 || details.price_level === 1 ? '$' : details.price_level === 2 ? '$$' : details.price_level === 3 ? '$$$' : '$$$$') : location.priceRange,
            isOpenNow: details.opening_hours?.open_now ?? location.isOpenNow,
            description: details.editorial_summary?.overview || location.description,
          };
        }
      }
    }

    // Add submission metadata
    const locationData = {
      ...enrichedLocation,
      submittedAt: new Date(),
      status: "pending" as const,
      discoverySource: "user-submitted" as const,
    };

    const newLocation = await dbOperations.createLocation(locationData);

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
function parseGoogleHours(periods: any[]): { [key: string]: { open: string; close: string; isOpen: boolean } } {
  const dayMap: { [key: number]: string } = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
  };

  const hours: { [key: string]: { open: string; close: string; isOpen: boolean } } = {
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
      const closeTime = period.close ? formatTime(period.close.time) : "23:00";

      if (openDay) {
        hours[openDay] = { open: openTime, close: closeTime, isOpen: false };
      }
    });
  }

  return hours;
}

function formatTime(timeStr: string): string {
  if (timeStr.length === 4) {
    return `${timeStr.substring(0, 2)}:${timeStr.substring(2)}`;
  }
  return timeStr;
}
