"use client";

import { useState, useEffect } from "react";
import { MapContainer } from "@/components/map-container";
import { FilterSidebar } from "@/components/filter-sidebar";
import { Header } from "@/components/header";
import { LocationList } from "@/components/location-list";
import { AgenticIntake } from "@/components/agentic-intake";
import { ModerationPanel } from "@/components/moderation-panel";
import { MobileBottomSheet } from "@/components/mobile-bottom-sheet";
import { filterLocations } from "@/data/locations";
import { dbOperations } from "@/lib/database/supabase";
import { LocationService } from "@/lib/services/location-service";
import {
  AmalaLocation,
  LocationFilter,
  LocationSubmission,
} from "@/types/location";

export default function Home() {
  const [locations, setLocations] = useState<AmalaLocation[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<AmalaLocation[]>(
    []
  );
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [filters, setFilters] = useState<LocationFilter>({});
  const [selectedLocation, setSelectedLocation] =
    useState<AmalaLocation | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showIntakeDialog, setShowIntakeDialog] = useState(false);
  const [showModerationPanel, setShowModerationPanel] = useState(false);
  const [searchResults, setSearchResults] = useState<AmalaLocation[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  // Search functionality
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    // Search through current locations
    const results = locations.filter(
      (location) =>
        location.name.toLowerCase().includes(query.toLowerCase()) ||
        location.address.toLowerCase().includes(query.toLowerCase()) ||
        location.description?.toLowerCase().includes(query.toLowerCase())
    );

    setSearchResults(results);
  };

  const handleSearchResultSelect = (locationId: string) => {
    const location = locations.find((loc) => loc.id === locationId);
    if (location) {
      setSelectedLocation(location);
    }
  };

  // Load locations - connect to database
  useEffect(() => {
    const loadLocations = async () => {
      try {
        setIsLoadingLocations(true);

        // Load locations from database
        console.log("📍 Loading Amala locations from database...");
        console.log(
          "🔗 Supabase URL:",
          process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + "..."
        );

        const loadedLocations = await dbOperations.getLocations();

        console.log(
          `✅ Loaded ${loadedLocations.length} approved locations from Supabase`
        );

        if (loadedLocations.length === 0) {
          console.log(
            "ℹ️ No locations found in database. Database is empty or table doesn't exist."
          );
        } else {
          console.log("📋 First location:", loadedLocations[0]?.name);
        }

        setLocations(loadedLocations);
        setFilteredLocations(loadedLocations);
      } catch (error) {
        console.error("❌ Error loading locations from database:", error);
        console.error(
          "💡 Check your Supabase configuration and database setup"
        );
      } finally {
        setIsLoadingLocations(false);
      }
    };

    loadLocations();
  }, []);

  // Filter locations when filters change
  useEffect(() => {
    console.log("🔍 Applying filters:", filters);
    console.log("📍 Total locations before filtering:", locations.length);

    const filtered = filterLocations(locations, {
      searchQuery: filters.searchQuery,
      isOpenNow: filters.isOpenNow,
      serviceType: filters.serviceType,
      priceRange: filters.priceRange,
      cuisine: filters.cuisine,
    });

    console.log("✅ Filtered locations:", filtered.length);
    setFilteredLocations(filtered);
  }, [locations, filters]);

  const handleFilterChange = (newFilters: Partial<LocationFilter>) => {
    // If it's a clear operation (empty object), reset all filters
    if (Object.keys(newFilters).length === 0) {
      setFilters({});
    } else {
      setFilters((prev) => ({ ...prev, ...newFilters }));
    }
  };

  const handleLocationSelect = (location: AmalaLocation) => {
    setSelectedLocation(location);
  };

  const handleLocationSubmit = async (submission: LocationSubmission) => {
    try {
      // Check for duplicates first
      const duplicateCheck = await LocationService.detectDuplicate(
        submission,
        locations
      );

      if (duplicateCheck.isDuplicate) {
        const confirmSubmit = window.confirm(
          `Similar location found: "${duplicateCheck.similarLocations[0].name}". Submit anyway?`
        );
        if (!confirmSubmit) return;
      }

      // Submit to database via API
      console.log("📝 Submitting location to database:", submission);

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

      console.log("✅ Location submitted successfully:", result.data);

      // Refresh locations to include the new pending location
      const loadedLocations = await dbOperations.getLocations();
      setLocations(loadedLocations);
      setFilteredLocations(loadedLocations);

      setShowIntakeDialog(false);

      // Show success message
      alert(`Location "${submission.name}" submitted for moderation!`);
    } catch (error) {
      console.error("Error submitting location:", error);
      alert("Error submitting location. Please try again.");
    }
  };

  const handleApproveLocation = async (
    locationId: string,
    verificationNotes?: string
  ) => {
    try {
      console.log("🟢 Page: Approving location in database:", locationId);

      // Update the database first
      await dbOperations.updateLocationStatus(locationId, "approved");
      console.log("✅ Page: Database updated successfully");

      // Then update local state
      setLocations((prev) =>
        prev.map((location) =>
          location.id === locationId
            ? {
                ...location,
                status: "approved",
                moderatedAt: new Date(),
                moderationNotes: verificationNotes,
              }
            : location
        )
      );

      console.log("✅ Page: Local state updated");
    } catch (error) {
      console.error("❌ Page: Error approving location:", error);
      alert(
        `Error approving location: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const handleRejectLocation = async (
    locationId: string,
    reason: string,
    notes?: string
  ) => {
    try {
      console.log("🔴 Page: Rejecting location in database:", locationId);

      // Update the database first
      await dbOperations.updateLocationStatus(locationId, "rejected");
      console.log("✅ Page: Database updated successfully");

      // Then update local state
      setLocations((prev) =>
        prev.map((location) =>
          location.id === locationId
            ? {
                ...location,
                status: "rejected",
                moderatedAt: new Date(),
                rejectionReason: reason,
                moderationNotes: notes,
              }
            : location
        )
      );

      console.log("✅ Page: Local state updated");
    } catch (error) {
      console.error("❌ Page: Error rejecting location:", error);
      alert(
        `Error rejecting location: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
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

  const pendingLocations = locations.filter(
    (location) => location.status === "pending"
  );

  // Show loading state while locations are being fetched
  if (isLoadingLocations) {
    return (
      <div className="h-screen flex flex-col">
        <Header
          onAddLocation={() => setShowIntakeDialog(true)}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onShowModeration={() => setShowModerationPanel(true)}
          pendingCount={0}
          onSearch={() => {}}
          searchResults={[]}
          onSearchResultSelect={() => {}}
        />
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Loading Amala Locations
            </h3>
            <p className="text-gray-600">
              Fetching the best Amala spots for you...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Map as absolute background */}
      <div className="fixed inset-0 w-screen h-screen z-0">
        <MapContainer
          locations={filteredLocations}
          selectedLocation={selectedLocation}
          onLocationSelect={setSelectedLocation}
        />
      </div>

      {/* Header - always visible */}
      <Header
        onAddLocation={() => setShowIntakeDialog(true)}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onShowModeration={() => setShowModerationPanel(true)}
        pendingCount={pendingCount}
        onSearch={handleSearch}
        searchResults={searchResults.map((loc) => ({
          id: loc.id,
          name: loc.name,
          address: loc.address,
          isOpenNow: loc.isOpenNow,
        }))}
        onSearchResultSelect={handleSearchResultSelect}
      />

      {/* Filter Sidebar */}
      <FilterSidebar
        isOpen={isSidebarOpen}
        filters={filters}
        onFilterChange={handleFilterChange}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Desktop Location List */}
      <div className="hidden xl:block fixed top-0 right-0 h-full w-96 border-l bg-white z-30">
        <LocationList
          locations={filteredLocations}
          selectedLocation={selectedLocation}
          onLocationSelect={handleLocationSelect}
        />
      </div>

      {/* Mobile Bottom Sheet */}
      <div className="xl:hidden">
        <MobileBottomSheet
          locations={filteredLocations}
          selectedLocation={selectedLocation}
          onLocationSelect={handleLocationSelect}
        />
      </div>

      {/* Dialogs */}
      <AgenticIntake
        isOpen={showIntakeDialog}
        onClose={() => setShowIntakeDialog(false)}
        onSubmit={handleLocationSubmit}
        existingLocations={locations}
      />

      <ModerationPanel
        isOpen={showModerationPanel}
        onClose={() => setShowModerationPanel(false)}
        onApprove={handleApproveLocation}
        onReject={handleRejectLocation}
        onBulkAction={handleBulkAction}
        onPendingCountChange={setPendingCount}
      />
    </div>
  );
}
