"use client";

import { useState } from "react";
import {
  Layers,
  ZoomIn,
  ZoomOut,
  Navigation,
  Satellite,
  Map as MapIcon,
  MyLocation as LocateIcon,
  Refresh as RotateCcw,
  Fullscreen as Maximize2,
} from "@mui/icons-material";
import { AmalaLocation } from "@/types/location";

interface MapControlsProps {
  map: google.maps.Map | null;
  locations: AmalaLocation[];
  onLocationSelect: (location: AmalaLocation) => void;
}

export function MapControls({
  map,
  locations,
  onLocationSelect,
}: MapControlsProps) {
  const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap");
  const [showLayers, setShowLayers] = useState(false);

  const handleZoomIn = () => {
    if (map) {
      const currentZoom = map.getZoom() || 10;
      map.setZoom(currentZoom + 1);
    }
  };

  const handleZoomOut = () => {
    if (map) {
      const currentZoom = map.getZoom() || 10;
      map.setZoom(Math.max(currentZoom - 1, 1));
    }
  };

  const handleRecenter = () => {
    if (map && locations.length > 0) {
      // Fit all locations in view
      const bounds = new google.maps.LatLngBounds();
      locations.forEach((location) => {
        bounds.extend(location.coordinates);
      });
      map.fitBounds(bounds);
    }
  };

  const toggleMapType = () => {
    if (map) {
      const newType = mapType === "roadmap" ? "satellite" : "roadmap";
      map.setMapTypeId(newType);
      setMapType(newType);
    }
  };

  const handleFullscreen = () => {
    if (map) {
      const mapDiv = map.getDiv();
      if (mapDiv.requestFullscreen) {
        mapDiv.requestFullscreen();
      }
    }
  };

  const handleMyLocation = () => {
    if (!map || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const target = new google.maps.LatLng(latitude, longitude);
        map.panTo(target);
        const currentZoom = map.getZoom() || 2;
        if (currentZoom < 12) {
          map.setZoom(12);
        }
      },
      () => {
        // Fallback: do nothing if permission denied
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  return (
    <>
      {/* Right side controls - stacked vertically with proper spacing */}
      <div className="absolute top-4 right-4 space-y-2">
        {/* Zoom Controls */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <button
            onClick={handleZoomIn}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition-colors border-b border-gray-200"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4 text-gray-700" />
          </button>
          <button
            onClick={handleZoomOut}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4 text-gray-700" />
          </button>
        </div>

        {/* Map Type Toggle */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <button
            onClick={toggleMapType}
            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
            title={
              mapType === "roadmap" ? "Switch to satellite" : "Switch to map"
            }
          >
            {mapType === "roadmap" ? (
              <>
                <Satellite className="w-4 h-4" />
                <span className="hidden sm:inline">Satellite</span>
              </>
            ) : (
              <>
                <MapIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Map</span>
              </>
            )}
          </button>
        </div>

        {/* My location button */}
        <button
          onClick={handleMyLocation}
          className="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors"
          title="My location"
        >
          <Navigation className="w-4 h-4 text-primary" />
        </button>

        {/* Recenter button */}
        <button
          onClick={handleRecenter}
          className="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors"
          title="Show all locations"
        >
          <LocateIcon className="w-4 h-4 text-gray-700" />
        </button>
      </div>

      {/* Bottom right controls */}
      <div className="absolute bottom-4 right-4">
        <button
          onClick={() => setShowLayers(!showLayers)}
          className="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors"
          title="Layers"
        >
          <Layers className="w-4 h-4 text-gray-700" />
        </button>

        {showLayers && (
          <div className="absolute bottom-12 right-0 bg-white rounded-lg shadow-lg border border-gray-200 p-3 w-48 z-50">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Map Layers
            </h4>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-gray-300"
                />
                <span>Amala Locations</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded border-gray-300" />
                <span>Traffic</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded border-gray-300" />
                <span>Transit</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen button - separate positioning */}
      <div className="absolute bottom-16 right-4">
        <button
          onClick={handleFullscreen}
          className="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors"
          title="Fullscreen"
        >
          <Maximize2 className="w-4 h-4 text-gray-700" />
        </button>
      </div>
    </>
  );
}
