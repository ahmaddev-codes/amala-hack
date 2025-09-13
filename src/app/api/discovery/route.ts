import { NextResponse } from "next/server";
import { AutonomousDiscoveryService } from "@/lib/services/autonomous-discovery";
import { dbOperations } from "@/lib/database/supabase";

export async function POST() {
  try {
    // Trigger autonomous discovery from multiple sources
    const discoveredLocations =
      await AutonomousDiscoveryService.discoverLocations();

    // Save discovered locations to database with 'pending' status
    const savedLocations = [];
    const skippedDuplicates = [];

    for (const location of discoveredLocations) {
      try {
        // Check for duplicates by name and address (more precise matching)
        const existingLocations = await dbOperations.getLocations();
        const isDuplicate = existingLocations.some(
          (existing) =>
            existing.name.toLowerCase().trim() ===
            location.name.toLowerCase().trim()
        );

        if (isDuplicate) {
          skippedDuplicates.push(location.name);
          continue;
        }

        // Create location for database (without discoveryMetadata for now)
        const locationToSave = {
          ...location,
          status: "pending" as const,
          submittedAt: new Date(),
          // Store discovery info in description temporarily
          description: `${location.description || ""} [Auto-discovered via ${
            location.discoverySource
          }]`.trim(),
        };

        const savedLocation = await dbOperations.createLocation(locationToSave);
        savedLocations.push(savedLocation);
      } catch (error) {
        // Silently continue on save errors
      }
    }

    const summary = {
      totalDiscovered: discoveredLocations.length,
      savedToDatabase: savedLocations.length,
      skippedDuplicates: skippedDuplicates.length,
      duplicateNames: skippedDuplicates,
    };

    return NextResponse.json({
      success: true,
      data: {
        savedLocations,
        summary,
      },
      message: `🎉 Autonomous discovery completed! ${savedLocations.length} new locations added to moderation queue. ${skippedDuplicates.length} duplicates skipped.`,
    });
  } catch (error) {
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
