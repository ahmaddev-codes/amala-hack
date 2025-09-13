"use client";

import { useState } from "react";
import {
  Layers,
  ZoomIn,
  ZoomOut,
  Navigation,
  Satellite,
  Map as MapIcon,
  RotateCcw,
  Maximize2,
} from "lucide-react";
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

  return (
    <>
      {/* Zoom Controls - Google Maps style */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-md overflow-hidden">
        <button
          onClick={handleZoomIn}
          className="block w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition-colors border-b border-gray-200"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4 text-gray-700" />
        </button>
        <button
          onClick={handleZoomOut}
          className="block w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4 text-gray-700" />
        </button>
      </div>

      {/* Map Type Toggle */}
      <div className="absolute top-20 right-4 bg-white rounded-lg shadow-md overflow-hidden">
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
              <span>Satellite</span>
            </>
          ) : (
            <>
              <MapIcon className="w-4 h-4" />
              <span>Map</span>
            </>
          )}
        </button>
      </div>

      {/* Additional Controls */}
      <div className="absolute bottom-20 right-4 space-y-2">
        {/* Recenter button */}
        <button
          onClick={handleRecenter}
          className="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors"
          title="Show all locations"
        >
          <Navigation className="w-4 h-4 text-gray-700" />
        </button>

        {/* Fullscreen button */}
        <button
          onClick={handleFullscreen}
          className="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors"
          title="Fullscreen"
        >
          <Maximize2 className="w-4 h-4 text-gray-700" />
        </button>
      </div>

      {/* Layers Panel */}
      <div className="absolute bottom-4 right-4">
        <button
          onClick={() => setShowLayers(!showLayers)}
          className="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors"
          title="Layers"
        >
          <Layers className="w-4 h-4 text-gray-700" />
        </button>

        {showLayers && (
          <div className="absolute bottom-12 right-0 bg-white rounded-lg shadow-lg border border-gray-200 p-3 w-48">
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

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md p-3 max-w-xs">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Legend</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-700">Open now</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-gray-700">Closed</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex">
              <span className="text-green-600 font-medium">$</span>
              <span className="text-yellow-600 font-medium">$$</span>
              <span className="text-orange-600 font-medium">$$$</span>
              <span className="text-red-600 font-medium">$$$$</span>
            </div>
            <span className="text-gray-700">Price range</span>
          </div>
        </div>
      </div>
    </>
  );
}
