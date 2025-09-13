"use client";

import {
  Clock,
  MapPin,
  Phone,
  Star,
  DollarSign,
  ExternalLink,
} from "lucide-react";
import { AmalaLocation } from "@/types/location";

interface LocationListProps {
  locations: AmalaLocation[];
  selectedLocation: AmalaLocation | null;
  onLocationSelect: (location: AmalaLocation) => void;
}

export function LocationList({
  locations,
  selectedLocation,
  onLocationSelect,
}: LocationListProps) {
  const getPriceDisplay = (priceRange: string) => {
    return priceRange;
  };

  const getStatusBadge = (location: AmalaLocation) => {
    if (location.status === "pending") {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Pending Review
        </span>
      );
    }

    return location.isOpenNow ? (
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 bg-green-500 rounded-full" />
        <span className="text-xs font-medium text-green-600">Open</span>
      </div>
    ) : (
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 bg-red-500 rounded-full" />
        <span className="text-xs font-medium text-red-600">Closed</span>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Amala spots</h2>
        <p className="text-sm text-gray-600 mt-1">
          {locations.length} {locations.length === 1 ? "result" : "results"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {locations.length === 0 ? (
          <div className="text-center py-12 px-4">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No locations found</p>
            <p className="text-sm text-gray-500 mt-1">
              Try adjusting your filters or search terms
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {locations.map((location) => (
              <div
                key={location.id}
                className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                  selectedLocation?.id === location.id
                    ? "bg-blue-50 border-r-2 border-blue-600"
                    : ""
                }`}
                onClick={() => onLocationSelect(location)}
              >
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 text-sm truncate">
                        {location.name}
                      </h3>
                      {location.rating && (
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {location.rating}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({location.reviewCount})
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      {getStatusBadge(location)}
                    </div>
                  </div>

                  {/* Address */}
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {location.address}
                    </p>
                  </div>

                  {/* Details */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-gray-900">
                        {getPriceDisplay(location.priceRange)}
                      </span>
                    </div>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-600 capitalize">
                      {location.serviceType.replace("-", " ")}
                    </span>
                  </div>

                  {/* Cuisine Tags */}
                  <div className="flex flex-wrap gap-1">
                    {location.cuisine.slice(0, 3).map((cuisine) => (
                      <span
                        key={cuisine}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700"
                      >
                        {cuisine}
                      </span>
                    ))}
                    {location.cuisine.length > 3 && (
                      <span className="text-xs text-gray-500 px-2 py-1">
                        +{location.cuisine.length - 3} more
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {location.description && (
                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                      {location.description}
                    </p>
                  )}

                  {/* Contact Info */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {location.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <span>{location.phone}</span>
                        </div>
                      )}
                      {location.website && (
                        <div className="flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" />
                          <span>Website</span>
                        </div>
                      )}
                    </div>

                    <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                      View details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
