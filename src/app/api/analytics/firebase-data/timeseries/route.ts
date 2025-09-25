import { NextRequest, NextResponse } from "next/server";
import { adminFirebaseOperations } from "@/lib/firebase/admin-database";
import { verifyBearerToken } from '@/lib/auth';
import { AnalyticsEvent, mapDocumentToAnalyticsEvent, TimeSeriesDataPoint } from '@/types/analytics';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyBearerToken(request.headers.get("authorization") || undefined);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    
    // Fetch analytics events using admin SDK
    const events = await adminFirebaseOperations.getAnalyticsEvents(days);

    // Group events by date
    const timeSeriesData: TimeSeriesDataPoint[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayEvents = events.filter(event => {
        if (!event.created_at) return false;
        
        // Handle different date formats
        let eventDateStr;
        if (typeof event.created_at === 'string') {
          eventDateStr = event.created_at.split('T')[0];
        } else if (event.created_at instanceof Date) {
          eventDateStr = event.created_at.toISOString().split('T')[0];
        } else if (event.created_at.toDate) {
          // Firestore Timestamp
          eventDateStr = event.created_at.toDate().toISOString().split('T')[0];
        } else {
          return false;
        }
        
        return eventDateStr === dateStr;
      });
      
      const pageViews = dayEvents.filter(e => e.event_type === 'page_view').length;
      const sessions = Math.floor(pageViews * 0.8); // Estimate sessions
      const activeUsers = Math.floor(pageViews * 0.6); // Estimate active users
      const newUsers = dayEvents.filter(e => e.event_type === 'sign_up').length;
      
      // Debug logging for development
      if (process.env.NODE_ENV === 'development' && dayEvents.length > 0) {
        console.log(`Date ${dateStr}: ${dayEvents.length} events, ${pageViews} page views, ${newUsers} new users`);
      }
      
      timeSeriesData.push({
        date: dateStr,
        activeUsers,
        sessions,
        pageViews,
        newUsers,
      });
    }

    return NextResponse.json(timeSeriesData);

  } catch (error: any) {
    console.error('Error fetching time series data:', error);
    
    // Return fallback data
    const days = parseInt(new URL(request.url).searchParams.get('days') || '30');
    const fallbackData = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      fallbackData.push({
        date: date.toISOString().split('T')[0],
        activeUsers: 0,
        sessions: 0,
        pageViews: 0,
        newUsers: 0,
      });
    }
    
    return NextResponse.json(fallbackData);
  }
}
