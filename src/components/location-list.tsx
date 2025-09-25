"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { MapPinIcon as MapPin } from "@heroicons/react/24/outline";
import { IoStar, IoStarHalf, IoStarOutline } from "react-icons/io5";
import { AmalaLocation, Review } from "@/types/location";

interface LocationReview {
  id: string;
  author: string;
  rating: number;
  text: string;
  author_photo?: string;
  publish_time_description?: string;
  source?: string;
  date_posted?: string; // Add missing field
}

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
  const [locationReviews, setLocationReviews] = useState<
    Record<string, LocationReview[]>
  >({});

  // Fetch reviews for all locations
  useEffect(() => {
    const fetchReviews = async () => {
      for (const location of locations) {
        try {
          const response = await fetch(`/api/locations/${location.id}/reviews`);
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              setLocationReviews((prev) => ({
                ...prev,
                [location.id]: data.reviews || [],
              }));
            }
          }
        } catch (error) {
          console.error(`Failed to fetch reviews for ${location.name}:`, error);
        }
      }
    };

    if (locations.length > 0) {
      fetchReviews();
    }
  }, [locations]);

  const getLatestReview = (locationId: string): LocationReview | null => {
    const reviews = locationReviews[locationId] || [];
    if (reviews.length === 0) return null;
    // Return the most recent review instead of random
    return reviews.sort((a, b) => {
      const dateA = a.date_posted ? new Date(a.date_posted).getTime() : 0;
      const dateB = b.date_posted ? new Date(b.date_posted).getTime() : 0;
      return dateB - dateA;
    })[0];
  };

  return (
    <div className="divide-y divide-gray-100">
      {locations.map((loc, idx) => (
        <div key={loc.id ?? `location-${idx}`}>
          {/* Main listing container */}
          <div
            className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => onLocationSelect(loc)}
          >
            <div className="flex">
              {/* Left side - Restaurant details */}
              <div className="flex-1 pr-3">
                {/* Restaurant name */}
                <div className="mb-1">
                  <h3 className="text-lg font-medium text-gray-900 leading-tight">
                    {loc.name}
                  </h3>
                </div>

                {/* Rating section */}
                <div className="mb-1">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-900 mr-1">
                      {loc.rating?.toFixed(1) || "4.3"}
                    </span>

                    {/* 5 stars */}
                    <div className="flex items-center mr-1">
                      {[...Array(5)].map((_, i) => {
                        const rating = loc.rating || 4.3;
                        const filled = i < Math.floor(rating);
                        const halfFilled =
                          i === Math.floor(rating) && rating % 1 >= 0.5;

                        return (
                          <span
                            key={i}
                            className="text-yellow-500"
                            style={{ fontSize: "12px" }}
                          >
                            {filled ? (
                              <IoStar />
                            ) : halfFilled ? (
                              <IoStarHalf />
                            ) : (
                              <IoStarOutline className="text-gray-300" />
                            )}
                          </span>
                        );
                      })}
                      <span className="text-sm text-gray-600 ml-1">
                        (
                        {loc.reviewCount || (locationReviews[loc.id]?.length || 0)}
                        )
                      </span>
                    </div>
                  </div>
                </div>

                {/* Restaurant type and address */}
                <div className="mb-1">
                  <div className="flex items-center text-sm text-gray-600">
                    <span>Restaurant</span>
                    <span className="mx-1">·</span>
                    <span className="truncate">{loc.address}</span>
                  </div>
                </div>

                {/* Open/closed status */}
                <div className="mb-2">
                  <span>
                    <span
                      className={`font-normal ${
                        loc.isOpenNow ? "text-green-700" : "text-red-600"
                      }`}
                    >
                      {loc.isOpenNow ? "Open" : "Closed"}
                    </span>
                    <span className="font-normal text-gray-600">
                      {loc.isOpenNow
                        ? " ⋅ Closes 11 pm ⋅ Reopens 7 am"
                        : " ⋅ Opens 7 am"}
                    </span>
                  </span>
                </div>
              </div>

              {/* Right side */}
              <div
                className="flex-shrink-0"
                style={{ width: "84px", height: "84px" }}
              >
                <div className="relative overflow-hidden rounded-lg w-full h-full">
                  {loc.images && loc.images.length > 0 ? (
                    <Image
                      src={loc.images[0]}
                      alt=""
                      width={84}
                      height={84}
                      className="absolute inset-0 w-full h-full object-cover"
                      unoptimized
                      decoding="async"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-orange-500 text-2xl mb-1">🍲</div>
                        <div className="text-xs text-orange-700 font-medium">
                          Amala
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Review snippet section - Google Maps style */}
          <div className="px-4 pb-4">
            <div className="flex items-start">
              {(() => {
                const review = getLatestReview(loc.id);
                if (!review) {
                  return (
                    <div className="text-sm text-gray-500 italic">
                      No reviews available yet
                    </div>
                  );
                }

                return (
                  <>
                    <div className="w-4 h-4 rounded-full bg-gray-300 flex-shrink-0 mr-2 mt-0.5 overflow-hidden">
                      {review.author_photo ? (
                        <Image
                          src={review.author_photo}
                          alt=""
                          width={16}
                          height={16}
                          className="w-full h-full object-cover rounded-full"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-purple-500"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-gray-600 italic leading-tight">
                        &ldquo;
                        {review.text.length > 120
                          ? review.text.substring(0, 120) + "..."
                          : review.text}
                        &rdquo;
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {review.author} •{" "}
                        {review.publish_time_description || "Recently"}
                        {review.source === "google-places-api" && " • Google"}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
