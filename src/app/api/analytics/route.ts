import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/auth";
import { trackApiCall } from '@/lib/cache/memory-cache';
import { adminFirebaseOperations } from "@/lib/firebase/admin-database";

export async function POST(request: NextRequest) {
  return trackApiCall('/api/analytics')(async () => {
    try {
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
      const rl = rateLimit(`analytics:post:${ip}`, 50, 60_000);
      if (!rl.allowed) {
        return NextResponse.json({ success: false, error: "Rate limit exceeded" }, { status: 429 });
      }
      
      const body = await request.json();
      const { event_type, location_id, metadata } = body || {};
      
      if (!event_type) {
        return NextResponse.json({ success: false, error: "event_type required" }, { status: 400 });
      }

      // Log analytics event using admin SDK
      await adminFirebaseOperations.createAnalyticsEvent({
        event_type,
        location_id,
        metadata
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Analytics error:', error);
      return NextResponse.json({ success: false, error: "Failed to log event" }, { status: 500 });
    }
  })();
}

export async function GET() {
  return trackApiCall('/api/analytics')(async () => {
    try {
      // Basic 7-day metrics summary
      const events = await adminFirebaseOperations.getAnalyticsEvents(7);
      const counts: Record<string, number> = {};

      events.forEach(event => {
        const eventType = event.event_type;
        counts[eventType] = (counts[eventType] || 0) + 1;
      });

      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return NextResponse.json({ 
        success: true, 
        data: { 
          counts, 
          since: since.toISOString(),
          total_events: events.length
        } 
      });
    } catch (error) {
      console.error('Analytics GET error:', error);
      return NextResponse.json({ success: false, error: "Failed to get analytics" }, { status: 500 });
    }
  })();
}


