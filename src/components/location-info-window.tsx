"use client";

import {
  Star,
  Clock,
  Phone,
  Globe,
  MapPin,
  Navigation,
  Share2,
  Heart,
  Camera,
  DollarSign,
} from "lucide-react";
import { AmalaLocation } from "@/types/location";
import {
  shareLocationWithDirections,
} from "@/lib/directions";
import Image from "next/image";

interface LocationInfoWindowProps {
  location: AmalaLocation;
  onDirections?: () => void;
  onShare?: () => void;
  onSave?: () => void;
}

export function LocationInfoWindow({
  location,
  onDirections,
  onShare,
  onSave,
}: LocationInfoWindowProps) {
  const handleDirections = () => {
    // Instead of opening external maps, just center the map on this location
    // and show a message about directions
    if (typeof window !== "undefined") {
      alert(`Directions to ${location.name}\n\n${location.address}\n\nIn a production app, this would show turn-by-turn directions within the map.`);
    }
    onDirections?.();
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
    shareLocationWithDirections(location);
    onShare?.();
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
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Camera className="w-8 h-8 text-white opacity-60" />
          </div>
        )}

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

          {location.rating && (
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.floor(location.rating!)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">
                {location.rating} ({location.reviewCount} reviews)
              </span>
            </div>
          )}
        </div>

        {/* Price and Service Type */}
        <div className="flex items-center gap-4 mb-3 text-sm">
          <div className="flex items-center gap-1">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span className="font-medium">{location.priceRange}</span>
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
        <div className="flex gap-2">
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

  return `
    <div style="width: 280px; font-family: 'Product Sans', 'Inter', sans-serif;">
      <div style="padding: 12px;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #202124;">
          ${location.name}
        </h3>
        
        ${
          location.rating
            ? `
          <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 8px;">
            <span style="color: #fbbc04; font-size: 14px;">${ratingStars}</span>
            <span style="font-size: 14px; color: #5f6368;">${location.rating} (${location.reviewCount})</span>
          </div>
        `
            : ""
        }
        
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 14px;">
          <span style="font-weight: 500; color: #137333;">${
            location.priceRange
          }</span>
          <span style="color: #5f6368;">•</span>
          <span style="color: #5f6368; text-transform: capitalize;">
            ${location.serviceType.replace("-", " ")}
          </span>
        </div>
        
        <div style="margin-bottom: 8px;">
          ${location.cuisine
            .slice(0, 3)
            .map(
              (cuisine) =>
                `<span style="display: inline-block; padding: 2px 8px; background: #f1f3f4; color: #5f6368; border-radius: 12px; font-size: 12px; margin-right: 4px;">${cuisine}</span>`
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
        
        <div style="display: flex; gap: 8px; margin-top: 12px;">
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
        </div>
        
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e8eaed; font-size: 12px; color: #5f6368;">
          <span style="display: inline-flex; align-items: center; gap: 4px;">
            🕒 ${location.isOpenNow ? "Open now" : "Closed"}
          </span>
        </div>
      </div>
    </div>
  `;
}
