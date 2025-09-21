import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type AnalyticsEvent =
  | { type: "submission_created"; locationName: string }
  | { type: "location_moderated"; action: "approve" | "reject"; id: string }
  | { type: "directions_clicked"; id: string }
  | { type: "place_viewed"; id: string };

export function trackEvent(event: AnalyticsEvent) {
  try {
    console.log("ANALYTICS", event);
    // Fire-and-forget to backend
    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type:
          event.type === "submission_created" ? "submission_created" :
          event.type === "location_moderated" ? `mod_${event.action}` :
          event.type,
        location_id: (event as any).id,
        metadata: event,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

export async function logAnalyticsEvent(eventType: string, locationId?: string, metadata?: Record<string, any>) {
  try {
    // Sanitize metadata to remove undefined values (Firestore doesn't accept undefined)
    const sanitizedMetadata = metadata ? Object.fromEntries(
      Object.entries(metadata).filter(([_, value]) => value !== undefined)
    ) : {};
    
    console.log("ANALYTICS SERVER", { eventType, locationId, metadata: sanitizedMetadata });
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    await fetch(`${baseUrl}/api/analytics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: eventType,
        location_id: locationId,
        metadata: sanitizedMetadata,
      }),
    }).catch((e) => console.error("Failed to log analytics event", e));
  } catch (error) {
    console.error("Failed to log analytics event", error);
  }
}