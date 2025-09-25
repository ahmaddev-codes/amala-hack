"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useLayoutEffect,
  useMemo,
} from "react";
import { AmalaLocation } from "@/types/location";
import {
  loadGoogleMaps,
  amalaMapStyles,
  createCustomMarker,
  getMapBounds,
} from "@/lib/google-maps";
import { MapClusterer } from "@/lib/map-clustering";
import { ArrowPathIcon as Loader2, ExclamationCircleIcon as AlertCircle } from "@heroicons/react/24/outline";
import { MapControls } from "./map-controls";
import { MapSkeleton } from "@/components/skeletons";

interface MapContainerProps {
  locations: AmalaLocation[];
  selectedLocation: AmalaLocation | null;
  onLocationSelect: (location: AmalaLocation) => void;
  onError?: (error: string) => void;
  filters?: {
    isOpenNow?: boolean;
    serviceType?: string;
    priceRange?: string[];
  };
  onLocationApproved?: (locationId: string) => void; // New prop for moderation callback
}

export function MapContainer({
  locations,
  selectedLocation,
  onLocationSelect,
  onError,
  filters = {},
}: MapContainerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [clusterer, setClusterer] = useState<MapClusterer | null>(null);

  // Initialize Google Maps
  const initializeMap = useCallback(async () => {
    console.log("🔧 initializeMap called, checking mapRef...");

    if (!mapRef.current) {
      console.log("❌ mapRef.current is null, will retry...");
      return;
    }

    // Double check the element is actually attached to the DOM
    if (!document.contains(mapRef.current)) {
      console.log("❌ mapRef element not in DOM, will retry...");
      return;
    }

    console.log(
      "✅ mapRef.current found and attached to DOM, proceeding with initialization"
    );

    try {
      setIsLoading(true);
      setError(null);

      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      console.log("🗝️ Google Maps API Key check:", {
        hasKey: !!apiKey,
        keyLength: apiKey?.length,
        keyPrefix: apiKey?.substring(0, 10),
      });

      if (!apiKey) {
        throw new Error(
          "Google Maps API key not configured. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local file."
        );
      }

      console.log("🔄 Loading Google Maps API...");

      // Load Google Maps with improved error handling
      await loadGoogleMaps({
        apiKey,
        libraries: ["places", "geometry"],
      });

      console.log("✅ Google Maps API loaded successfully");

      // Verify Google Maps is available
      if (!window.google || !window.google.maps) {
        throw new Error("Google Maps API failed to initialize properly");
      }

      // Default to global view
      const defaultCenter = { lat: 20, lng: 0 };

      console.log("🗺️ Initializing map instance...");

      const mapInstance = new window.google.maps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: 2,
        styles: amalaMapStyles,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        gestureHandling: "cooperative",
        disableDefaultUI: false,
        clickableIcons: false,
      });

      console.log("✅ Map instance created");

      setMap(mapInstance);
      setIsGoogleMapsLoaded(true);

      // Initialize clustering
      console.log("🔧 Initializing marker clustering...");
      const clustererInstance = new MapClusterer(mapInstance);
      await clustererInstance.initialize({
        gridSize: 60,
        maxZoom: 15,
      });
      setClusterer(clustererInstance);

      setIsLoading(false);

      console.log("🎉 Map initialization complete with clustering!");
    } catch (err) {
      console.error("❌ Failed to initialize Google Maps:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load map";
      setError(errorMessage);
      setIsLoading(false);

      // Call onError callback if provided
      if (onError) {
        onError(errorMessage);
      }
    }
  }, [onError]);

  // Memoize location IDs to prevent unnecessary marker updates
  const locationIds = useMemo(() =>
    locations.map(loc => loc.id).sort().join(','),
    [locations]
  );

  // Update markers when locations change
  const updateMarkers = useCallback(() => {
    if (!map || !isGoogleMapsLoaded || !clusterer) return;

    console.log(`🔄 Updating ${locations.length} markers with clustering...`);

    // Clear existing markers from clusterer
    clusterer.clearMarkers();

    // Clear existing markers from state
    setMarkers((currentMarkers) => {
      currentMarkers.forEach((marker) => marker.setMap(null));
      return [];
    });

    // Create new markers
    const newMarkers = locations.map((location) => {
      const marker = new window.google.maps.Marker({
        position: location.coordinates,
        title: location.name,
        icon: createCustomMarker(
          location.isOpenNow,
          location.priceInfo || "Pricing available",
          location.rating
        ),
        // Don't add to map directly - let clusterer handle it
        optimized: false,
      });

      // Add click listener
      marker.addListener("click", () => {
        // Trigger location selection
        onLocationSelect(location);

        // Analytics: place viewed
        try {
          fetch("/api/analytics", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event_type: "place_viewed",
              location_id: location.id,
              metadata: { name: location.name },
            }),
            keepalive: true,
          });
        } catch { }

        // Center map on clicked location
        map.panTo(location.coordinates);
        if (map.getZoom() && map.getZoom()! < 15) {
          map.setZoom(15);
        }
      });

      return marker;
    });

    // Add markers to clusterer
    clusterer.addMarkers(newMarkers);

    setMarkers(newMarkers);

    // Auto-fit bounds if we have locations (only on initial load, not on search)
    if (locations.length > 0 && markers.length === 0) {
      const bounds = getMapBounds(locations.map((l) => l.coordinates));
      if (bounds) {
        const googleBounds = new window.google.maps.LatLngBounds(
          { lat: bounds.south, lng: bounds.west },
          { lat: bounds.north, lng: bounds.east }
        );
        map.fitBounds(googleBounds);

        // Ensure minimum zoom level
        const listener = window.google.maps.event.addListener(
          map,
          "idle",
          () => {
            if (map.getZoom() && map.getZoom()! > 17) {
              map.setZoom(17);
            }
            window.google.maps.event.removeListener(listener);
          }
        );
      }
    }
  }, [map, locationIds, onLocationSelect, isGoogleMapsLoaded, clusterer, markers.length]);

  // Handle selected location changes
  useEffect(() => {
    if (map && selectedLocation && isGoogleMapsLoaded) {
      const selectedMarker = markers.find(
        (marker, index) => locations[index]?.id === selectedLocation.id
      );

      if (selectedMarker) {
        // Pan to location
        map.panTo(selectedLocation.coordinates);
        if (map.getZoom() && map.getZoom()! < 15) {
          map.setZoom(15);
        }
      }
    }
  }, [map, selectedLocation, markers, locations, isGoogleMapsLoaded]);

  // Initialize map on component mount
  useLayoutEffect(() => {
    console.log("🚀 useLayoutEffect triggered, DOM should be ready...");

    let mounted = true;
    let retryCount = 0;
    const maxRetries = 10;

    const checkRefAndInitialize = () => {
      if (!mounted) return;

      if (mapRef.current && document.contains(mapRef.current)) {
        console.log("⏰ Ref is ready, calling initializeMap");
        initializeMap();
      } else if (retryCount < maxRetries) {
        retryCount++;
        console.log(`🔄 Ref not ready, retry ${retryCount}/${maxRetries}...`);
        setTimeout(checkRefAndInitialize, 100);
      } else {
        console.error("❌ Failed to initialize map after maximum retries");
        setError("Failed to initialize map container");
        setIsLoading(false);
      }
    };

    // Start checking immediately
    checkRefAndInitialize();

    return () => {
      mounted = false;
    };
  }, [initializeMap]);

  // Update markers when locations change
  useEffect(() => {
    updateMarkers();
  }, [updateMarkers]);

  // Cleanup clusterer on unmount
  useEffect(() => {
    return () => {
      if (clusterer) {
        clusterer.destroy();
      }
    };
  }, [clusterer]);

  // Always render the map container, but show overlays for loading/error states
  return (
    <div className="w-full h-full relative overflow-hidden">
      {/* Always render the map div so ref gets attached */}
      <div ref={mapRef} className="w-full h-full min-h-0" />

      {/* Loading overlay */}
      {isLoading && (
        <MapSkeleton />
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center z-10">
          <div className="text-center max-w-lg p-6">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {error.includes("not authorized") ||
                error.includes("insufficient permissions")
                ? "Google Maps APIs Not Enabled"
                : "Map Unavailable"}
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>

            {(error.includes("not authorized") ||
              error.includes("insufficient permissions")) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-left">
                  <h4 className="font-medium text-yellow-800 mb-2">
                    🔧 Quick Fix:
                  </h4>
                  <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
                    <li>
                      Go to{" "}
                      <a
                        href="https://console.cloud.google.com/apis/library"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-yellow-900"
                      >
                        Google Cloud Console
                      </a>
                    </li>
                    <li>
                      Enable these APIs:
                      <ul className="ml-4 mt-1 space-y-1 list-disc list-inside">
                        <li>Maps JavaScript API</li>
                        <li>Places API</li>
                        <li>Geocoding API</li>
                      </ul>
                    </li>
                    <li>Refresh this page</li>
                  </ol>
                </div>
              )}

            <button
              onClick={initializeMap}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary transition-colors text-sm"
            >
              Retry Loading Map
            </button>
          </div>
        </div>
      )}

      {/* Map controls and UI - only show when map is loaded */}
      {!isLoading && !error && (
        <>
          <MapControls
            map={map}
            locations={locations}
            onLocationSelect={onLocationSelect}
          />

          <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-2 border border-primary/20 transition-all duration-200 hover:shadow-xl hover:bg-white">
            <div className="text-sm text-gray-700">
              <span className="font-medium text-primary">
                {locations.length}
              </span>{" "}
              locations
            </div>
          </div>

          <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 border border-primary/20 transition-all duration-200 hover:shadow-xl hover:bg-white">
            <h4 className="text-sm font-medium text-primary mb-2">
              Map Legend
            </h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center hover:text-primary transition-colors duration-150">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span>Open Now</span>
              </div>
              <div className="flex items-center hover:text-primary transition-colors duration-150">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                <span>Closed</span>
              </div>
              <div className="flex items-center mt-2 hover:text-primary transition-colors duration-150">
                <span className="text-green-600">$ </span>
                <span className="text-yellow-600">$$ </span>
                <span className="text-red-600">$$$ </span>
                <span className="text-purple-600">$$$$</span>
                <span className="ml-1">Price Range</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
