"use client";

import { useState, useEffect, useRef } from "react";
import {
  ChevronUp,
  ChevronDown,
  X,
  Phone,
  Globe,
  Star,
  Clock,
  MapPin,
  Navigation,
  Share,
  Heart,
} from "lucide-react";
import { AmalaLocation } from "@/types/location";
import { LocationInfoWindow } from "./location-info-window";

interface MobileBottomSheetProps {
  locations: AmalaLocation[];
  selectedLocation: AmalaLocation | null;
  onLocationSelect: (location: AmalaLocation) => void;
  onClose?: () => void;
}

type SheetState = "collapsed" | "peek" | "expanded";

export function MobileBottomSheet({
  locations,
  selectedLocation,
  onLocationSelect,
  onClose,
}: MobileBottomSheetProps) {
  const [sheetState, setSheetState] = useState<SheetState>("peek");
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [windowHeight, setWindowHeight] = useState(600); // Default height
  const sheetRef = useRef<HTMLDivElement>(null);

  // Set window height on client side
  useEffect(() => {
    if (typeof window !== "undefined") {
      setWindowHeight(window.innerHeight);

      const handleResize = () => {
        setWindowHeight(window.innerHeight);
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  // Heights for different states
  const heights = {
    collapsed: 0,
    peek: Math.min(200, windowHeight * 0.25), // More flexible for different screen sizes
    expanded: Math.min(windowHeight * 0.75, windowHeight - 100), // Leave space for header
  };

  const getSheetHeight = () => {
    switch (sheetState) {
      case "collapsed":
        return heights.collapsed;
      case "peek":
        return heights.peek;
      case "expanded":
        return heights.expanded;
      default:
        return heights.peek;
    }
  };

  // Touch handlers for swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const deltaY = currentY - startY;
    const threshold = 50;

    if (deltaY > threshold) {
      // Swipe down
      if (sheetState === "expanded") {
        setSheetState("peek");
      } else if (sheetState === "peek") {
        setSheetState("collapsed");
      }
    } else if (deltaY < -threshold) {
      // Swipe up
      if (sheetState === "collapsed") {
        setSheetState("peek");
      } else if (sheetState === "peek") {
        setSheetState("expanded");
      }
    }
  };

  // Mouse handlers for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartY(e.clientY);
    setCurrentY(e.clientY);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    setCurrentY(e.clientY);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const deltaY = currentY - startY;
    const threshold = 50;

    if (deltaY > threshold) {
      if (sheetState === "expanded") {
        setSheetState("peek");
      } else if (sheetState === "peek") {
        setSheetState("collapsed");
      }
    } else if (deltaY < -threshold) {
      if (sheetState === "collapsed") {
        setSheetState("peek");
      } else if (sheetState === "peek") {
        setSheetState("expanded");
      }
    }
  };

  // Add mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, currentY, startY]);

  // Auto-expand when location is selected
  useEffect(() => {
    if (selectedLocation && sheetState === "collapsed") {
      setSheetState("peek");
    }
  }, [selectedLocation]);

  if (locations.length === 0) return null;

  return (
    <>
      {/* Backdrop for expanded state */}
      {sheetState === "expanded" && (
        <div
          className="fixed inset-0 bg-black bg-opacity-25 z-40"
          onClick={() => setSheetState("peek")}
        />
      )}

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50 transition-transform duration-300 ease-out"
        style={{
          transform: `translateY(${
            isDragging ? Math.max(0, currentY - startY) : 0
          }px)`,
          height: `${getSheetHeight()}px`,
        }}
      >
        {/* Handle */}
        <div
          className="flex justify-center py-3 cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
        >
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 pb-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-base">
                {selectedLocation ? selectedLocation.name : "Amala Spots"}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-gray-600">
                  {locations.length}{" "}
                  {locations.length === 1 ? "location" : "locations"}
                </p>
                {!selectedLocation && (
                  <>
                    <span className="text-gray-400">•</span>
                    <p className="text-sm text-blue-600">Tap to explore</p>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {sheetState !== "expanded" && (
                <button
                  onClick={() => setSheetState("expanded")}
                  className="p-2 hover:bg-white rounded-full transition-colors"
                  title="View all locations"
                >
                  <ChevronUp className="w-5 h-5 text-gray-600" />
                </button>
              )}

              {sheetState === "expanded" && (
                <button
                  onClick={() => setSheetState("peek")}
                  className="p-2 hover:bg-white rounded-full transition-colors"
                  title="Minimize"
                >
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                </button>
              )}

              <button
                onClick={() => setSheetState("collapsed")}
                className="p-2 hover:bg-white rounded-full transition-colors"
                title="Close"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {sheetState === "peek" && (
            <div className="p-4 space-y-3">
              {selectedLocation ? (
                <div className="space-y-3">
                  {/* Main Info */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 text-base">
                        {selectedLocation.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="text-sm text-gray-600">
                          4.5 (234 reviews)
                        </span>
                        <span className="text-sm font-medium text-gray-800">
                          {selectedLocation.priceRange}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          selectedLocation.isOpenNow
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {selectedLocation.isOpenNow ? "Open Now" : "Closed"}
                      </span>
                    </div>
                  </div>

                  {/* Address and Service Type */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <p className="text-sm text-gray-600 flex-1">
                        {selectedLocation.address}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600 capitalize">
                        {selectedLocation.serviceType.replace("-", " ")} service
                      </span>
                    </div>
                  </div>

                  {/* Cuisine Tags */}
                  <div className="flex flex-wrap gap-2">
                    {selectedLocation.cuisine
                      ?.slice(0, 3)
                      .map((cuisine, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                        >
                          {cuisine}
                        </span>
                      ))}
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <button className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                      <Navigation className="w-4 h-4" />
                      Directions
                    </button>
                    <button className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <Phone className="w-4 h-4 text-gray-600" />
                    </button>
                    <button className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <Share className="w-4 h-4 text-gray-600" />
                    </button>
                    <button className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <Heart className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 font-medium">
                    Tap a location on the map
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Discover amazing Amala spots near you
                  </p>
                </div>
              )}
            </div>
          )}

          {sheetState === "expanded" && (
            <div className="h-full overflow-y-auto">
              {selectedLocation ? (
                <div className="p-4">
                  <LocationInfoWindow
                    location={selectedLocation}
                    onDirections={() => {}}
                    onShare={() => {}}
                    onSave={() => {}}
                  />
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {locations.map((location) => (
                    <div
                      key={location.id}
                      className="p-4 cursor-pointer hover:bg-gray-50 transition-colors active:bg-gray-100"
                      onClick={() => {
                        onLocationSelect(location);
                        setSheetState("peek");
                      }}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-gray-900 text-sm truncate">
                              {location.name}
                            </h4>
                            <div
                              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ml-2 ${
                                location.isOpenNow
                                  ? "bg-green-500"
                                  : "bg-red-500"
                              }`}
                            />
                          </div>

                          <div className="flex items-center gap-2 mb-2">
                            <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />
                            <span className="text-xs text-gray-600">4.3</span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs font-medium text-gray-800">
                              {location.priceRange}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-600 capitalize">
                              {location.serviceType.replace("-", " ")}
                            </span>
                          </div>

                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                            {location.address}
                          </p>

                          {/* Cuisine Tags */}
                          <div className="flex flex-wrap gap-1 mb-2">
                            {location.cuisine
                              ?.slice(0, 2)
                              .map((cuisine, index) => (
                                <span
                                  key={index}
                                  className="px-1.5 py-0.5 bg-gray-100 text-gray-700 text-xs rounded"
                                >
                                  {cuisine}
                                </span>
                              ))}
                          </div>

                          {/* Quick Status */}
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-xs font-medium ${
                                location.isOpenNow
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {location.isOpenNow ? "Open Now" : "Closed"}
                            </span>
                            <div className="flex items-center gap-1">
                              <Navigation className="w-3 h-3 text-blue-600" />
                              <span className="text-xs text-blue-600">
                                Directions
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
