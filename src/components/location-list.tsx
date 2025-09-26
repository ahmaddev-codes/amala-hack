"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { IoStar, IoStarHalf, IoStarOutline } from "react-icons/io5";
import { AmalaLocation, Review } from "@/types/location";
import { useMultipleLocationReviews } from "@/hooks/useLocationReviews";

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
  // Use the new hook for consistent review data
  const locationIds = locations.map(loc => loc.id);
  const { data: reviewsData, loading: reviewsLoading } = useMultipleLocationReviews(locationIds);

  const getLatestReview = (locationId: string): Review | null => {
    const locationData = reviewsData[locationId];
    if (!locationData || locationData.reviews.length === 0) return null;
    
    // Return the most recent review
    return locationData.reviews.sort((a, b) => {
      const dateA = a.date_posted ? new Date(a.date_posted).getTime() : 0;
      const dateB = b.date_posted ? new Date(b.date_posted).getTime() : 0;
      return dateB - dateA;
    })[0];
  };

  // Get real rating and review count for a location
  const getLocationStats = (locationId: string) => {
    const locationData = reviewsData[locationId];
    return {
      rating: locationData?.averageRating || 0,
      reviewCount: locationData?.reviewCount || 0,
      hasRealData: !!locationData && !locationData.loading
    };
  };

  const getCurrentHours = (location: AmalaLocation): string | null => {
    if (!location.hours) return null;
    
    const today = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[today.getDay()];
    
    const todayHours = location.hours[currentDay];
    if (!todayHours) return null;
    
    if (!todayHours.isOpen) return "Closed today";
    
    return `${todayHours.open} - ${todayHours.close}`;
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

                {/* Rating section - show real data or 0 if no reviews */}
                {(() => {
                  const stats = getLocationStats(loc.id);
                  const { rating, reviewCount, hasRealData } = stats;
                  
                  // Always show rating section, but display 0 if no real data
                  return (
                    <div className="mb-1">
                      <div className="flex items-center">
                        {rating > 0 ? (
                          <>
                            <span className="text-sm font-medium text-gray-900 mr-1">
                              {rating.toFixed(1)}
                            </span>
                            {/* 5 stars */}
                            <div className="flex items-center mr-1">
                              {[...Array(5)].map((_, i) => {
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
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="text-sm font-medium text-gray-500 mr-1">
                              0.0
                            </span>
                            {/* 5 empty stars */}
                            <div className="flex items-center mr-1">
                              {[...Array(5)].map((_, i) => (
                                <span
                                  key={i}
                                  className="text-gray-300"
                                  style={{ fontSize: "12px" }}
                                >
                                  <IoStarOutline />
                                </span>
                              ))}
                            </div>
                          </>
                        )}
                        <span className="text-sm text-gray-600 ml-1">
                          ({reviewCount})
                        </span>
                      </div>
                    </div>
                  );
                })()}

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
                    {/* Only show hours if we have real data */}
                    {(() => {
                      const currentHours = getCurrentHours(loc);
                      return currentHours && (
                        <span className="font-normal text-gray-600">
                          {" ⋅ " + currentHours}
                        </span>
                      );
                    })()}
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
                      {review.user_photo ? (
                        <Image
                          src={review.user_photo}
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
                        {review.text && review.text.length > 120
                          ? review.text.substring(0, 120) + "..."
                          : review.text || "Great place!"}
                        &rdquo;
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {review.user_name || review.author || "Anonymous"} •{" "}
                        {review.date_posted ? new Date(review.date_posted).toLocaleDateString() : "Recently"}
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
