import { NextResponse } from "next/server";
import { AutonomousDiscoveryService } from "@/lib/services/autonomous-discovery";
import { dbOperations } from "@/lib/database/supabase";
import axios from "axios";
import crypto from "crypto";

export async function POST() {
  try {
    // Trigger autonomous discovery from multiple sources
    const discoveredLocations =
      await AutonomousDiscoveryService.discoverLocations();

    // Save discovered locations to database with 'pending' status
    const savedLocations = [];
    const skippedDuplicates = [];
    const saveErrors = [];

    for (const location of discoveredLocations) {
      try {
        // Check for duplicates by name and address similarity
        const existingLocations = await dbOperations.getLocations();
        const isDuplicate = existingLocations.some(
          (existing) => {
            const nameSim = AutonomousDiscoveryService.calculateSimilarity(
              location.name.toLowerCase().trim(),
              existing.name.toLowerCase().trim()
            );
            const addrSim = location.address
              ? AutonomousDiscoveryService.calculateSimilarity(
                  location.address.toLowerCase().trim(),
                  existing.address.toLowerCase().trim()
                )
              : 0;
            return nameSim > 0.7 || addrSim > 0.85;
          }
        );

        if (isDuplicate) {
          skippedDuplicates.push(location.name);
          continue;
        }

        // Enrich with Google Places API if possible
        const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        let enrichedLocation = { ...location };

        if (googleApiKey && location.address) {
          const placeId = await findPlaceId(location.address, googleApiKey);
          if (placeId) {
            const details = await fetchPlaceDetails(placeId, googleApiKey);
            if (details) {
              // Generate images
              const images = details.photos ? details.photos.map((photo: any) =>
                `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${googleApiKey}`
              ) : [];

              // Reviews
              const reviews = details.reviews ? details.reviews.slice(0, 5).map((r: any) => ({
                id: crypto.randomUUID(),
                location_id: '', // Set after insert
                author: r.author_name,
                rating: r.rating,
                text: r.text,
                date_posted: new Date(r.time * 1000),
                status: 'approved' as const,
              })) : [];

              // Hours
              let hours = location.hours;
              const isOpenNow = details.opening_hours?.open_now ?? location.isOpenNow ?? false;
              if (details.opening_hours?.periods) {
                hours = parseGoogleHours(details.opening_hours.periods);
              }

              // Service type
              let serviceType = location.serviceType || "both";
              if (details.types) {
                if (details.types.includes('meal_takeaway') || details.types.includes('meal_delivery')) {
                  serviceType = 'takeaway';
                } else if (details.types.includes('restaurant')) {
                  serviceType = 'dine-in';
                }
              }

              // Price range
              let priceRange = location.priceRange || "$$";
              if (details.price_level !== undefined) {
                priceRange = details.price_level === 0 || details.price_level === 1 ? '$' : details.price_level === 2 ? '$$' : details.price_level === 3 ? '$$$' : '$$$$';
              }

              // Other fields
              const phone = details.formatted_phone_number || location.phone;
              const website = details.website || location.website;
              const description = details.editorial_summary?.overview || location.description;
              const coordinates = details.geometry?.location || location.coordinates;
              const rating = details.rating || location.rating;
              const reviewCount = details.user_ratings_total || location.reviewCount || reviews.length;

              enrichedLocation = {
                ...location,
                images,
                reviews,
                hours,
                isOpenNow,
                serviceType,
                priceRange,
                phone,
                website,
                description,
                coordinates,
                rating,
                reviewCount,
              };
            }
          }
        }

        // Create location for database
        const locationToSave = {
          ...enrichedLocation,
          status: "pending" as const,
          submittedAt: new Date(),
          description: `${enrichedLocation.description || ""} [Auto-discovered via ${
            enrichedLocation.discoverySource
          }]`.trim(),
        };

        const savedLocation = await dbOperations.createLocation(locationToSave);
        savedLocations.push(savedLocation);
        console.log(`✅ Saved location: ${savedLocation.name} (ID: ${savedLocation.id})`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        if (errorMsg.includes('duplicate') || errorMsg.includes('similarity')) {
          skippedDuplicates.push(location.name);
        } else {
          saveErrors.push({
            locationName: location.name || 'Unknown',
            error: errorMsg,
          });
          console.error(`❌ Failed to save location "${location.name}":`, error);
          console.error('Full error details:', JSON.stringify(error, null, 2));
        }
      }
    }

    const summary = {
      totalDiscovered: discoveredLocations.length,
      savedToDatabase: savedLocations.length,
      skippedDuplicates: skippedDuplicates.length,
      duplicateNames: skippedDuplicates,
      saveErrors,
    };

    const hasErrors = saveErrors.length > 0;
    const responseData = {
      success: true,
      data: {
        savedLocations,
        summary,
      },
      message: hasErrors
        ? `⚠️ Discovery completed with issues: ${savedLocations.length} saved, ${skippedDuplicates.length} duplicates skipped. ${saveErrors.length} save errors occurred.`
        : `🎉 Autonomous discovery completed! ${savedLocations.length} new locations added to queue. ${skippedDuplicates.length} duplicates skipped.`,
    };

    if (hasErrors) {
      responseData.message += ' Check the console or errors array for details.';
      (responseData as any).warnings = saveErrors;
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Overall discovery error:', error);
    return NextResponse.json(
      {
        success: false,
        error: "Autonomous discovery failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Get discovery status or recent discoveries
    return NextResponse.json({
      success: true,
      data: {
        lastRun: new Date().toISOString(),
        status: "active",
        nextScheduledRun: new Date(
          Date.now() + 24 * 60 * 60 * 1000
        ).toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to get discovery status" },
      { status: 500 }
    );
  }
}

// Helper functions copied from locations/route.ts
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

async function fetchPlaceDetails(placeId: string, apiKey: string): Promise<any> {
  try {
    const fields = "name,formatted_address,geometry,photos,reviews,rating,user_ratings_total,opening_hours,price_level,website,formatted_phone_number,types";
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
