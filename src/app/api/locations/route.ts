import { NextRequest, NextResponse } from "next/server";
import { dbOperations } from "@/lib/database/supabase";
import { LocationFilter } from "@/types/location";

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

    const locations = await dbOperations.getLocations(filters);

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
    const { location, submitterInfo } = body;

    // Basic validation
    if (!location.name || !location.address) {
      return NextResponse.json(
        { success: false, error: "Name and address are required" },
        { status: 400 }
      );
    }

    // Add submission metadata
    const locationData = {
      ...location,
      submitterInfo,
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
