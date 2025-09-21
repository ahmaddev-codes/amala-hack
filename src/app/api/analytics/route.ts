import { NextRequest, NextResponse } from "next/server";
import { firebaseOperations } from "@/lib/firebase/database";
import { rateLimit } from "@/lib/auth";
import { collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { trackApiCall } from '@/lib/cache/memory-cache';

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

      // Log analytics event to Firebase
      const analyticsRef = collection(db, 'analytics_events');
      await addDoc(analyticsRef, {
        event_type,
        location_id: location_id || null,
        metadata: metadata || {},
        created_at: Timestamp.now(),
        createdAt: Timestamp.now(),
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
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const analyticsRef = collection(db, 'analytics_events');
      const q = query(
        analyticsRef,
        where('created_at', '>=', Timestamp.fromDate(since))
      );

      const snapshot = await getDocs(q);
      const counts: Record<string, number> = {};

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const eventType = data.event_type;
        counts[eventType] = (counts[eventType] || 0) + 1;
      });

      return NextResponse.json({ success: true, data: { counts, since: since.toISOString() } });
    } catch (error) {
      console.error('Analytics GET error:', error);
      return NextResponse.json({ success: false, error: "Failed to get analytics" }, { status: 500 });
    }
  })();
}


