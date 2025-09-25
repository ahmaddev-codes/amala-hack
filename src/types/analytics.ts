// Shared type definitions for Firebase Analytics

export interface AnalyticsEvent {
  id: string;
  event_type: string;
  created_at: string;
  user_id?: string;
  page_url?: string;
  page_path?: string;
  path?: string;
  page_title?: string;
  country?: string;
  user_country?: string;
  session_id?: string;
  user_agent?: string;
  referrer?: string;
  [key: string]: any; // Allow additional properties
}

export interface TimeSeriesDataPoint {
  date: string;
  activeUsers: number;
  sessions: number;
  pageViews: number;
  newUsers: number;
}

export interface EventStat {
  eventName: string;
  eventCount: number;
  uniqueUsers: number;
}

export interface DemographicData {
  country: string;
  users: number;
  percentage: number;
}

export interface PageStat {
  pagePath: string;
  pageTitle: string;
  views: number;
  uniquePageViews: number;
}

// Helper function to map Firestore document to AnalyticsEvent
export function mapDocumentToAnalyticsEvent(doc: any): AnalyticsEvent {
  const data = doc.data();
  return {
    id: doc.id,
    event_type: data.event_type || 'unknown',
    created_at: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
    user_id: data.user_id,
    page_url: data.page_url,
    page_path: data.page_path,
    path: data.path,
    page_title: data.page_title,
    country: data.country,
    user_country: data.user_country,
    session_id: data.session_id,
    user_agent: data.user_agent,
    referrer: data.referrer,
    ...data, // Include any additional properties
  };
}
