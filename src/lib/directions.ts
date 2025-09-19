import { AmalaLocation } from "@/types/location";

export interface DirectionsOptions {
  mode?: "driving" | "walking" | "transit" | "bicycling";
  avoid?: "tolls" | "highways" | "ferries";
}

/**
 * Open Google Maps with directions to a location
 */
export function openDirections(
  location: AmalaLocation,
  options: DirectionsOptions = {}
) {
  if (typeof window === "undefined") return;

  const { mode = "driving" } = options;

  // Create Google Maps directions URL
  const baseUrl = "https://www.google.com/maps/dir/";
  const params = new URLSearchParams({
    api: "1",
    destination: `${location.coordinates.lat},${location.coordinates.lng}`,
    travelmode: mode,
  });

  // Add destination name for better UX
  if (location.name) {
    params.set("destination", `${location.name}, ${location.address}`);
  }

  const url = `${baseUrl}?${params.toString()}`;
  window.open(url, "_blank");
}

/**
 * Open Apple Maps with directions (for iOS devices)
 */
export function openAppleMaps(location: AmalaLocation) {
  if (typeof window === "undefined") return;

  const url = `http://maps.apple.com/?daddr=${location.coordinates.lat},${location.coordinates.lng}&dirflg=d`;
  window.open(url, "_blank");
}

/**
 * Smart directions - opens the appropriate maps app based on device
 */
export function openSmartDirections(
  location: AmalaLocation,
  options: DirectionsOptions = {}
) {
  if (typeof window === "undefined" || typeof navigator === "undefined") return;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

  if (isIOS && isMobile) {
    // On iOS, give user choice between Apple Maps and Google Maps
    const useAppleMaps = confirm(
      `Get directions to ${location.name}?\n\nOK = Apple Maps\nCancel = Google Maps`
    );

    if (useAppleMaps) {
      openAppleMaps(location);
    } else {
      openDirections(location, options);
    }
  } else {
    // Default to Google Maps
    openDirections(location, options);
  }
}

/**
 * Get estimated travel time using Google Maps Directions API
 */
export async function getEstimatedTravelTime(
  origin: { lat: number; lng: number },
  destination: AmalaLocation,
  mode: "driving" | "walking" | "transit" = "driving"
): Promise<{ duration: string; distance: string } | null> {
  try {
    // This would require Google Maps Directions API
    // For now, return null - implement when API key is available
    return null;
  } catch (error) {
    console.error("Error getting travel time:", error);
    return null;
  }
}

/**
 * Share location with directions
 */
export function shareLocationWithDirections(location: AmalaLocation) {
  if (typeof window === "undefined" || typeof navigator === "undefined") return;

  const text = `Check out ${location.name} - ${
    location.description || "Great Amala spot!"
  }`;
  const url = `https://www.google.com/maps/search/?api=1&query=${location.coordinates.lat},${location.coordinates.lng}`;

  if (navigator.share) {
    navigator
      .share({
        title: location.name,
        text: text,
        url: url,
      })
      .catch(console.error);
  } else {
    // Fallback to clipboard
    const shareText = `${text}\n\nGet directions: ${url}`;
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(shareText)
        .then(() => {
          // Note: This function doesn't have access to toast context
          // The calling component should handle the success message
          console.log("Location details copied to clipboard!");
        })
        .catch(() => {
          // Final fallback - open share URL
          window.open(
            `mailto:?subject=${encodeURIComponent(
              location.name
            )}&body=${encodeURIComponent(shareText)}`
          );
        });
    } else {
      // Final fallback - open share URL
      window.open(
        `mailto:?subject=${encodeURIComponent(
          location.name
        )}&body=${encodeURIComponent(shareText)}`
      );
    }
  }
}
