"use client";

import { useState, useEffect } from "react";
import {
  ArrowPathIcon as Sync,
  CheckCircleIcon as CheckCircle,
  ExclamationCircleIcon as Error,
  ClockIcon as Schedule,
  ArrowPathIcon as Refresh,
} from "@heroicons/react/24/outline";

interface EnrichmentStatus {
  locationId: string;
  name: string;
  hasRealData: boolean;
  rating?: number;
  reviewCount?: number;
  imagesCount: number;
  enrichedAt?: string;
  enrichmentSource?: string;
}

interface LocationEnrichmentResult {
  success: boolean;
  locationId?: string;
  error?: string;
}

export function EnrichmentManager() {
  const [locations, setLocations] = useState<any[]>([]);
  const [enrichmentStatus, setEnrichmentStatus] = useState<
    Record<string, EnrichmentStatus>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [isEnriching, setIsEnriching] = useState<Record<string, boolean>>({});
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Load all locations
  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/locations");
      const data = await response.json();
      setLocations(data.locations || []);

      // Check enrichment status for each location
      for (const location of data.locations || []) {
        await checkEnrichmentStatus(location.id);
      }
    } catch (error) {
      console.error("Failed to load locations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkEnrichmentStatus = async (locationId: string) => {
    try {
      const response = await fetch(
        `/api/locations/enrich?locationId=${locationId}`
      );
      const data = await response.json();
      if (data.success) {
        setEnrichmentStatus((prev) => ({
          ...prev,
          [locationId]: data.data,
        }));
      }
    } catch (error) {
      console.error(`Failed to check status for ${locationId}:`, error);
    }
  };

  const enrichLocation = async (location: any) => {
    setIsEnriching((prev) => ({ ...prev, [location.id]: true }));

    try {
      const response = await fetch("/api/locations/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId: location.id,
          address: location.address,
          name: location.name,
          forceRefresh: true,
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log(`✅ Successfully enriched ${location.name}`);
        await checkEnrichmentStatus(location.id);
      } else {
        console.error(`❌ Failed to enrich ${location.name}:`, result.error);
      }
    } catch (error) {
      console.error(`❌ Error enriching ${location.name}:`, error);
    } finally {
      setIsEnriching((prev) => ({ ...prev, [location.id]: false }));
    }
  };

  const enrichAllLocations = async () => {
    const unenrichedLocations = locations.filter((location) => {
      const status = enrichmentStatus[location.id];
      return !status?.hasRealData;
    });

    setProgress({ current: 0, total: unenrichedLocations.length });

    for (let i = 0; i < unenrichedLocations.length; i++) {
      const location = unenrichedLocations[i];
      setProgress((prev) => ({ ...prev, current: i + 1 }));

      await enrichLocation(location);

      // Rate limiting - wait 1 second between requests
      if (i < unenrichedLocations.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    setProgress({ current: 0, total: 0 });
  };

  const getStatusIcon = (status?: EnrichmentStatus) => {
    if (!status) return <Schedule className="text-gray-400" />;
    if (status.hasRealData) return <CheckCircle className="text-green-500" />;
    return <Error className="text-red-500" />;
  };

  const getStatusText = (status?: EnrichmentStatus) => {
    if (!status) return "Not checked";
    if (status.hasRealData) {
      return `✅ Enriched (${status.rating?.toFixed(1) || "N/A"}★, ${
        status.reviewCount || 0
      } reviews, ${status.imagesCount} images)`;
    }
    return "❌ Needs enrichment";
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Location Enrichment Manager
        </h1>
        <div className="flex gap-2">
          <button
            onClick={loadLocations}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50"
          >
            <Refresh className="w-4 h-4" />
            {isLoading ? "Loading..." : "Refresh"}
          </button>
          <button
            onClick={enrichAllLocations}
            disabled={isLoading || progress.total > 0}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            <Sync className="w-4 h-4" />
            {progress.total > 0
              ? `Enriching... (${progress.current}/${progress.total})`
              : "Enrich All"}
          </button>
        </div>
      </div>

      {progress.total > 0 && (
        <div className="mb-4 p-4 bg-green-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-700">
              Enriching locations... ({progress.current}/{progress.total})
            </span>
            <span className="text-sm text-primary">
              {Math.round((progress.current / progress.total) * 100)}%
            </span>
          </div>
          <div className="w-full bg-green-200 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Locations ({locations.length})
          </h2>
        </div>
        <div className="divide-y divide-gray-200">
          {locations.map((location) => {
            const status = enrichmentStatus[location.id];
            const isEnrichingThis = isEnriching[location.id];

            return (
              <div key={location.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(status)}
                      <h3 className="font-medium text-gray-900">
                        {location.name}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      {location.address}
                    </p>
                    <p className="text-sm text-gray-500">
                      {getStatusText(status)}
                    </p>
                    {status?.enrichedAt && (
                      <p className="text-xs text-gray-400 mt-1">
                        Last enriched:{" "}
                        {new Date(status.enrichedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => enrichLocation(location)}
                    disabled={isEnrichingThis}
                    className="flex items-center gap-2 px-3 py-1 bg-green-500 text-white text-sm rounded-md hover:bg-green-600 disabled:opacity-50"
                  >
                    <Sync
                      className={`w-4 h-4 ${
                        isEnrichingThis ? "animate-spin" : ""
                      }`}
                    />
                    {isEnrichingThis ? "Enriching..." : "Enrich"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-2">How it works:</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>
            • Searches Google Places API using restaurant name and address
          </li>
          <li>• Fetches real ratings, reviews, photos, and business hours</li>
          <li>• Stores all data in your database for fast loading</li>
          <li>• Updates location info to match Google Maps exactly</li>
          <li>• Rate limited to 1 request per second to avoid API limits</li>
        </ul>
      </div>
    </div>
  </div>
  );
}
