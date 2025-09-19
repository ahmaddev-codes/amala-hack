import { NextRequest, NextResponse } from "next/server";
import { googlePlacesService } from "@/lib/services/google-places-service";
import { z } from "zod";

// Request validation schema
const enrichLocationSchema = z.object({
  locationId: z.string().optional(),
  name: z.string(),
  address: z.string(),
  city: z.string().optional(),
  country: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = enrichLocationSchema.parse(body);

    // Enrich location with Google Places data
    const enrichedLocation =
      await googlePlacesService.enrichLocationWithPricing(validatedData);

    return NextResponse.json({
      success: true,
      data: enrichedLocation,
    });
  } catch (error) {
    console.error("Places API integration error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to enrich location data",
      },
      { status: 500 }
    );
  }
}

// Search for restaurants via Google Places
const searchRestaurantsSchema = z.object({
  query: z.string(),
  location: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
  radius: z.number().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const radius = searchParams.get("radius");

    if (!query) {
      return NextResponse.json(
        { success: false, error: "Query parameter required" },
        { status: 400 }
      );
    }

    const location =
      lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : undefined;
    const searchRadius = radius ? parseInt(radius) : 5000;

    // Search restaurants
    const results = await googlePlacesService.searchRestaurants(
      query,
      location,
      searchRadius
    );

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Places search error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to search restaurants",
      },
      { status: 500 }
    );
  }
}
