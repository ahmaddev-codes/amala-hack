import { NextRequest, NextResponse } from "next/server";
import { AutonomousDiscoveryService } from "@/lib/services/autonomous-discovery";
import { PlacesApiNewService } from "@/lib/services/places-api";
import { BatchedPlacesApiService } from "@/lib/services/places-api-batch";
import { adminFirebaseOperations } from "@/lib/firebase/admin-database";
import axios from "axios";
import crypto from "crypto";
import { rateLimit, requireRole, verifyBearerToken } from "@/lib/auth";

// Analytics logging helper function using admin SDK
async function logAnalyticsEvent(eventType: string, metadata: any = {}) {
  try {
    await adminFirebaseOperations.createAnalyticsEvent({
      event_type: eventType,
      metadata,
    });
  } catch (error) {
    console.error('Failed to log analytics event:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyBearerToken(request.headers.get("authorization") || undefined);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const roleCheck = requireRole(authResult.user, ["mod", "admin"]);
    if (!roleCheck.success) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    // Feature flag: discovery jobs
    const enabled = (process.env.FEATURE_DISCOVERY_ENABLED || "false").toLowerCase() === "true";
    if (!enabled) {
      return NextResponse.json({ success: false, error: "Discovery is disabled by feature flag" }, { status: 503 });
    }
    // Rate limit discovery triggers
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = rateLimit(`discovery:post:${ip}`, 5, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ success: false, error: "Rate limit exceeded. Try again later." }, { status: 429 });
    }
    // Get geographic parameters from request body
    const body = await request.json().catch(() => ({}));
    const { region, country, state, continent } = body;

    // Log discovery session start
    await logAnalyticsEvent('discovery_started', {
      region: region || continent,
      country,
      state,
      user: authResult.user.email,
      timestamp: new Date().toISOString()
    });

    // Trigger autonomous discovery from multiple sources with geographic targeting
    const discoveredLocations = await AutonomousDiscoveryService.discoverLocations(
      region || continent, 
      country, 
      state
    );

    // Save discovered locations to database with 'pending' status
    const savedLocations = [];
    const skippedDuplicates = [];
    const saveErrors = [];

    for (const location of discoveredLocations) {
      try {
        // PERFORMANCE OPTIMIZATION: Use database query instead of loading all locations
        const similarLocations = await adminFirebaseOperations.findSimilarLocations(
          location.name || "",
          location.address || "",
          0.7
        );
        const isDuplicate = similarLocations.length > 0;

        if (isDuplicate) {
          skippedDuplicates.push(location.name);
          // Log duplicate event (Firebase analytics would go here)
          console.log(`Skipped duplicate: ${location.name}`);
          continue;
        }

        // Enrich with Google Places API if possible
        const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        let enrichedLocation = { ...location };

        if (googleApiKey && location.address) {
          // PERFORMANCE: Use batched API service for better caching and rate limiting
          const placeId = await BatchedPlacesApiService.findPlaceId(location.address, googleApiKey);
          if (placeId) {
            const details = await BatchedPlacesApiService.getPlaceDetails(placeId, googleApiKey);
            if (details) {
              // Convert to AmalaLocation format using the new service
              const convertedLocation = PlacesApiNewService.convertToAmalaLocation(details);
              
              // Generate images with proper photo names
              const images = details.photos ? details.photos.map((photo: any) =>
                `/api/proxy/google-photo?photoreference=${photo.name}&maxwidth=400&locationName=${encodeURIComponent(details.displayName.text)}&cuisine=${encodeURIComponent((details.types || []).join(','))}`
              ) : [];

              // Reviews
              const reviews = details.reviews ? details.reviews.slice(0, 5).map((r: any) => ({
                id: crypto.randomUUID(),
                location_id: '', // Set after insert
                author: r.authorAttribution?.displayName || 'Anonymous',
                rating: r.rating || 0,
                text: r.text?.text || r.originalText?.text || '',
                date_posted: new Date(),
                status: 'approved' as const,
              })) : [];

              // Hours
              let hours = location.hours;
              const isOpenNow = details.regularOpeningHours?.openNow ?? location.isOpenNow ?? false;
              if (details.regularOpeningHours?.periods) {
                hours = convertedLocation.hours || location.hours;
              }

              // Service type
              const serviceType = convertedLocation.serviceType || location.serviceType || "both";

              // Price range
              const priceRange = convertedLocation.priceRange || location.priceRange || "$$";

              // Other fields
              const phone = details.nationalPhoneNumber || location.phone;
              const website = details.websiteUri || location.website;
              const description = location.description; // Places API (New) doesn't have editorial summary in basic fields
              const coordinates = details.location ? {
                lat: details.location.latitude,
                lng: details.location.longitude
              } : location.coordinates;
              const rating = details.rating || location.rating;
              const reviewCount = details.userRatingCount || location.reviewCount || reviews.length;

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

        const savedLocation = await adminFirebaseOperations.createLocation(locationToSave);
        // Log saved location event (Firebase analytics would go here)
        console.log(`Saved location: ${savedLocation.name}`);
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
    
    // Log discovery session completion
    await logAnalyticsEvent(hasErrors ? 'discovery_completed_with_errors' : 'discovery_completed', {
      region: region || continent,
      country,
      state,
      user: authResult.user.email,
      locationsFound: discoveredLocations.length,
      locationsSaved: savedLocations.length,
      duplicatesSkipped: skippedDuplicates.length,
      errors: saveErrors.length,
      timestamp: new Date().toISOString()
    });
    
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
    
    // Log discovery failure
    try {
      await logAnalyticsEvent('discovery_failed', {
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      });
    } catch (logError) {
      console.error('Failed to log discovery failure:', logError);
    }
    
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
        status: (process.env.FEATURE_DISCOVERY_ENABLED || "false").toLowerCase() === "true" ? "active" : "disabled",
        nextScheduledRun: new Date(
          Date.now() + 24 * 60 * 60 * 1000
        ).toISOString(),
        sources: (process.env.FEATURE_DISCOVERY_SOURCES || "").split(",").map((s) => s.trim()).filter(Boolean),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to get discovery status" },
      { status: 500 }
    );
  }
}

// Helper functions removed - now using PlacesApiNewService

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
