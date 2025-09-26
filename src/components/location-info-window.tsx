"use client";

import {
  StarIcon as Star,
  ClockIcon as Clock,
  PhoneIcon as Phone,
  GlobeAltIcon as Globe,
  MapPinIcon as MapPin,
  ArrowTopRightOnSquareIcon as Navigation,
  ShareIcon as Share2,
  HeartIcon as Heart,
  CameraIcon as Camera,
  CurrencyDollarIcon as DollarSign,
  ChatBubbleLeftEllipsisIcon as RateReview,
} from "@heroicons/react/24/outline";
import React from "react";
import { AmalaLocation } from "@/types/location";
import { formatPriceRange } from "@/lib/currency-utils";
import { useToast } from "@/contexts/ToastContext";
import Image from "next/image";
import { trackEvent } from "@/lib/utils";
import { useState } from "react";
import { ReviewSubmission } from "./review-submission";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useLocationReviews } from "@/hooks/useLocationReviews";

interface LocationInfoWindowProps {
  location: AmalaLocation;
  onDirections?: () => void;
  onShare?: () => void;
  onSave?: () => void;
}

export function LocationInfoWindow({ location, onDirections, onShare, onSave }: LocationInfoWindowProps) {
  const { user } = useAuth();
  const { info } = useToast();
  const [showReviewForm, setShowReviewForm] = useState(false);
  
  // Get real review data for this location
  const { reviews, reviewCount, averageRating, loading: reviewsLoading } = useLocationReviews(location.id);
  const handleDirections = () => {
    // Instead of opening external maps, just center the map on this location
    // and show a message about directions
    if (typeof window !== "undefined") {
      info(
        `Directions to ${location.name}\n\n${location.address}\n\nIn a production app, this would show turn-by-turn directions within the map.`,
        "Directions"
      );
    }
    onDirections?.();
    trackEvent({ type: "directions_clicked", id: location.id });
  };

  const handleCall = () => {
    if (location.phone && typeof window !== "undefined") {
      window.open(`tel:${location.phone}`);
    }
  };

  const handleWebsite = () => {
    if (location.website && typeof window !== "undefined") {
      window.open(location.website, "_blank");
    }
  };

  const handleShare = () => {
    // Share location using Web Share API or fallback to clipboard
    if (navigator.share) {
      navigator.share({
        title: location.name,
        text: `Check out ${location.name} - ${location.description || 'Great Amala spot!'}`,
        url: `${window.location.origin}/?location=${location.id}`,
      });
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(`${location.name} - ${location.address}`);
      info("Location details copied to clipboard!", "Shared");
    }
    onShare?.();
    trackEvent({ type: "place_viewed", id: location.id });
  };

  return (
    <div className="w-80 max-w-sm">
      {/* Header Image */}
      <div className="relative h-32 bg-gradient-to-br from-orange-400 to-red-500 rounded-t-lg overflow-hidden">
        {location.images && location.images.length > 0 ? (
          <Image
            src={location.images[0]}
            alt={location.name}
            className="w-full h-full object-cover"
            fill
            unoptimized
            onError={(e) => {
              // Hide the image and show the fallback icon on error
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        ) : null}
        
        {/* Always show fallback icon container, but hide it when image loads successfully */}
        <div className="w-full h-full flex items-center justify-center">
          <Camera className="w-8 h-8 text-white opacity-60" />
        </div>

        {/* Status badge */}
        <div className="absolute top-2 right-2">
          <div
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              location.isOpenNow
                ? "bg-green-500 text-white"
                : "bg-red-500 text-white"
            }`}
          >
            {location.isOpenNow ? "Open" : "Closed"}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 bg-white rounded-b-lg">
        {/* Title and Rating */}
        <div className="mb-3">
          <h3 className="font-semibold text-gray-900 text-lg mb-1">
            {location.name}
          </h3>

          {/* Always show rating section with real data */}
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => {
                const filled = i < Math.floor(averageRating);
                const halfFilled = i === Math.floor(averageRating) && averageRating % 1 >= 0.5;
                
                return (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      filled
                        ? "fill-yellow-400 text-yellow-400"
                        : halfFilled
                        ? "fill-yellow-200 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                );
              })}
            </div>
            <span className="text-sm text-gray-600">
              {averageRating > 0 ? averageRating.toFixed(1) : "0.0"} ({reviewCount} reviews)
            </span>
            {reviewsLoading && (
              <span className="text-xs text-gray-400 ml-1">Loading...</span>
            )}
          </div>
        </div>

        {/* Price and Service Type */}
        <div className="flex items-center gap-4 mb-3 text-sm">
          <div className="flex items-center gap-1">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span className="font-medium">
              {location.priceInfo || "Price not available"}
            </span>
          </div>
          <span className="text-gray-400">•</span>
          <span className="text-gray-600 capitalize">
            {location.serviceType.replace("-", " ")}
          </span>
        </div>

        {/* Cuisine Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {location.cuisine.slice(0, 3).map((cuisine) => (
            <span
              key={cuisine}
              className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
            >
              {cuisine}
            </span>
          ))}
        </div>

        {/* Description */}
        {location.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {location.description}
          </p>
        )}

        {/* Address */}
        <div className="flex items-start gap-2 mb-3">
          <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <span className="text-sm text-gray-600">{location.address}</span>
        </div>

        {/* Contact Info */}
        <div className="space-y-2 mb-4">
          {location.phone && (
            <button
              onClick={handleCall}
              className="flex items-center gap-2 text-sm text-primary hover:text-primary"
            >
              <Phone className="w-4 h-4" />
              <span>{location.phone}</span>
            </button>
          )}

          {location.website && (
            <button
              onClick={handleWebsite}
              className="flex items-center gap-2 text-sm text-primary hover:text-primary"
            >
              <Globe className="w-4 h-4" />
              <span>Visit website</span>
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={handleDirections}
            className="flex-1 bg-primary hover:bg-primary text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Navigation className="w-4 h-4" />
            Directions
          </button>

          <button
            onClick={handleShare}
            className="px-3 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
            title="Share"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            onClick={onSave}
            className="px-3 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
            title="Save"
          >
            <Heart className="w-4 h-4" />
          </button>
        </div>

        {/* Write Review Button */}
        {user && (
          <button
            onClick={() => setShowReviewForm(true)}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 mb-3"
          >
            <RateReview className="w-4 h-4" />
            Write a Review
          </button>
        )}

        {/* Hours (if available) */}
        {location.hours && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">
                {location.isOpenNow ? "Open now" : "Closed"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Review Form Modal */}
      {showReviewForm && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center p-4 sm:p-6 z-50">
          <ReviewSubmission
            location={location}
            onSubmitted={() => {
              setShowReviewForm(false);
              // The useLocationReviews hook will automatically refresh the data
            }}
            onCancel={() => setShowReviewForm(false)}
          />
        </div>
      )}
    </div>
  );
}

// Helper function to create HTML content for Google Maps InfoWindow
export function createInfoWindowContent(location: AmalaLocation): string {
  const ratingStars = location.rating
    ? Array.from({ length: 5 }, (_, i) =>
        i < Math.floor(location.rating!) ? "★" : "☆"
      ).join("")
    : "";

  const reviewsPreview =
    location.reviews && location.reviews.length > 0
      ? `
      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e8eaed;">
        <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #202124;">Recent Reviews</h4>
        ${location.reviews
          .slice(0, 2)
          .map(
            (review) => `
          <div style="margin-bottom: 8px; padding: 8px; background: #f8f9fa; border-radius: 8px; font-size: 12px;">
            <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
              <span style="color: #fbbc04;">${"★".repeat(
                review.rating
              )}${"☆".repeat(5 - review.rating)}</span>
              <span style="color: #5f6368;">by ${review.author}</span>
            </div>
            <p style="margin: 0; color: #5f6368; line-height: 1.3;">${
              review.text
            }</p>
          </div>
        `
          )
          .join("")}
        ${
          location.reviews.length > 2
            ? `<p style="margin: 4px 0 0 0; text-align: center; font-size: 12px; color: #5f6368;">... and ${
                location.reviews.length - 2
              } more</p>`
            : ""
        }
      </div>
    `
      : "";

  const hoursPreview = location.hours
    ? `
      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e8eaed;">
        <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #202124;">Hours</h4>
        <div style="font-size: 12px; color: #5f6368;">
          ${Object.entries(location.hours)
            .slice(0, 3)
            .map(
              ([day, hours]) => `
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
              <span style="text-transform: capitalize;">${day}</span>
              <span>${hours.open} - ${hours.close}</span>
            </div>
          `
            )
            .join("")}
          ${
            Object.keys(location.hours).length > 3
              ? '<p style="margin: 4px 0 0 0; text-align: center; font-size: 12px; color: #5f6368;">... view all</p>'
              : ""
          }
        </div>
      </div>
    `
    : "";

  const websiteButton = location.website
    ? `
      <a href="${location.website}" target="_blank"
         style="border: 1px solid #dadce0; color: #1a73e8; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 14px; display: inline-block; margin-top: 8px;">
        Website
      </a>
    `
    : "";

  return `
    <div style="width: 320px; max-height: 400px; overflow-y: auto; font-family: 'Google Sans', sans-serif; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
      <div style="padding: 16px;">
        <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #202124;">
          ${location.name}
        </h3>
        
        ${
          location.rating
            ? `
          <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 8px;">
            <span style="color: #fbbc04; font-size: 16px;">${ratingStars}</span>
            <span style="font-size: 14px; color: #5f6368;">${location.rating} (${location.reviewCount})</span>
          </div>
        `
            : ""
        }
        
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 14px;">
          <span style="font-weight: 500; color: #137333;">${
            location.priceInfo || "Price not available"
          }</span>
          <span style="color: #5f6368;">•</span>
          <span style="color: #5f6368; text-transform: capitalize;">${location.serviceType.replace(
            "-",
            " "
          )}</span>
        </div>
        
        <div style="margin-bottom: 8px;">
          ${location.cuisine
            .slice(0, 3)
            .map(
              (cuisine) =>
                `<span style="display: inline-block; padding: 4px 8px; background: #f1f3f4; color: #5f6368; border-radius: 12px; font-size: 12px; margin-right: 4px;">${cuisine}</span>`
            )
            .join("")}
        </div>
        
        ${
          location.description
            ? `
          <p style="margin: 8px 0; font-size: 14px; color: #5f6368; line-height: 1.4;">
            ${location.description}
          </p>
        `
            : ""
        }
        
        <div style="margin: 8px 0; font-size: 14px; color: #5f6368;">
          📍 ${location.address}
        </div>
        
        <div style="display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap;">
          <a href="https://www.google.com/maps/dir/?api=1&destination=${
            location.coordinates.lat
          },${location.coordinates.lng}"
             target="_blank"
             style="background: #1a73e8; color: white; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">
            Directions
          </a>
          ${
            location.phone
              ? `
            <a href="tel:${location.phone}"
               style="border: 1px solid #dadce0; color: #1a73e8; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 14px;">
              Call
            </a>
          `
              : ""
          }
          ${websiteButton}
        </div>
        
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e8eaed; font-size: 12px; color: #5f6368;">
          <span style="display: inline-flex; align-items: center; gap: 4px;">
            🕒 ${location.isOpenNow ? "Open now" : "Closed"}
          </span>
        </div>

        ${hoursPreview}
        ${reviewsPreview}
      </div>
    </div>
  `;
}
