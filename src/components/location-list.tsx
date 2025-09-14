"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Clock,
  MapPin,
  Phone,
  Star,
  DollarSign,
  ExternalLink,
} from "lucide-react";
import { AmalaLocation } from "@/types/location";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedForDetails, setSelectedForDetails] =
    useState<AmalaLocation | null>(null);

  const getPriceDisplay = (priceRange: string, priceInfo?: string) => {
    return priceInfo || priceRange;
  };

  const getStatusBadge = (location: AmalaLocation) => {
    if (location.status === "pending") {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Pending Review
        </span>
      );
    }

    const now = new Date();
    const currentDay = now
      .toLocaleDateString("en-us", { weekday: "long" })
      .toLowerCase();
    const todayHours = location.hours?.[currentDay];
    let timeDisplay = "Hours not available";
    let isOpenNow = false;

    if (todayHours) {
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeInMinutes = currentHour * 60 + currentMinute;

      const [openHour, openMinute] = todayHours.open.split(":").map(Number);
      const [closeHour, closeMinute] = todayHours.close.split(":").map(Number);

      const openTimeInMinutes = openHour * 60 + openMinute;
      const closeTimeInMinutes = closeHour * 60 + closeMinute;

      isOpenNow =
        currentTimeInMinutes >= openTimeInMinutes &&
        currentTimeInMinutes <= closeTimeInMinutes;
      timeDisplay = `${formatTime12(todayHours.open)} - ${formatTime12(
        todayHours.close
      )}`;
    }

    const statusText = isOpenNow ? "Open" : "Closed";
    const statusColor = isOpenNow ? "text-[#198639]" : "text-[#DC362E]";
    const dotColor = isOpenNow ? "bg-[#198639]" : "bg-[#DC362E]";

    return (
      <div className="flex items-center gap-1 text-xs font-medium">
        <div className={`w-2 h-2 ${dotColor} rounded-full`} />
        <span className={statusColor}>{statusText}</span>
        <span className="text-gray-500">•</span>
        <span className="text-gray-600">{timeDisplay}</span>
      </div>
    );
  };

  const openDetails = (location: AmalaLocation) => {
    setSelectedForDetails(location);
    setDetailsOpen(true);
  };

  const renderStars = (rating: number | undefined) => {
    if (!rating || rating === 0) {
      return (
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="w-3 h-3 text-gray-300" />
          ))}
          <span className="text-xs text-gray-500">No rating</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-3 h-3 ${
              i < Math.floor(rating)
                ? "fill-yellow-400 text-yellow-400"
                : i < rating
                ? "text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
        <span className="text-xs font-medium text-gray-900 ml-1">{rating}</span>
      </div>
    );
  };

  return (
    <>
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
                  className={`p-4 cursor-pointer transition-all duration-200 hover:bg-gray-50 hover:shadow-sm ${
                    selectedLocation?.id === location.id
                      ? "bg-primary/5 border-r-2 border-primary"
                      : ""
                  }`}
                  onClick={() => onLocationSelect(location)}
                >
                  <div className="flex gap-4">
                    {/* Left Side */}
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Name */}
                      <h3 className="font-medium text-gray-900 text-sm truncate">
                        {location.name}
                      </h3>

                      {/* Rating */}
                      {renderStars(location.rating)}

                      {/* Address */}
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {location.address}
                        </p>
                      </div>

                      {/* Status and Service Type */}
                      <div className="space-y-1">
                        <div>{getStatusBadge(location)}</div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="capitalize">
                            {location.serviceType.replace("-", " ")}
                          </span>
                        </div>
                      </div>

                      {/* View Details Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetails(location);
                        }}
                        className="text-xs text-primary hover:text-primary/80 font-medium cursor-pointer transition-colors duration-200 mt-2"
                      >
                        View details →
                      </button>
                    </div>

                    {/* Right Side: Image */}
                    <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-gray-200">
                      {location.images && location.images.length > 0 ? (
                        <Image
                          src={location.images[0]}
                          alt={location.name}
                          width={96}
                          height={96}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MapPin className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg">
              {selectedForDetails?.name}
            </DialogTitle>
          </DialogHeader>

          {/* Image */}
          <div className="relative h-48 bg-gray-200 rounded-t-lg overflow-hidden">
            {selectedForDetails?.images &&
            selectedForDetails.images.length > 0 ? (
              <Image
                src={selectedForDetails.images[0]}
                alt={selectedForDetails.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <MapPin className="w-12 h-12 text-gray-400" />
              </div>
            )}
          </div>

          <div className="p-4 space-y-4">
            {/* Rating, Reviews, Price */}
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {renderStars(selectedForDetails?.rating)}
                  {selectedForDetails?.reviewCount && (
                    <span className="text-xs text-gray-500">
                      ({selectedForDetails.reviewCount} reviews)
                    </span>
                  )}
                </div>
                <span className="font-medium text-gray-900">
                  {getPriceDisplay(
                    selectedForDetails?.priceRange || "",
                    selectedForDetails?.priceInfo
                  )}
                </span>
              </div>
            </div>

            {/* Border Line */}
            <Separator />

            {/* Description */}
            {selectedForDetails?.description && (
              <div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {selectedForDetails.description}
                </p>
              </div>
            )}

            {/* Cuisine */}
            {selectedForDetails?.cuisine &&
              selectedForDetails.cuisine.length > 0 && (
                <div>
                  <div className="font-medium text-gray-900 mb-2 text-sm">
                    Cuisine
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedForDetails.cuisine.map((c) => (
                      <span
                        key={c}
                        className="px-2 py-1 bg-gray-100 text-xs rounded-full text-gray-700"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            {/* Hours */}
            {selectedForDetails?.hours && (
              <div>
                <div className="font-medium text-gray-900 mb-2 text-sm">
                  Hours
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  {Object.entries(selectedForDetails.hours).map(
                    ([day, info]) => (
                      <div key={day} className="flex justify-between">
                        <span>
                          {day.charAt(0).toUpperCase() + day.slice(1)}
                        </span>
                        <span>
                          {info.open} - {info.close}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
export function formatTime12(time: string) {
  // Expects time in "HH:mm" (24-hour) format
  const [hourStr, minuteStr] = time.split(":");
  let hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12; // Convert 0 to 12 for 12 AM

  return `${hour}:${minute.toString().padStart(2, "0")} ${ampm}`;
}
