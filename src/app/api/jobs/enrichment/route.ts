import { NextRequest, NextResponse } from "next/server";
import { BackgroundEnrichmentService } from "@/lib/jobs/background-enrichment";
import { adminFirebaseOperations } from "@/lib/firebase/admin-database";
import { requireRole, verifyBearerToken } from "@/lib/auth";

/**
 * Background enrichment job management API
 * Allows admins to trigger and monitor enrichment jobs
 */

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyBearerToken(request.headers.get("authorization") || undefined);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const roleCheck = requireRole(authResult.user, ["admin"]);
    if (!roleCheck.success) {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { action, locationIds, priority = 'medium' } = body;

    switch (action) {
      case 'queue-all-unenriched':
        // Queue all locations that need enrichment
        const allLocations = await adminFirebaseOperations.getAllLocations();
        await BackgroundEnrichmentService.queueMultipleLocations(allLocations);
        
        return NextResponse.json({
          success: true,
          message: `Queued ${allLocations.length} locations for background enrichment`,
          data: BackgroundEnrichmentService.getQueueStats()
        });

      case 'queue-specific':
        // Queue specific locations
        if (!locationIds || !Array.isArray(locationIds)) {
          return NextResponse.json(
            { success: false, error: "locationIds array is required" },
            { status: 400 }
          );
        }

        for (const locationId of locationIds) {
          const location = await adminFirebaseOperations.getLocationById(locationId);
          if (location) {
            await BackgroundEnrichmentService.queueLocationForEnrichment(
              locationId,
              location.address,
              priority
            );
          }
        }

        return NextResponse.json({
          success: true,
          message: `Queued ${locationIds.length} specific locations for enrichment`,
          data: BackgroundEnrichmentService.getQueueStats()
        });

      case 'queue-approved':
        // Queue only approved locations (high priority)
        const approvedLocations = await adminFirebaseOperations.getLocationsByStatus('approved');
        await BackgroundEnrichmentService.queueMultipleLocations(approvedLocations);
        
        return NextResponse.json({
          success: true,
          message: `Queued ${approvedLocations.length} approved locations for enrichment`,
          data: BackgroundEnrichmentService.getQueueStats()
        });

      case 'clear-queue':
        // Clear the enrichment queue
        BackgroundEnrichmentService.clearQueue();
        
        return NextResponse.json({
          success: true,
          message: "Enrichment queue cleared",
          data: BackgroundEnrichmentService.getQueueStats()
        });

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action. Use: queue-all-unenriched, queue-specific, queue-approved, or clear-queue" },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Background enrichment API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process enrichment job",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyBearerToken(request.headers.get("authorization") || undefined);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const roleCheck = requireRole(authResult.user, ["admin", "mod"]);
    if (!roleCheck.success) {
      return NextResponse.json({ success: false, error: "Admin or moderator access required" }, { status: 403 });
    }

    // Return queue statistics
    const stats = BackgroundEnrichmentService.getQueueStats();
    
    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        description: "Background enrichment queue statistics",
        availableActions: [
          "queue-all-unenriched",
          "queue-specific", 
          "queue-approved",
          "clear-queue"
        ]
      }
    });

  } catch (error) {
    console.error('Background enrichment stats error:', error);
    return NextResponse.json(
      { success: false, error: "Failed to get enrichment stats" },
      { status: 500 }
    );
  }
}
