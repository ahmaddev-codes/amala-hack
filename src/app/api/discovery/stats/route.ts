import { NextRequest, NextResponse } from "next/server";
import { adminFirebaseOperations } from "@/lib/firebase/admin-database";
import { verifyBearerToken, requireRole } from "@/lib/auth";

// TypeScript interfaces for analytics events
interface AnalyticsEvent {
  id: string;
  event_type: string;
  created_at: Date;
  metadata?: any;
}

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Discovery stats API called');
    
    // Verify authentication for admin/mod access
    const authResult = await verifyBearerToken(request.headers.get("authorization") || undefined);
    if (!authResult.success || !authResult.user) {
      console.log('❌ Discovery stats: Unauthorized');
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const roleCheck = requireRole(authResult.user, ["mod", "admin"]);
    if (!roleCheck.success) {
      console.log('❌ Discovery stats: Forbidden');
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const days = Number(searchParams.get("days")) || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    console.log(`📊 Fetching discovery stats for last ${days} days since ${since.toISOString()}`);

    // Get all locations to analyze discovery patterns
    console.log('📊 Fetching all locations...');
    const allLocations = await adminFirebaseOperations.getAllLocations();
    console.log(`📊 Found ${allLocations.length} total locations`);
    
    // Filter locations discovered via autonomous discovery
    console.log('📊 Filtering discovered locations...');
    const discoveredLocations = allLocations.filter(loc => {
      const description = loc.description || '';
      return description.includes('[Auto-discovered via') || 
             description.includes('autonomous') ||
             loc.discoverySource;
    });
    console.log(`📊 Found ${discoveredLocations.length} discovered locations`);

    // Filter by date range
    console.log('📊 Filtering by date range...');
    const recentDiscoveries = discoveredLocations.filter(loc => {
      const submittedAt = loc.submittedAt;
      if (!submittedAt) return false;
      const submittedDate = submittedAt instanceof Date ? submittedAt : new Date(submittedAt);
      return submittedDate >= since;
    });
    console.log(`📊 Found ${recentDiscoveries.length} recent discoveries`);

    // Get analytics events for discovery sessions using admin SDK
    console.log('📊 Fetching analytics events...');
    let discoveryEvents: AnalyticsEvent[] = [];
    try {
      const allEvents = await adminFirebaseOperations.getAnalyticsEvents(days);
      console.log(`📊 Found ${allEvents.length} total analytics events`);
      
      // Filter for discovery-related events
      discoveryEvents = allEvents
        .filter(event => ['discovery_started', 'discovery_completed', 'discovery_failed'].includes(event.event_type))
        .map(event => ({
          id: event.id,
          event_type: event.event_type,
          created_at: event.created_at instanceof Date ? event.created_at : new Date(event.created_at),
          metadata: event.metadata || {}
        }));
      
      console.log(`📊 Found ${discoveryEvents.length} discovery analytics events`);
    } catch (error) {
      console.error('❌ Error fetching analytics events:', error);
      // Continue with empty array if analytics collection doesn't exist
      discoveryEvents = [];
    }

    // Calculate statistics
    console.log('📊 Calculating statistics...');
    const totalSessions = discoveryEvents.filter(e => e.event_type === 'discovery_started').length;
    const completedSessions = discoveryEvents.filter(e => e.event_type === 'discovery_completed').length;
    const failedSessions = discoveryEvents.filter(e => e.event_type === 'discovery_failed').length;
    console.log(`📊 Sessions: ${totalSessions} total, ${completedSessions} completed, ${failedSessions} failed`);
    
    // Calculate locations found through discovery
    const locationsFound = recentDiscoveries.length;
    
    // Calculate regions covered (based on location data)
    const regionsSet = new Set();
    recentDiscoveries.forEach(loc => {
      if (loc.address) {
        // Extract country/region from address
        const addressParts = loc.address.split(',');
        if (addressParts.length > 1) {
          const country = addressParts[addressParts.length - 1].trim();
          regionsSet.add(country);
        }
      }
    });
    const regionsCovered = regionsSet.size;

    // Calculate success rate
    const successRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

    // Get recent discovery activity (last 10 events)
    let recentActivity: (AnalyticsEvent & { message: string })[] = [];
    try {
      // Use the already fetched discovery events, sort by date and take last 10
      recentActivity = discoveryEvents
        .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
        .slice(0, 10)
        .map(event => ({
          ...event,
          message: getActivityMessage(event.event_type, event.metadata)
        }));
    } catch (error) {
      console.error('Error processing recent activity:', error);
      recentActivity = [];
    }

    // Calculate discovery trends (sessions per day)
    const sessionsPerDay: Record<string, number> = {};
    discoveryEvents.filter(e => e.event_type === 'discovery_started').forEach(event => {
      const dateKey = event.created_at.toISOString().slice(0, 10);
      sessionsPerDay[dateKey] = (sessionsPerDay[dateKey] || 0) + 1;
    });

    // System status
    const isDiscoveryEnabled = (process.env.FEATURE_DISCOVERY_ENABLED || "false").toLowerCase() === "true";
    const lastRunEvent = discoveryEvents
      .filter(e => e.event_type === 'discovery_completed')
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())[0];

    const stats = {
      activeSessions: 0, // Real-time sessions would need WebSocket tracking
      locationsFound,
      regionsCovered,
      successRate: Math.round(successRate),
      totalSessions,
      completedSessions,
      failedSessions,
      recentActivity,
      sessionsPerDay,
      systemStatus: {
        enabled: isDiscoveryEnabled,
        apiStatus: "online",
        rateLimit: "1000/hour",
        queueStatus: "empty",
        lastRun: lastRunEvent ? lastRunEvent.created_at.toISOString() : "Never"
      },
      dateRange: {
        since: since.toISOString(),
        days
      }
    };

    console.log('📊 Returning discovery stats successfully');
    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Discovery stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch discovery statistics' },
      { status: 500 }
    );
  }
}

function getActivityMessage(eventType: string, metadata: any): string {
  switch (eventType) {
    case 'discovery_started':
      const region = metadata?.region || metadata?.country || 'Unknown region';
      return `Discovery session started for ${region}`;
    case 'discovery_completed':
      const found = metadata?.locationsFound || 0;
      const saved = metadata?.locationsSaved || 0;
      return `Discovery completed: ${found} found, ${saved} saved`;
    case 'discovery_failed':
      const error = metadata?.error || 'Unknown error';
      return `Discovery failed: ${error}`;
    default:
      return `Discovery event: ${eventType}`;
  }
}
