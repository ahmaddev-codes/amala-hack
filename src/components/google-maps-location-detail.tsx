"use client";

import React, { useState } from "react";
import { AmalaLocation } from "@/types/location";
import {
  Star,
  Phone,
  Globe,
  MapPin,
  Clock,
  Share as ShareIcon,
  Bookmark,
  Camera,
  Navigation as Directions,
  MoreHorizontal,
  X,
  ThumbsUp,
  ThumbsDown,
  ArrowUpDown as Sort,
  SlidersHorizontal as Filter,
  ChevronLeft,
  ChevronRight,
  Plus as Add,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import Image from "next/image";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useToast } from "@/contexts/ToastContext";
import { ReviewSubmission } from "./review-submission";

interface GoogleMapsLocationDetailProps {
  location: AmalaLocation;
  onClose?: () => void;
  onDirections?: () => void;
  onCall?: () => void;
  onShare?: () => void;
  onSave?: () => void;
}

export function GoogleMapsLocationDetail({
  location,
  onClose,
  onDirections,
  onCall,
  onShare,
  onSave,
}: GoogleMapsLocationDetailProps) {
  const { user, isLoading } = useAuth();
  const { success, error, info } = useToast();
  const [activeTab, setActiveTab] = useState<
    "overview" | "reviews" | "photos" | "about"
  >("overview");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [reviewSort, setReviewSort] = useState("newest");
  const [reviewFilter, setReviewFilter] = useState("all");
  const [showReviewForm, setShowReviewForm] = useState(false);

  // Format price display locally without server-side service
  const formatPrice = (min: number, max: number, currency: string = "USD") => {
    const currencySymbols: Record<string, string> = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      NGN: "₦",
      CAD: "C$",
    };

    const symbol = currencySymbols[currency] || currency;
    const priceSymbols = `${symbol}${min}-${symbol}${max}`;

    // Determine price level (number of dollar signs)
    let priceLevel = "$$";
    if (max <= 10) priceLevel = "$";
    else if (max >= 50) priceLevel = "$$$";
    else if (max >= 100) priceLevel = "$$$$";

    return { priceSymbols, priceLevel };
  };

  const { priceLevel } =
    location.priceMin && location.priceMax
      ? formatPrice(
          location.priceMin,
          location.priceMax,
          location.currency || "USD"
        )
      : { priceLevel: "$$" };

  const images = location.images || [];
  const reviews = location.reviews || [];

  const handleReviewSubmit = () => {
    success("Review submitted successfully!", "Thank you for your feedback");
    // In a real app, this would refresh the reviews list
  };

  const TabButton = ({
    tab,
    label,
    isActive,
    onClick,
  }: {
    tab: string;
    label: string;
    isActive: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        isActive
          ? "text-primary border-primary"
          : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
      }`}
    >
      {label}
    </button>
  );

  const renderOverview = () => (
    <div className="space-y-4">
      {/* Action Buttons Row */}
      <div className="grid grid-cols-3 gap-3">
        <Button
          onClick={onDirections}
          className="flex flex-col items-center gap-1 h-auto p-3 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Directions className="w-5 h-5" />
          <span className="text-xs">Directions</span>
        </Button>
        <Button
          onClick={onCall}
          variant="outline"
          className="flex flex-col items-center gap-1 h-auto p-3"
          disabled={!location.phone}
        >
          <Phone className="w-5 h-5" />
          <span className="text-xs">Call</span>
        </Button>
        <Button
          onClick={onShare}
          variant="outline"
          className="flex flex-col items-center gap-1 h-auto p-3"
        >
          <ShareIcon className="w-5 h-5" />
          <span className="text-xs">Share</span>
        </Button>
      </div>

      {/* Quick Info */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4" />
          <span>{location.isOpenNow ? "Open now" : "Closed"}</span>
          {location.hours &&
            location.hours[
              new Date().toLocaleDateString("en-US", { weekday: "long" })
            ] && (
              <span>
                • Closes{" "}
                {
                  location.hours[
                    new Date().toLocaleDateString("en-US", { weekday: "long" })
                  ].close
                }
              </span>
            )}
        </div>

        {location.address && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>{location.address}</span>
          </div>
        )}

        {location.phone && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone className="w-4 h-4" />
            <span>{location.phone}</span>
          </div>
        )}

        {location.website && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Globe className="w-4 h-4" />
            <a
              href={location.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Visit website
            </a>
          </div>
        )}
      </div>

      {/* Features */}
      {location.features && location.features.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Features</h4>
          <div className="flex flex-wrap gap-2">
            {location.features.map((feature, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {feature}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* About */}
      {location.description && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">About</h4>
          <p className="text-sm text-gray-600 leading-relaxed">
            {location.description}
          </p>
        </div>
      )}
    </div>
  );

  const renderReviews = () => (
    <div className="space-y-4">
      {/* Add Review Button */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">
          Reviews ({reviews.length})
        </h3>
        <Button
          onClick={() => {
            if (!user) {
              error(
                "Please sign in to write a review",
                "Authentication Required"
              );
              return;
            }
            setShowReviewForm(true);
          }}
          size="sm"
          className="flex items-center gap-2"
        >
          <Add className="w-4 h-4" />
          Write a review
        </Button>
      </div>

      {/* Review Controls */}
      <div className="flex items-center gap-4 py-2 border-b">
        <div className="flex items-center gap-2">
          <Sort className="w-4 h-4 text-gray-500" />
          <select
            value={reviewSort}
            onChange={(e) => setReviewSort(e.target.value)}
            className="text-sm border-none bg-transparent focus:outline-none"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="highest">Highest rated</option>
            <option value="lowest">Lowest rated</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={reviewFilter}
            onChange={(e) => setReviewFilter(e.target.value)}
            className="text-sm border-none bg-transparent focus:outline-none"
          >
            <option value="all">All reviews</option>
            <option value="5">5 stars</option>
            <option value="4">4 stars</option>
            <option value="3">3 stars</option>
            <option value="2">2 stars</option>
            <option value="1">1 star</option>
          </select>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length > 0 ? (
          reviews.map((review, index) => (
            <div
              key={index}
              className="border-b border-gray-100 pb-4 last:border-b-0"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100">
                  <Image
                    src="/placeholder-image.svg"
                    alt={review.author || "User"}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">
                      {review.author || "Anonymous"}
                    </span>
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(review.date_posted).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {review.text}
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                      <ThumbsUp className="w-3 h-3" />
                      Helpful
                    </button>
                    <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                      <ThumbsDown className="w-3 h-3" />
                      Not helpful
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No reviews yet</p>
            <p className="text-sm mt-1">Be the first to write a review!</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderPhotos = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Photos ({images.length})</h3>
        <Button 
          size="sm" 
          variant="outline" 
          className="flex items-center gap-2"
          onClick={() => {
            if (!user) {
              error("Please sign in to upload photos", "Authentication Required");
              return;
            }
            info("Photo upload feature coming soon!", "Upload Photos");
          }}
        >
          <Camera className="w-4 h-4" />
          Add photos
        </Button>
      </div>

      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {images.map((image: string, index: number) => (
            <div
              key={index}
              className="aspect-square relative rounded-lg overflow-hidden cursor-pointer hover:opacity-90"
              onClick={() => setCurrentImageIndex(index)}
            >
              <Image
                src={image}
                alt={`Photo ${index + 1}`}
                fill
                className="object-cover"
                onError={(e) => {
                  console.log("Photo failed to load:", e.currentTarget.src);
                  e.currentTarget.src = "/placeholder-image.svg";
                }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Camera className="w-8 h-8 text-gray-400" />
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">No photos yet</h4>
          <p className="text-gray-500 mb-4">Be the first to share photos of this place!</p>
          <Button 
            onClick={() => {
              if (!user) {
                error("Please sign in to upload photos", "Authentication Required");
                return;
              }
              info("Photo upload feature coming soon!", "Upload Photos");
            }}
            className="flex items-center gap-2"
          >
            <Camera className="w-4 h-4" />
            Upload photos
          </Button>
        </div>
      )}
    </div>
  );

  const renderAbout = () => (
    <div className="space-y-4">
      <h3 className="font-medium text-gray-900">About</h3>

      {/* Restaurant Details */}
      <div className="space-y-3">
        {location.cuisine && (
          <div>
            <span className="text-sm font-medium text-gray-700">Cuisine: </span>
            <span className="text-sm text-gray-600">
              {Array.isArray(location.cuisine)
                ? location.cuisine.join(", ")
                : location.cuisine}
            </span>
          </div>
        )}

        {location.serviceType && (
          <div>
            <span className="text-sm font-medium text-gray-700">Service: </span>
            <span className="text-sm text-gray-600 capitalize">
              {location.serviceType.replace("-", " ")}
            </span>
          </div>
        )}

        {(location.priceMin || location.priceMax || location.priceInfo) && (
          <div>
            <span className="text-sm font-medium text-gray-700">
              Price range:{" "}
            </span>
            <span className="text-sm text-gray-600">
              {location.priceInfo || priceLevel}
            </span>
          </div>
        )}

        {location.features && location.features.length > 0 && (
          <div>
            <span className="text-sm font-medium text-gray-700">
              Features:{" "}
            </span>
            <span className="text-sm text-gray-600">
              {location.features.join(", ").replace(/-/g, " ")}
            </span>
          </div>
        )}
      </div>

      {/* Description */}
      {location.description && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Description
          </h4>
          <p className="text-sm text-gray-600 leading-relaxed">
            {location.description}
          </p>
        </div>
      )}

      {/* Hours */}
      {location.hours && Object.keys(location.hours).length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Hours</h4>
          <div className="text-sm text-gray-600 space-y-1">
            {Object.entries(location.hours).map(([day, hours]) => (
              <div key={day} className="flex justify-between">
                <span className="capitalize">{day}:</span>
                <span>
                  {hours.open} - {hours.close}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onSave}>
            <Bookmark className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Hero Image */}
      <div className="relative h-48 flex-shrink-0">
        <Image
          src={
            images.length > 0 && images[currentImageIndex]
              ? images[currentImageIndex]
              : images.length > 0 && images[0]
              ? images[0]
              : "/placeholder-image.svg"
          }
          alt={location.name}
          fill
          className="object-cover"
          onError={(e) => {
            console.log("Image failed to load:", e.currentTarget.src);
            e.currentTarget.src = "/placeholder-image.svg";
          }}
        />
        {images.length > 1 && (
          <>
            <button
              onClick={() =>
                setCurrentImageIndex(Math.max(0, currentImageIndex - 1))
              }
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1 bg-white/80 rounded-full hover:bg-white"
              disabled={currentImageIndex === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() =>
                setCurrentImageIndex(
                  Math.min(images.length - 1, currentImageIndex + 1)
                )
              }
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-white/80 rounded-full hover:bg-white"
              disabled={currentImageIndex === images.length - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
        {/* Image indicator */}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentImageIndex ? "bg-white" : "bg-white/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Location Info */}
      <div className="p-4 border-b flex-shrink-0">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          {location.name}
        </h1>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">{location.rating || "4.5"}</span>
            <span>({reviews.length})</span>
          </div>
          <span>•</span>
          <span>{priceLevel}</span>
          <span>•</span>
          <span className="capitalize">
            {Array.isArray(location.cuisine)
              ? location.cuisine[0]
              : location.cuisine || "Nigerian"}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b flex-shrink-0">
        <div className="flex">
          <TabButton
            tab="overview"
            label="Overview"
            isActive={activeTab === "overview"}
            onClick={() => setActiveTab("overview")}
          />
          <TabButton
            tab="reviews"
            label={`Reviews (${reviews.length})`}
            isActive={activeTab === "reviews"}
            onClick={() => setActiveTab("reviews")}
          />
          <TabButton
            tab="photos"
            label={`Photos (${images.length})`}
            isActive={activeTab === "photos"}
            onClick={() => setActiveTab("photos")}
          />
          <TabButton
            tab="about"
            label="About"
            isActive={activeTab === "about"}
            onClick={() => setActiveTab("about")}
          />
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4">
          {activeTab === "overview" && renderOverview()}
          {activeTab === "reviews" && renderReviews()}
          {activeTab === "photos" && renderPhotos()}
          {activeTab === "about" && renderAbout()}
        </div>
      </div>

      {/* Review Form Modal */}
      {showReviewForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <ReviewSubmission
              location={location}
              onSubmitted={() => {
                setShowReviewForm(false);
                success("Review submitted successfully!", "Thank you for your feedback");
                // TODO: Refresh reviews list
              }}
              onCancel={() => setShowReviewForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
