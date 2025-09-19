// Google Maps API loader and utilities
export interface GoogleMapsConfig {
  apiKey: string;
  libraries?: string[];
}

export interface MapStyles {
  featureType: string;
  elementType?: string;
  stylers: Array<{
    [key: string]: string | number;
  }>;
}

// Google Maps default styling (minimal customization to keep it looking like Google Maps)
export const amalaMapStyles: MapStyles[] = [
  {
    featureType: "poi.business",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road.arterial",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road.local",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
];

// Load Google Maps API
export const loadGoogleMaps = (config: GoogleMapsConfig): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.google && window.google.maps) {
      resolve();
      return;
    }

    // Check if script is already loading
    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com"]'
    );
    if (existingScript) {
      // Wait for it to load
      const checkLoaded = () => {
        if (window.google && window.google.maps) {
          resolve();
        } else {
          setTimeout(checkLoaded, 100);
        }
      };
      checkLoaded();
      return;
    }
    const script = document.createElement("script");
    const libraries = config.libraries?.join(",") || "places,geometry";

    script.src = `https://maps.googleapis.com/maps/api/js?key=${config.apiKey}&libraries=${libraries}&loading=async&v=weekly&callback=initMap`;
    script.async = true;
    script.defer = true;

    // Define the callback function if not already defined
    if (typeof window !== 'undefined' && !window.initMap) {
      (window as any).initMap = () => {
        if (window.google && window.google.maps) {
          resolve();
        } else {
          reject(new Error("Google Maps failed to load"));
        }
      };
    }

    script.onload = () => {
      // Callback will handle resolution
    };

    script.onerror = (error) => {
      reject(
        new Error(
          "Failed to load Google Maps script - check API key and network"
        )
      );
    };

    document.head.appendChild(script);
  });
};

// Create custom marker icons
export const createCustomMarker = (
  isOpen: boolean,
  priceRange: string,
  rating?: number
): google.maps.Icon => {
  const color = isOpen ? "#10B981" : "#EF4444";
  const priceColor =
    {
      $: "#10B981",
      $$: "#F59E0B",
      $$$: "#EF4444",
      $$$$: "#8B5CF6",
    }[priceRange] || "#6B7280";

  const stars = rating ? "★".repeat(Math.floor(rating)) : "";

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.163 0 0 7.163 0 16c0 11 16 24 16 24s16-13 16-24c0-8.837-7.163-16-16-16z" fill="${color}"/>
        <circle cx="16" cy="16" r="10" fill="white"/>
        <circle cx="16" cy="16" r="6" fill="${priceColor}"/>
        <text x="16" y="35" text-anchor="middle" fill="#374151" font-size="8" font-family="Arial">${stars}</text>
      </svg>
    `)}`,
    scaledSize: new google.maps.Size(32, 40),
    anchor: new google.maps.Point(16, 40),
  };
};

// Utility to get map bounds from locations
export const getMapBounds = (
  locations: Array<{ lat: number; lng: number }>
) => {
  if (locations.length === 0) return null;

  const bounds = {
    north: Math.max(...locations.map((l) => l.lat)),
    south: Math.min(...locations.map((l) => l.lat)),
    east: Math.max(...locations.map((l) => l.lng)),
    west: Math.min(...locations.map((l) => l.lng)),
  };

  // Add padding
  const latPadding = (bounds.north - bounds.south) * 0.1;
  const lngPadding = (bounds.east - bounds.west) * 0.1;

  return {
    north: bounds.north + latPadding,
    south: bounds.south - latPadding,
    east: bounds.east + lngPadding,
    west: bounds.west - lngPadding,
  };
};

// Format location info for info window
export const formatLocationInfo = (location: {
  name: string;
  address: string;
  isOpenNow: boolean;
  priceRange: string;
  rating?: number;
  reviewCount?: number;
  cuisine: string[];
  description?: string;
  phone?: string;
  website?: string;
}) => {
  const statusColor = location.isOpenNow ? "text-green-600" : "text-red-600";
  const statusText = location.isOpenNow ? "Open Now" : "Closed";
  const rating = location.rating
    ? `★ ${location.rating} (${location.reviewCount} reviews)`
    : "";

  const priceLabels = {
    '$': 'Budget-Friendly',
    '$$': 'Moderate',
    '$$$': 'Expensive',
    '$$$$': 'Premium'
  };
  const priceLabel = priceLabels[location.priceRange as keyof typeof priceLabels] || 'Unknown';

  return `
    <div class="p-4 max-w-sm">
      <h3 class="font-bold text-lg text-gray-900 mb-2">${location.name}</h3>
      <p class="text-gray-600 text-sm mb-2">${location.address}</p>
      <div class="flex items-center justify-between mb-2">
        <span class="${statusColor} text-sm font-medium">${statusText}</span>
        <span class="text-gray-500 text-sm">${location.priceRange} - ${priceLabel}</span>
      </div>
      ${rating ? `<p class="text-yellow-500 text-sm mb-2">${rating}</p>` : ""}
      <div class="flex flex-wrap gap-1 mb-3">
        ${location.cuisine
          .map(
            (c: string) =>
              `<span class="bg-primary/10 text-primary text-xs px-2 py-1 rounded">${c}</span>`
          )
          .join("")}
      </div>
      ${
        location.description
          ? `<p class="text-gray-700 text-sm mb-3">${location.description}</p>`
          : ""
      }
      <div class="flex gap-2">
        ${
          location.phone
            ? `<a href="tel:${location.phone}" class="text-primary text-sm hover:underline">Call</a>`
            : ""
        }
        ${
          location.website
            ? `<a href="${location.website}" target="_blank" class="text-primary text-sm hover:underline">Website</a>`
            : ""
        }
      </div>
    </div>
  `;
};

declare global {
  interface Window {
    google: typeof google;
    initMap?: () => void;
  }
}
