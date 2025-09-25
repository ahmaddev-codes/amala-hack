"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { OptimizedImage } from "@/components/optimized-image";
import { MapContainer } from "@/components/map-container";
import { Header } from "@/components/header";
import { LocationSubmissionDialog } from "@/components/location-submission-dialog";
import { MapUserProfile } from "@/components/map-user-profile";
import { CentralFilters } from "@/components/central-filters";
import { MobileBottomSheet } from "@/components/mobile-bottom-sheet";
import { LoadingScreen } from "@/components/loading-screen";
import { LocationSkeleton } from "@/components/location-skeleton";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { firebaseOperations } from "@/lib/firebase/database";
import { useAnalytics } from "@/hooks/useAnalytics";
import { GoogleMapsLocationDetail } from "@/components/google-maps-location-detail";
import { StarIcon, MapPinIcon } from "@heroicons/react/24/outline";
import {
  AmalaLocation,
  LocationFilter,
  LocationSubmission,
  LocationResult,
} from "@/types/location";

export default function Home() {
  const { success, info, error } = useToast();
  const { isLoading: isAuthLoading, user, getIdToken } = useAuth();
  const analytics = useAnalytics();
  const [allLocations, setAllLocations] = useState<AmalaLocation[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [filters, setFilters] = useState<LocationFilter>({});
  const [selectedLocation, setSelectedLocation] =
    useState<AmalaLocation | null>(null);
  const [showIntakeDialog, setShowIntakeDialog] = useState(false);
  const [searchResults, setSearchResults] = useState<AmalaLocation[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Optimized search with debouncing and memoization
  const handleSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      const lowerQuery = query.toLowerCase();
      const results = allLocations.filter(
        (location) =>
          location.name.toLowerCase().includes(lowerQuery) ||
          location.address.toLowerCase().includes(lowerQuery) ||
          location.description?.toLowerCase().includes(lowerQuery)
      );
      
      // Debug: Uncomment for search debugging
      // console.log('🔍 Search results:', { query, resultsCount: results.length, totalLocations: allLocations.length });
      
      // Only update if results actually changed
      setSearchResults(prevResults => {
        if (prevResults.length !== results.length || 
            !prevResults.every((prev, index) => prev.id === results[index]?.id)) {
          return results;
        }
        return prevResults;
      });

      // Track search analytics
      analytics.trackSearch(query, results.length, filters);
    },
    [allLocations, analytics, filters]
  );

  const handleSearchResultSelect = (locationId: string) => {
    const location = allLocations.find((loc) => loc.id === locationId);
    if (location) {
      setSelectedLocation(location);
      // Clear search results when a location is selected
      setSearchResults([]);
      // Track location view analytics
      analytics.trackLocationView(location.id, location.name, 'search');
    }
  };

  // Load locations from database with progressive loading
  useEffect(() => {
    const loadLocations = async () => {
      try {
        console.log("🔄 Starting to load locations with pagination...");

        // First, load minimal batch for immediate display (20 locations)
        const initialLocations = await firebaseOperations.getLocations({
          limit: 20
        });
        console.log(`✅ Loaded initial ${initialLocations.length} locations`);
        setAllLocations(initialLocations);
        setIsLoadingLocations(false); // Show initial content immediately

        // Then load remaining locations in background but merge instead of replace
        setTimeout(async () => {
          try {
            const allLocations = await firebaseOperations.getAllLocations({});
            const approvedLocations = allLocations.filter(
              (loc) => loc.status === "approved"
            );
            console.log(`✅ Loaded all ${approvedLocations.length} approved locations`);

            // Merge new locations with existing ones instead of replacing
            setAllLocations(prevLocations => {
              const existingIds = new Set(prevLocations.map(loc => loc.id));
              const newLocations = approvedLocations.filter(loc => !existingIds.has(loc.id));
              return [...prevLocations, ...newLocations];
            });

            // Load pending count for moderators/admins
            const pendingLocations = allLocations.filter(loc => loc.status === 'pending');
            setPendingCount(pendingLocations.length);
          } catch (error) {
            console.error("❌ Error loading remaining locations:", error);
          }
        }, 500); // Load remaining after 0.5 seconds

      } catch (error) {
        console.error("❌ Error loading initial locations:", error);
        setIsLoadingLocations(false);
      }
    };

    // Only load locations after auth is ready
    if (!isAuthLoading) {
      loadLocations();
    }
  }, [isAuthLoading]);

  // Track page view on component mount
  useEffect(() => {
    analytics.trackPageView('Home - Map View', 'Amala Discovery Platform');
  }, [analytics]);

  // Memoized filtered locations to prevent unnecessary recalculations
  const filteredLocations = useMemo(() => {
    // Don't apply search filters to map - only to sidebar
    // Search results are handled separately in the sidebar
    let filtered = allLocations;

    // Debug: Uncomment for filter debugging
    // console.log('🔍 Filtering locations:', { totalLocations: allLocations.length, filters, sampleLocation: allLocations[0] });

    // Apply filters (but not search)
    if (filters.serviceType && filters.serviceType !== "all") {
      filtered = filtered.filter(loc => loc.serviceType === filters.serviceType);
      // console.log(`🔍 After serviceType filter (${filters.serviceType}):`, filtered.length);
    }

    if (filters.isOpenNow) {
      filtered = filtered.filter(loc => loc.isOpenNow === true);
      // console.log('🔍 After isOpenNow filter:', filtered.length);
    }

    // Apply price range filter
    if (filters.priceRange && filters.priceRange.length > 0) {
      filtered = filtered.filter(loc => {
        if (!loc.priceLevel) return false;
        // Convert price level to price range symbols
        const priceSymbol = ['$', '$$', '$$$', '$$$$'][loc.priceLevel - 1];
        return filters.priceRange!.includes(priceSymbol as any);
      });
      // console.log('🔍 After priceRange filter:', filtered.length);
    }

    // console.log('🔍 Final filtered locations:', filtered.length);
    return filtered;
  }, [allLocations, filters]);

  const handleAddLocation = () => {
    // Check if user is authenticated before opening the dialog
    if (!user) {
      error("Please log in to add locations to the platform", "Authentication Required");
      return;
    }
    
    // User is authenticated, open the dialog
    setShowIntakeDialog(true);
  };

  const handleLocationSubmit = async (locations: LocationResult[]) => {
    try {
      // Get authentication token (user check already done in handleAddLocation)
      const token = await getIdToken();
      if (!token) {
        error("Authentication failed. Please log in again.", "Authentication Error");
        return;
      }

      info(`Submitting ${locations.length} location${locations.length > 1 ? 's' : ''} for review...`, "Submitting Locations");

      const submissionPromises = locations.map(async (location) => {
        const submission: LocationSubmission = {
          name: location.name,
          address: location.address,
          description: location.description || `Amala restaurant found via AI search`,
          coordinates: location.coordinates || { lat: 6.5244, lng: 3.3792 }, // Default to Lagos
          phone: location.phone,
          website: location.website,
          rating: location.rating,
          priceInfo: location.priceRange,
          photos: location.photos || [],
          cuisine: ["Nigerian", "Amala"],
          openingHours: {},
        };

        const response = await fetch("/api/locations", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            location: submission,
            submitterInfo: {
              timestamp: new Date().toISOString(),
              userAgent: navigator.userAgent,
              source: location.source,
              confidence: location.confidence,
            },
          }),
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error);
        }
        return result;
      });

      await Promise.all(submissionPromises);

      // Refresh locations using merge approach
      const locationsFromDb = await firebaseOperations.getAllLocations({});
      const approvedLocations = locationsFromDb.filter(
        (loc) => loc.status === "approved"
      );

      // Merge new locations instead of replacing
      setAllLocations(prevLocations => {
        const existingIds = new Set(prevLocations.map(loc => loc.id));
        const newLocations = approvedLocations.filter(loc => !existingIds.has(loc.id));
        return [...prevLocations, ...newLocations];
      });

      setShowIntakeDialog(false);

      // Show single success message
      success(
        `${locations.length} location${locations.length > 1 ? 's' : ''} submitted successfully! They will be reviewed by moderators before appearing on the map.`,
        "Submission Successful"
      );
    } catch (err) {
      console.error("Error submitting locations:", err);
      error("Error submitting location. Please try again.", "Submission Failed");
    }
  };

  const handleApproveLocation = async (
    locationId: string,
    verificationNotes?: string
  ) => {
    try {
      await firebaseOperations.updateLocationStatus(locationId, "approved");

      // Update local state instead of full reload
      setAllLocations(prevLocations =>
        prevLocations.map(loc =>
          loc.id === locationId
            ? { ...loc, status: "approved" as const }
            : loc
        )
      );

      success("Location approved successfully!", "Approval Complete");
    } catch (err) {
      console.error("Error approving location:", err);
      error("Error approving location", "Approval Failed");
    }
  };

  const handleRejectLocation = async (
    locationId: string,
    reason?: string,
    notes?: string
  ) => {
    try {
      await firebaseOperations.updateLocationStatus(locationId, "rejected");

      // Update local state instead of full reload
      setAllLocations(prevLocations =>
        prevLocations.map(loc =>
          loc.id === locationId
            ? { ...loc, status: "rejected" as const }
            : loc
        )
      );

      info(`Location rejected${reason ? `: ${reason}` : ''}`, "Rejection Complete");
    } catch (err) {
      console.error("Error rejecting location:", err);
      error("Error rejecting location", "Rejection Failed");
    }
  };

  // Show loading screen only for auth, not for locations
  if (isAuthLoading) {
    return (
      <LoadingScreen
        message="Amala Map"
        submessage="Initializing your native taste buds..."
        showLogo={true}
      />
    );
  }
  return (
    <div className="h-screen w-full bg-gray-100 overflow-hidden flex animate-in fade-in duration-500">
      {/* Sidebar with Sliding Animation - tablet and desktop (sm:block hidden = ≥640px) */}
      <div
        className={`fixed top-0 left-0 h-full w-full max-w-[280px] md:max-w-[320px] lg:max-w-[360px] xl:max-w-[400px] bg-white shadow-lg z-30 transition-transform duration-300 ease-in-out sm:block hidden ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        {/* Triangle Toggle Button - Always visible on the right edge */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-6 top-1/2 transform -translate-y-1/2 bg-white shadow-lg rounded-r-lg p-2 z-40 hover:bg-gray-50 transition-colors border border-l-0 border-gray-200"
        >
          <div
            className={`w-0 h-0 transition-transform duration-200 ${isSidebarOpen
              ? "border-r-[8px] border-r-gray-600 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent"
              : "border-l-[8px] border-l-gray-600 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent"
              }`}
          />
        </button>

        <div className="flex flex-col h-full">
          {/* Compact Header - fits within sidebar */}
          <div className="p-4 border-b border-gray-100">
            <Header
              onAddLocation={handleAddLocation}
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
                <h1 className="text-lg font-medium text-gray-900">
                  {searchResults.length > 0 ? 'Search Results' : 'Results'}
                </h1>
                <p className="text-sm text-gray-600">
                  {searchResults.length > 0
                    ? `${searchResults.length} ${searchResults.length === 1 ? 'result' : 'results'}`
                    : `${filteredLocations.length} ${filteredLocations.length === 1 ? 'result' : 'results'}`
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Scrollable Content Area - Location List View */}
          <div className="flex-1 overflow-y-auto">
            {isLoadingLocations ? (
              <LocationSkeleton count={8} />
            ) : (
              <div className="divide-y divide-gray-100">
                {(searchResults.length > 0 ? searchResults : filteredLocations).map((location, idx) => (
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
                                <StarIcon
                                  key={i}
                                  className={`w-3 h-3 ${i < Math.floor(location.rating || 4)
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
                            className={`font-medium ${location.isOpenNow
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
                        <OptimizedImage
                          src={
                            location.images && location.images.length > 0
                              ? location.images[0]
                              : "/placeholder-image.svg"
                          }
                          alt={location.name}
                          width={80}
                          height={80}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {searchResults.length === 0 && filteredLocations.length === 0 && !isLoadingLocations && (
                  <div className="text-center py-12 px-4">
                    <MapPinIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">
                      No locations found
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Try adjusting your filters
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Panel - Location detail card, responsive positioning */}
      <div
        className={`hidden sm:block fixed top-4 bottom-4 w-72 md:w-80 lg:w-96 z-30 transform transition-all duration-300 ease-out ${isSidebarOpen
          ? "sm:left-[292px] md:left-[332px] lg:left-[372px] xl:left-[412px]"
          : "left-4"
          } ${selectedLocation
            ? "translate-x-0 opacity-100"
            : "-translate-x-8 opacity-0 pointer-events-none"
          }`}
      >
        <div className="h-full p-4">
          <div className="h-full bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all duration-200 hover:shadow-3xl">
            {selectedLocation && (
              <GoogleMapsLocationDetail
                location={selectedLocation}
                variant="full"
                onClose={() => setSelectedLocation(null)}
                onDirections={() => { }}
                onShare={() => { }}
                onSave={() => { }}
              />
            )}
          </div>
        </div>
      </div>


      {/* Mobile Layout - floaty header */}
      <div className="sm:hidden fixed top-4 left-4 right-4 z-40">
        <Header
          onAddLocation={handleAddLocation}
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

      {/* Mobile Map Container - full screen */}
      <div className="sm:hidden fixed inset-0 z-10">
        <MapContainer
          locations={searchResults.length > 0 ? searchResults : filteredLocations}
          selectedLocation={selectedLocation}
          onLocationSelect={(loc) => setSelectedLocation(loc)}
          filters={filters}
        />
      </div>

      {/* Desktop/Tablet Map Container - positioned beside sidebar */}
      <div className={`hidden sm:block fixed inset-0 z-10 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'sm:left-[280px] md:left-[320px] lg:left-[360px] xl:left-[400px]' : 'left-0'}`}>
        <MapContainer
          locations={searchResults.length > 0 ? searchResults : filteredLocations}
          selectedLocation={selectedLocation}
          onLocationSelect={(loc) => setSelectedLocation(loc)}
          filters={filters}
        />
      </div>

      {/* floating filters - positioned at top center */}
      <CentralFilters
        filters={filters}
        onFilterChange={(newFilters) => {
          // Clear search results when filters change
          setSearchResults([]);
          
          if (Object.keys(newFilters).length === 0) {
            setFilters({});
          } else {
            setFilters((prev) => ({ ...prev, ...newFilters }));
          }
        }}
      />

      {/* Dialogs */}
      <LocationSubmissionDialog
        isOpen={showIntakeDialog}
        onClose={() => setShowIntakeDialog(false)}
        onSubmit={handleLocationSubmit}
      />

      {/* Mobile Bottom Sheet - mobile phones only (smaller than tablets) */}
      <div className="sm:hidden">
        <MobileBottomSheet
          locations={searchResults.length > 0 ? searchResults : filteredLocations}
          selectedLocation={selectedLocation}
          onLocationSelect={(loc) => setSelectedLocation(loc)}
          onClose={() => setSelectedLocation(null)}
        />
      </div>


      {/* User Profile */}
      <MapUserProfile />
    </div>
  );
}
