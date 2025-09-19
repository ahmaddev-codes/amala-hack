"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  ArrowBack as ArrowLeft,
  LocationOn as MapPin,
  Star,
  AttachMoney as DollarSign,
  Phone,
  Language as Globe,
} from "@mui/icons-material";
import { MapContainer } from "@/components/map-container";
import { Header } from "@/components/header";
import { MapUserProfile } from "@/components/map-user-profile";
import { AgenticIntake } from "@/components/agentic-intake";
import { ModerationPanel } from "@/components/moderation-panel";
import { CentralFilters } from "@/components/central-filters";
import { GoogleMapsLocationDetail } from "@/components/google-maps-location-detail";
import { useToast } from "@/contexts/ToastContext";
import { formatPriceRange } from "@/lib/currency-utils";
import { firebaseOperations } from "@/lib/firebase/database";
import { LocationService } from "@/lib/services/location-service";
import {
  AmalaLocation,
  LocationFilter,
  LocationSubmission,
} from "@/types/location";

// Helper function for restaurant image placeholders
const getRestaurantPlaceholder = (locationName: string, index: number) => {
  const placeholderColors = [
    "bg-gradient-to-br from-orange-400 to-red-500",
    "bg-gradient-to-br from-green-400 to-blue-500",
    "bg-gradient-to-br from-purple-400 to-pink-500",
    "bg-gradient-to-br from-yellow-400 to-orange-500",
    "bg-gradient-to-br from-blue-400 to-indigo-500",
  ];

  const colorIndex = (locationName.length + index) % placeholderColors.length;
  return placeholderColors[colorIndex];
};

export default function Home() {
  const { success, info, error } = useToast();
  const [allLocations, setAllLocations] = useState<AmalaLocation[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<AmalaLocation[]>(
    []
  );
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [filters, setFilters] = useState<LocationFilter>({});
  const [selectedLocation, setSelectedLocation] =
    useState<AmalaLocation | null>(null);
  const [showIntakeDialog, setShowIntakeDialog] = useState(false);
  const [showModerationPanel, setShowModerationPanel] = useState(false);
  const [searchResults, setSearchResults] = useState<AmalaLocation[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Search functionality
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const results = allLocations.filter(
      (location) =>
        location.name.toLowerCase().includes(query.toLowerCase()) ||
        location.address.toLowerCase().includes(query.toLowerCase()) ||
        location.description?.toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(results);
  };

  const handleSearchResultSelect = (locationId: string) => {
    const location = allLocations.find((loc) => loc.id === locationId);
    if (location) {
      setSelectedLocation(location);
    }
  };

  // Load locations from database
  useEffect(() => {
    const loadLocations = async () => {
      try {
        setIsLoadingLocations(true);
        const locationsFromDb = await firebaseOperations.getAllLocations({});
        const loadedLocations = locationsFromDb.filter(
          (loc) => loc.status === "approved"
        );
        setAllLocations(loadedLocations);
        setFilteredLocations(loadedLocations);
        const pending = await firebaseOperations.getLocationsByStatus("pending");
        setPendingCount(pending.length);
      } catch (error) {
        console.error("Error loading locations:", error);
      } finally {
        setIsLoadingLocations(false);
      }
    };
    loadLocations();
  }, []);

  // Filter locations when filters change
  useEffect(() => {
    if (Object.keys(filters).length === 0) {
      setFilteredLocations(allLocations);
      return;
    }

    let filtered = allLocations;
    if (filters.isOpenNow) {
      filtered = filtered.filter((loc) => loc.isOpenNow);
    }
    if (filters.serviceType && filters.serviceType !== "all") {
      filtered = filtered.filter(
        (loc) => loc.serviceType === filters.serviceType
      );
    }
    if (
      filters.priceRange &&
      Array.isArray(filters.priceRange) &&
      filters.priceRange.length > 0
    ) {
      // TODO: Implement price filtering with new pricing system
      // filtered = filtered.filter((loc) =>
      //   filters.priceRange!.includes(loc.priceRange)
      // );
    }
    setFilteredLocations(filtered);
  }, [filters, allLocations]);

  const handleLocationSubmit = async (submission: LocationSubmission) => {
    try {
      const response = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: submission,
          submitterInfo: {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
          },
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error);
      }

      const locationsFromDb = await firebaseOperations.getAllLocations({});
      const approvedLocations = locationsFromDb.filter(
        (loc) => loc.status === "approved"
      );
      setAllLocations(approvedLocations);
      setFilteredLocations(approvedLocations);
      setShowIntakeDialog(false);
      success(`Location "${submission.name}" submitted for moderation!`, "Submission Successful");
    } catch (err) {
      console.error("Error submitting location:", err);
      error("Error submitting location. Please try again.", "Submission Failed");
    }
  };

  const handleApproveLocation = async (
    locationId: string,
    verificationNotes?: string
  ) => {
    try {
      await firebaseOperations.updateLocationStatus(locationId, "approved");
      const locationsFromDb = await firebaseOperations.getAllLocations({});
      const approvedLocations = locationsFromDb.filter(
        (loc) => loc.status === "approved"
      );
      setAllLocations(approvedLocations);
      success("Location approved successfully!", "Approval Complete");
    } catch (err) {
      console.error("Error approving location:", err);
      error("Error approving location", "Approval Failed");
    }
  };

  const handleRejectLocation = async (
    locationId: string,
    reason: string,
    notes?: string
  ) => {
    try {
      await firebaseOperations.updateLocationStatus(locationId, "rejected");
      info("Location rejected", "Rejection Complete");
    } catch (err) {
      console.error("Error rejecting location:", err);
      error("Error rejecting location", "Rejection Failed");
    }
  };

  const handleBulkAction = (
    locationIds: string[],
    action: "approve" | "reject"
  ) => {
    if (action === "approve") {
      locationIds.forEach((id) => handleApproveLocation(id, "Bulk approved"));
    } else {
      locationIds.forEach((id) =>
        handleRejectLocation(id, "Bulk rejected", "Bulk action")
      );
    }
  };

  if (isLoadingLocations) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-4 text-gray-600">
            Loading delicious Amala locations...
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="h-screen w-full bg-gray-100 overflow-hidden flex">
      {/* Google Maps Style Sidebar with Sliding Animation - absolutely positioned */}
      <div
        className={`fixed top-0 left-0 h-full w-[408px] bg-white shadow-lg z-30 transition-transform duration-300 ease-in-out xl:block hidden ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Triangle Toggle Button - Always visible on the right edge */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-6 top-1/2 transform -translate-y-1/2 bg-white shadow-lg rounded-r-lg p-2 z-40 hover:bg-gray-50 transition-colors border border-l-0 border-gray-200"
        >
          <div
            className={`w-0 h-0 transition-transform duration-200 ${
              isSidebarOpen
                ? "border-r-[8px] border-r-gray-600 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent"
                : "border-l-[8px] border-l-gray-600 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent"
            }`}
          />
        </button>

        <div className="flex flex-col h-full">
          {/* Compact Header - fits within sidebar */}
          <div className="p-4 border-b border-gray-100">
            <Header
              onAddLocation={() => setShowIntakeDialog(true)}
              onSearch={handleSearch}
              searchResults={searchResults.map((loc) => ({
                id: loc.id,
                name: loc.name,
                address: loc.address,
                isOpenNow: loc.isOpenNow,
              }))}
              onSearchResultSelect={handleSearchResultSelect}
            />
          </div>

          {/* Results Header */}
          <div className="bg-white px-4 py-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-medium text-gray-900">Results</h1>
                <p className="text-sm text-gray-600">
                  {filteredLocations.length}{" "}
                  {filteredLocations.length === 1 ? "result" : "results"}
                </p>
              </div>
            </div>
          </div>

          {/* Scrollable Content Area - Location List View */}
          <div className="flex-1 overflow-y-auto">
            <div className="divide-y divide-gray-100">
              {filteredLocations.map((location, idx) => (
                <div
                  key={location.id ?? `location-${idx}`}
                  className="p-4 cursor-pointer transition-all duration-200 hover:bg-gray-50"
                  onClick={() => setSelectedLocation(location)}
                >
                  <div className="flex gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <h3 className="font-medium text-gray-900 text-base leading-tight">
                        {location.name}
                      </h3>

                      <div className="flex items-center gap-2 text-sm">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-gray-900">
                            {location.rating?.toFixed(1) || "4.0"}
                          </span>
                          <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${
                                  i < Math.floor(location.rating || 4)
                                    ? "text-yellow-400"
                                    : i < (location.rating || 4)
                                    ? "text-yellow-300"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-gray-500">
                            ({location.reviewCount || "128"})
                          </span>
                        </div>
                        <span className="text-gray-400">·</span>
                        <span className="text-gray-600">
                          {location.priceInfo || "Pricing available"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <span>Restaurant</span>
                        <span className="text-gray-400">·</span>
                        <span className="truncate">{location.address}</span>
                      </div>

                      <div className="text-sm text-gray-600 leading-tight">
                        {location.description ||
                          "Authentic Nigerian cuisine & West African specialties"}
                      </div>

                      <div className="flex items-center gap-1 text-sm">
                        <span
                          className={`font-medium ${
                            location.isOpenNow
                              ? "text-green-700"
                              : "text-red-700"
                          }`}
                        >
                          {location.isOpenNow ? "Open" : "Closed"}
                        </span>
                        {!location.isOpenNow && (
                          <>
                            <span className="text-gray-400">⋅</span>
                            <span className="text-gray-600">Opens 10 am</span>
                          </>
                        )}
                      </div>

                      {location.reviews && location.reviews.length > 0 && (
                        <div className="flex items-start gap-2 text-sm pt-2 border-t border-gray-100">
                          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex-shrink-0 mt-0.5"></div>
                          <div className="text-gray-600 italic leading-tight">
                            &quot;{location.reviews[0].text}&quot;
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
                      <Image
                        src={
                          location.images && location.images.length > 0
                            ? location.images[0]
                            : "/placeholder-image.svg"
                        }
                        alt={location.name}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.log("Location image failed to load:", e.currentTarget.src);
                          e.currentTarget.src = "/placeholder-image.svg";
                        }}
                        unoptimized
                      />
                    </div>
                  </div>
                </div>
              ))}

              {filteredLocations.length === 0 && (
                <div className="text-center py-12 px-4">
                  <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">
                    No locations found
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Try adjusting your filters
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Info Panel - Floating card beside sidebar, adjusts position based on sidebar state */}
      <div
        className={`absolute top-24 bottom-4 w-96 z-20 transform transition-all duration-300 ease-out ${
          isSidebarOpen ? "left-[420px]" : "left-8"
        } ${
          selectedLocation
            ? "translate-x-0 opacity-100"
            : "-translate-x-8 opacity-0 pointer-events-none"
        }`}
      >
        <div className="h-full p-4">
          <div className="h-full bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all duration-200 hover:shadow-3xl">
            {selectedLocation && (
              <GoogleMapsLocationDetail
                location={selectedLocation}
                onClose={() => setSelectedLocation(null)}
                onDirections={() => {
                  const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedLocation.coordinates.lat},${selectedLocation.coordinates.lng}`;
                  window.open(url, "_blank");
                  info("Opening Google Maps for directions", "Navigation");
                }}
                onCall={() => {
                  if (selectedLocation.phone) {
                    window.open(`tel:${selectedLocation.phone}`, "_self");
                    info(`Calling ${selectedLocation.name}`, "Phone Call");
                  } else {
                    info("Phone number not available", "Call");
                  }
                }}
                onShare={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: selectedLocation.name,
                      text: `Check out ${selectedLocation.name} - ${selectedLocation.address}`,
                      url: window.location.href,
                    });
                    success("Location shared successfully!", "Shared");
                  } else {
                    // Fallback: Copy to clipboard
                    navigator.clipboard.writeText(window.location.href);
                    success("Location link copied to clipboard!", "Shared");
                  }
                }}
                onSave={() => {
                  success(
                    `${selectedLocation.name} saved to your favorites!`,
                    "Saved"
                  );
                  // TODO: Implement actual save functionality
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Main Map Container - takes remaining space */}
      <div className="flex-1 h-full relative">
        <MapContainer
          locations={filteredLocations}
          selectedLocation={selectedLocation}
          onLocationSelect={(loc) => setSelectedLocation(loc)}
          filters={filters}
        />
      </div>

      {/* Mobile Layout */}
      <div className="xl:hidden relative z-10">
        <Header
          onAddLocation={() => setShowIntakeDialog(true)}
          onSearch={handleSearch}
          searchResults={searchResults.map((loc) => ({
            id: loc.id,
            name: loc.name,
            address: loc.address,
            isOpenNow: loc.isOpenNow,
          }))}
          onSearchResultSelect={handleSearchResultSelect}
        />
      </div>

      {/* Google-style floating filters - positioned at top center */}
      <CentralFilters
        filters={filters}
        onFilterChange={(newFilters) => {
          if (Object.keys(newFilters).length === 0) {
            setFilters({});
          } else {
            setFilters((prev) => ({ ...prev, ...newFilters }));
          }
        }}
      />

      {/* Dialogs */}
      <AgenticIntake
        isOpen={showIntakeDialog}
        onClose={() => setShowIntakeDialog(false)}
        onSubmit={handleLocationSubmit}
        existingLocations={allLocations}
      />

      <ModerationPanel
        isOpen={showModerationPanel}
        onClose={() => setShowModerationPanel(false)}
        onApprove={handleApproveLocation}
        onReject={handleRejectLocation}
        onBulkAction={handleBulkAction}
        onPendingCountChange={setPendingCount}
      />

      {/* User Profile - positioned like Google Maps */}
      <MapUserProfile />
    </div>
  );
}
