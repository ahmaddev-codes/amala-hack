// Google Maps utilities for Amala Discovery Platform

export interface MapMarkerData {
  id: string;
  coordinates: [number, number]; // [lng, lat]
  name: string;
  isOpen: boolean;
  priceRange: string;
  rating?: number;
  description?: string;
}

// Google Maps configuration for Lagos, Nigeria
export const googleMapsConfig = {
  center: { lat: 6.5244, lng: 3.3792 }, // Lagos, Nigeria
  zoom: 12,
  mapTypeId: "roadmap" as google.maps.MapTypeId,
  styles: [
    // Custom Google Maps styling for better Amala location visibility
    {
      featureType: "poi.business",
      elementType: "labels",
      stylers: [{ visibility: "on" }],
    },
    {
      featureType: "poi.food",
      elementType: "labels",
      stylers: [{ visibility: "on" }],
    },
  ],
};

// Initialize Google Maps
export const initializeGoogleMap = (
  container: HTMLElement,
  options?: Partial<google.maps.MapOptions>
): google.maps.Map => {
  return new google.maps.Map(container, {
    ...googleMapsConfig,
    ...options,
  });
};

// Add markers to Google Maps
export const addMarkersToGoogleMap = (
  map: google.maps.Map,
  markers: MapMarkerData[],
  onMarkerClick?: (data: MapMarkerData) => void
): google.maps.Marker[] => {
  const googleMarkers: google.maps.Marker[] = [];

  markers.forEach((markerData) => {
    const marker = new google.maps.Marker({
      position: {
        lat: markerData.coordinates[1],
        lng: markerData.coordinates[0],
      },
      map: map,
      title: markerData.name,
      icon: createGoogleMapsMarkerIcon(markerData),
    });

    // Create info window
    const infoWindow = new google.maps.InfoWindow({
      content: createGoogleMapsInfoContent(markerData),
    });

    // Add click event
    marker.addListener("click", () => {
      infoWindow.open(map, marker);
      if (onMarkerClick) {
        onMarkerClick(markerData);
      }
    });

    googleMarkers.push(marker);
  });

  return googleMarkers;
};

// Create custom marker icon for Google Maps
const createGoogleMapsMarkerIcon = (data: MapMarkerData): google.maps.Icon => {
  const color = data.isOpen ? "10B981" : "EF4444";
  const priceColor =
    {
      $: "10B981",
      $$: "F59E0B",
      $$$: "EF4444",
      $$$$: "8B5CF6",
    }[data.priceRange] || "6B7280";

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.163 0 0 7.163 0 16c0 11 16 24 16 24s16-13 16-24c0-8.837-7.163-16-16-16z" fill="#${color}"/>
        <circle cx="16" cy="16" r="10" fill="white"/>
        <circle cx="16" cy="16" r="6" fill="#${priceColor}"/>
      </svg>
    `)}`,
    scaledSize: new google.maps.Size(32, 40),
    anchor: new google.maps.Point(16, 40),
  };
};

// Create info window content for Google Maps
const createGoogleMapsInfoContent = (data: MapMarkerData): string => {
  return `
    <div style="padding: 12px; max-width: 280px; font-family: system-ui, -apple-system, sans-serif;">
      <h3 style="margin: 0 0 8px 0; font-weight: 600; font-size: 16px; color: #111827;">${
        data.name
      }</h3>
      ${
        data.description
          ? `<p style="margin: 0 0 12px 0; font-size: 14px; color: #6B7280; line-height: 1.4;">${data.description}</p>`
          : ""
      }
      <div style="display: flex; align-items: center; gap: 12px; font-size: 13px;">
        <span style="display: flex; align-items: center; color: ${
          data.isOpen ? "#10B981" : "#EF4444"
        }; font-weight: 500;">
          <span style="width: 8px; height: 8px; background: ${
            data.isOpen ? "#10B981" : "#EF4444"
          }; border-radius: 50%; margin-right: 6px;"></span>
          ${data.isOpen ? "Open Now" : "Closed"}
        </span>
        <span style="background: #F3F4F6; color: #374151; padding: 2px 8px; border-radius: 12px; font-weight: 500;">${
          data.priceRange
        }</span>
        ${
          data.rating
            ? `<span style="color: #F59E0B; font-weight: 500;">★ ${data.rating}</span>`
            : ""
        }
      </div>
    </div>
  `;
};

// Fit Google Maps to show all markers
export const fitGoogleMapToMarkers = (
  map: google.maps.Map,
  markers: MapMarkerData[]
): void => {
  if (markers.length === 0) return;

  const bounds = new google.maps.LatLngBounds();
  markers.forEach((marker) => {
    bounds.extend({ lat: marker.coordinates[1], lng: marker.coordinates[0] });
  });

  map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
};
