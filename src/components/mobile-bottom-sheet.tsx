"use client";

import { useState, useEffect, useRef } from "react";
import {
  ChevronUpIcon as ChevronUp,
  ChevronDownIcon as ChevronDown,
  XMarkIcon as X,
  PhoneIcon as Phone,
  GlobeAltIcon as Globe,
  StarIcon as Star,
  ClockIcon as Clock,
  MapPinIcon as MapPin,
  ArrowTopRightOnSquareIcon as Navigation,
  ShareIcon as Share,
  HeartIcon as Heart,
  CameraIcon as Camera,
  CurrencyDollarIcon as DollarSign,
  ChatBubbleLeftEllipsisIcon as RateReview,
} from "@heroicons/react/24/outline";
import { AmalaLocation, Review } from "@/types/location";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { ReviewSubmission } from "./review-submission";
import Image from "next/image";
import { trackEvent } from "@/lib/utils";
import { TabContentLoader } from "@/components/ui/loading-spinner";
import { useLocationReviews } from "@/hooks/useLocationReviews";

interface MobileBottomSheetProps {
  locations: AmalaLocation[];
  selectedLocation: AmalaLocation | null;
  onLocationSelect: (location: AmalaLocation) => void;
  onClose?: () => void;
  isSearchActive?: boolean;
}

type SheetState = "collapsed" | "peek" | "expanded";

export function MobileBottomSheet({
  locations,
  selectedLocation,
  onLocationSelect,
  onClose,
  isSearchActive = false,
}: MobileBottomSheetProps) {
  const { user } = useAuth();
  const { info } = useToast();
  const [sheetState, setSheetState] = useState<SheetState>("peek");
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  
  // Get real review data for selected location
  const { reviews, reviewCount, averageRating, loading: reviewsLoading } = useLocationReviews(
    selectedLocation?.id || ""
  );
  const [windowHeight, setWindowHeight] = useState(600); // Default height
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "reviews" | "photos">("overview");
  const sheetRef = useRef<HTMLDivElement>(null);

  // Set window height on client side
  useEffect(() => {
    if (typeof window !== "undefined") {
      setWindowHeight(window.innerHeight);

      const handleResize = () => {
        setWindowHeight(window.innerHeight);
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  // Heights for different states
  const heights = {
    collapsed: 0,
    peek: Math.min(200, windowHeight * 0.25), // More flexible for different screen sizes
    expanded: Math.min(windowHeight * 0.75, windowHeight - 100), // Leave space for header
  };

  const getSheetHeight = () => {
    switch (sheetState) {
      case "collapsed":
        return heights.collapsed;
      case "peek":
        return heights.peek;
      case "expanded":
        return heights.expanded;
      default:
        return heights.peek;
    }
  };

  // Touch handlers for swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const deltaY = currentY - startY;
    const threshold = 50;

    if (deltaY > threshold) {
      // Swipe down
      if (sheetState === "expanded") {
        setSheetState("peek");
      } else if (sheetState === "peek") {
        setSheetState("collapsed");
      }
    } else if (deltaY < -threshold) {
      // Swipe up
      if (sheetState === "collapsed") {
        setSheetState("peek");
      } else if (sheetState === "peek") {
        setSheetState("expanded");
      }
    }
  };

  // Mouse handlers for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartY(e.clientY);
    setCurrentY(e.clientY);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    setCurrentY(e.clientY);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const deltaY = currentY - startY;
    const threshold = 50;

    if (deltaY > threshold) {
      if (sheetState === "expanded") {
        setSheetState("peek");
      } else if (sheetState === "peek") {
        setSheetState("collapsed");
      }
    } else if (deltaY < -threshold) {
      if (sheetState === "collapsed") {
        setSheetState("peek");
      } else if (sheetState === "peek") {
        setSheetState("expanded");
      }
    }
  };

  // Add mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, currentY, startY]);


  // Auto-expand when location is selected and reset when search is cleared
  useEffect(() => {
    if (selectedLocation && sheetState === "collapsed") {
      setSheetState("peek");
    }
  }, [selectedLocation]);

  // Reset to show all locations when search is cleared
  useEffect(() => {
    if (!isSearchActive && !selectedLocation && sheetState === "collapsed") {
      setSheetState("peek");
    }
  }, [isSearchActive, selectedLocation, sheetState]);


  // Handle action buttons
  const handleDirections = () => {
    if (selectedLocation) {
      info(
        `Directions to ${selectedLocation.name}\n\n${selectedLocation.address}\n\nIn a production app, this would show turn-by-turn directions within the map.`,
        "Directions"
      );
      trackEvent({ type: "directions_clicked", id: selectedLocation.id });
    }
  };

  const handleCall = () => {
    if (selectedLocation?.phone && typeof window !== "undefined") {
      window.open(`tel:${selectedLocation.phone}`);
    }
  };

  const handleWebsite = () => {
    if (selectedLocation?.website && typeof window !== "undefined") {
      window.open(selectedLocation.website, "_blank");
    }
  };

  const handleShare = () => {
    if (!selectedLocation) return;
    
    if (navigator.share) {
      navigator.share({
        title: selectedLocation.name,
        text: `Check out ${selectedLocation.name} - ${selectedLocation.description || 'Great Amala spot!'}`,
        url: `${window.location.origin}/?location=${selectedLocation.id}`,
      });
    } else {
      navigator.clipboard.writeText(`${selectedLocation.name} - ${selectedLocation.address}`);
      info("Location details copied to clipboard!", "Shared");
    }
    trackEvent({ type: "place_viewed", id: selectedLocation.id });
  };

  if (locations.length === 0) return null;

  return (
    <>
      {/* Backdrop for expanded state */}
      {sheetState === "expanded" && (
        <div
          className="fixed inset-0 z-40 bg-white bg-opacity-60 backdrop-blur-sm transition-all duration-300"
          onClick={() => setSheetState("peek")}
        />
      )}

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-2 right-2 sm:left-4 sm:right-4 bg-white rounded-t-2xl shadow-2xl z-50 transition-transform duration-300 ease-out"
        style={{
          transform: `translateY(${
            isDragging ? Math.max(0, currentY - startY) : 0
          }px)`,
          height: `${getSheetHeight()}px`,
        }}
      >
        {/* Handle */}
        <div
          className="flex justify-center py-3 cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
        >
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 pb-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-base">
                {selectedLocation ? selectedLocation.name : "Amala Spots"}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-gray-600">
                  {locations.length}{" "}
                  {locations.length === 1 ? "location" : "locations"}
                </p>
                {!selectedLocation && (
                  <>
                    <span className="text-gray-400">•</span>
                    <p className="text-sm text-primary">Tap to explore</p>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {sheetState !== "expanded" && (
                <button
                  onClick={() => setSheetState("expanded")}
                  className="p-2 hover:bg-white rounded-full transition-colors"
                  title="View all locations"
                >
                  <ChevronUp className="w-5 h-5 text-gray-600" />
                </button>
              )}

              {sheetState === "expanded" && (
                <button
                  onClick={() => setSheetState("peek")}
                  className="p-2 hover:bg-white rounded-full transition-colors"
                  title="Minimize"
                >
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                </button>
              )}

              <button
                onClick={() => setSheetState("collapsed")}
                className="p-2 hover:bg-white rounded-full transition-colors"
                title="Close"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div
          className={
            sheetState === "expanded"
              ? "flex-1 h-full overflow-y-auto"
              : "flex-1 overflow-hidden"
          }
        >
          {sheetState === "peek" && (
            <div className="p-4 space-y-3">
              {selectedLocation ? (
                <div className="space-y-3">
                  {/* Main Info */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 text-base">
                        {selectedLocation.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="text-sm text-gray-600">
                          4.5 (234 reviews)
                        </span>
                        <span className="text-sm font-medium text-gray-800">
                          {selectedLocation.priceInfo || "Pricing available"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          selectedLocation.isOpenNow
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {selectedLocation.isOpenNow ? "Open Now" : "Closed"}
                      </span>
                    </div>
                  </div>

                  {/* Address and Service Type */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <p className="text-sm text-gray-600 flex-1">
                        {selectedLocation.address}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600 capitalize">
                        {selectedLocation.serviceType.replace("-", " ")} service
                      </span>
                    </div>
                  </div>

                  {/* Cuisine Tags */}
                  <div className="flex flex-wrap gap-2">
                    {selectedLocation.cuisine
                      ?.slice(0, 3)
                      .map((cuisine, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-primary/5 text-primary text-xs rounded-full"
                        >
                          {cuisine}
                        </span>
                      ))}
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <button className="flex-1 bg-primary text-white py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                      <Navigation className="w-4 h-4" />
                      Directions
                    </button>
                    <button className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <Phone className="w-4 h-4 text-gray-600" />
                    </button>
                    <button className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <Share className="w-4 h-4 text-gray-600" />
                    </button>
                    <button className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <Heart className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 font-medium">
                    Tap a location on the map
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Discover amazing Amala spots near you
                  </p>
                </div>
              )}
            </div>
          )}

          {sheetState === "expanded" && (
            <div className="h-full overflow-y-auto">
              {selectedLocation ? (
                <div className="pb-6">
                  {/* Header Image */}
                  <div className="relative h-48 bg-gradient-to-br from-orange-400 to-red-500 overflow-hidden">
                    {selectedLocation.images && selectedLocation.images.length > 0 ? (
                      <Image
                        src={selectedLocation.images[0]}
                        alt={selectedLocation.name}
                        className="w-full h-full object-cover"
                        fill
                        unoptimized
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    ) : null}
                    
                    <div className="w-full h-full flex items-center justify-center">
                      <Camera className="w-12 h-12 text-white opacity-60" />
                    </div>

                    {/* Status badge */}
                    <div className="absolute top-4 right-4">
                      <div
                        className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                          selectedLocation.isOpenNow
                            ? "bg-green-500 text-white"
                            : "bg-red-500 text-white"
                        }`}
                      >
                        {selectedLocation.isOpenNow ? "Open" : "Closed"}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    {/* Title and Rating */}
                    <div className="mb-4">
                      <h3 className="font-bold text-gray-900 text-xl mb-2">
                        {selectedLocation.name}
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
                          {selectedLocation.priceInfo || "Price not available"}
                        </span>
                      </div>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-600 capitalize">
                        {selectedLocation.serviceType.replace("-", " ")}
                      </span>
                    </div>

                    {/* Cuisine Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {selectedLocation.cuisine?.slice(0, 4).map((cuisine) => (
                        <span
                          key={cuisine}
                          className="inline-block px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full"
                        >
                          {cuisine}
                        </span>
                      ))}
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex border-b border-gray-200 mb-4">
                      <button
                        onClick={() => setActiveTab("overview")}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === "overview"
                            ? "border-orange-500 text-orange-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Overview
                      </button>
                      <button
                        onClick={() => setActiveTab("reviews")}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === "reviews"
                            ? "border-orange-500 text-orange-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Reviews ({reviews.length})
                      </button>
                      <button
                        onClick={() => setActiveTab("photos")}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === "photos"
                            ? "border-orange-500 text-orange-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Photos ({selectedLocation.images?.length || 0})
                      </button>
                    </div>

                    {/* Tab Content */}
                    {activeTab === "overview" && (
                      <div className="space-y-4">
                        {/* Description */}
                        {selectedLocation.description && (
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {selectedLocation.description}
                          </p>
                        )}

                        {/* Address */}
                        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-600 leading-relaxed">{selectedLocation.address}</span>
                        </div>

                        {/* Contact Info */}
                        <div className="space-y-3">
                          {selectedLocation.phone && (
                            <button
                              onClick={handleCall}
                              className="flex items-center gap-3 text-sm text-primary hover:text-primary bg-primary/5 hover:bg-primary/10 p-3 rounded-lg transition-colors w-full"
                            >
                              <Phone className="w-5 h-5" />
                              <span>{selectedLocation.phone}</span>
                            </button>
                          )}

                          {selectedLocation.website && (
                            <button
                              onClick={handleWebsite}
                              className="flex items-center gap-3 text-sm text-primary hover:text-primary bg-primary/5 hover:bg-primary/10 p-3 rounded-lg transition-colors w-full"
                            >
                              <Globe className="w-5 h-5" />
                              <span>Visit website</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {activeTab === "reviews" && (
                      <div className="space-y-4">
                        {reviewsLoading ? (
                          <TabContentLoader message="Loading reviews..." />
                        ) : reviews.length > 0 ? (
                          <div className="space-y-4">
                            {reviews.slice(0, 3).map((review: Review, index: number) => (
                              <div key={index} className="border rounded-lg p-4 bg-white">
                                <div className="flex items-center gap-2 mb-3">
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
                                  <span className="text-sm font-medium text-gray-700">{review.author || 'Anonymous'}</span>
                                  <span className="text-xs text-gray-500">•</span>
                                  <span className="text-xs text-gray-500">
                                    {new Date(review.date_posted).toLocaleDateString()}
                                  </span>
                                </div>
                                {review.text && (
                                  <p className="text-sm text-gray-700 leading-relaxed mb-3">{review.text}</p>
                                )}
                                {review.photos && review.photos.length > 0 && (
                                  <div className="flex gap-2 mt-3">
                                    {review.photos.slice(0, 3).map((photo: string, imgIndex: number) => (
                                      <div key={imgIndex} className="w-16 h-16 rounded-lg overflow-hidden">
                                        <Image
                                          src={photo}
                                          alt={`Review photo ${imgIndex + 1}`}
                                          width={64}
                                          height={64}
                                          className="w-full h-full object-cover"
                                          unoptimized
                                        />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                            {reviews.length > 3 && (
                              <p className="text-center text-sm text-gray-500">
                                ... and {reviews.length - 3} more reviews
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                              <Star className="w-8 h-8 text-gray-400" />
                            </div>
                            <h4 className="text-lg font-medium text-gray-900 mb-2">No reviews yet</h4>
                            <p className="text-sm">Be the first to write a review!</p>
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === "photos" && (
                      <div className="space-y-4">
                        {selectedLocation.images && selectedLocation.images.length > 0 ? (
                          <div className="grid grid-cols-2 gap-3">
                            {selectedLocation.images.map((image: string, index: number) => (
                              <div
                                key={index}
                                className="aspect-square relative rounded-xl overflow-hidden bg-gray-100 border border-gray-200"
                              >
                                <Image
                                  src={image}
                                  alt={`Photo ${index + 1}`}
                                  fill
                                  className="object-cover hover:scale-105 transition-transform duration-200"
                                  unoptimized
                                  onError={(e) => {
                                    console.log("Photo failed to load:", e.currentTarget.src);
                                    e.currentTarget.src = "/placeholder-image.svg";
                                  }}
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all duration-200" />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                              <Camera className="w-8 h-8 text-gray-400" />
                            </div>
                            <h4 className="text-lg font-medium text-gray-900 mb-2">No photos yet</h4>
                            <p className="text-gray-500 mb-4">Be the first to share photos of this place!</p>
                            {user && (
                              <button
                                onClick={() => setShowReviewForm(true)}
                                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                              >
                                Add Photos
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <button
                        onClick={handleDirections}
                        className="col-span-2 bg-primary hover:bg-primary/90 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Navigation className="w-4 h-4" />
                        Directions
                      </button>

                      <button
                        onClick={handleShare}
                        className="px-4 py-3 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors flex items-center justify-center"
                        title="Share"
                      >
                        <Share className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Write Review Button */}
                    {user && (
                      <button
                        onClick={() => setShowReviewForm(true)}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 mb-4"
                      >
                        <RateReview className="w-4 h-4" />
                        Write a Review
                      </button>
                    )}

                    {/* Reviews Section */}
                    {selectedLocation.reviews && selectedLocation.reviews.length > 0 && (
                      <div className="border-t border-gray-200 pt-4">
                        <h4 className="font-semibold text-gray-900 text-lg mb-3">Recent Reviews</h4>
                        <div className="space-y-4">
                          {selectedLocation.reviews.slice(0, 3).map((review, index) => (
                            <div key={index} className="bg-gray-50 p-4 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
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
                                <span className="text-sm text-gray-600 font-medium">{review.author}</span>
                              </div>
                              <p className="text-sm text-gray-700 leading-relaxed">{review.text}</p>
                            </div>
                          ))}
                          {selectedLocation.reviews.length > 3 && (
                            <p className="text-center text-sm text-gray-500">
                              ... and {selectedLocation.reviews.length - 3} more reviews
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Hours */}
                    {selectedLocation.hours && (
                      <div className="border-t border-gray-200 pt-4 mt-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">
                            {selectedLocation.isOpenNow ? "Open now" : "Closed"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {locations.map((location) => (
                    <div
                      key={location.id}
                      className="p-4 cursor-pointer hover:bg-gray-50 transition-colors active:bg-gray-100"
                      onClick={() => {
                        onLocationSelect(location);
                        setSheetState("peek");
                      }}
                    >
                      <div className="flex justify-between items-start gap-3">
                        {/* Location Image */}
                        <div className="flex-shrink-0">
                          {location.images && location.images.length > 0 ? (
                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                              <Image
                                src={location.images[0]}
                                alt={location.name}
                                width={64}
                                height={64}
                                className="w-full h-full object-cover"
                                unoptimized
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                              <Camera className="w-6 h-6 text-white opacity-60" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-gray-900 text-sm truncate">
                              {location.name}
                            </h4>
                            <div
                              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ml-2 ${
                                location.isOpenNow
                                  ? "bg-green-500"
                                  : "bg-red-500"
                              }`}
                            />
                          </div>

                          <div className="flex items-center gap-2 mb-2">
                            {location.rating && (
                              <>
                                <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />
                                <span className="text-xs text-gray-600">{location.rating}</span>
                                <span className="text-xs text-gray-400">•</span>
                              </>
                            )}
                            <span className="text-xs font-medium text-gray-800">
                              {location.priceInfo || "Pricing available"}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-600 capitalize">
                              {location.serviceType.replace("-", " ")}
                            </span>
                          </div>

                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                            {location.address}
                          </p>

                          <div className="flex flex-wrap gap-1 mb-2">
                            {location.cuisine
                              ?.slice(0, 2)
                              .map((cuisine, index) => (
                                <span
                                  key={index}
                                  className="px-1.5 py-0.5 bg-gray-100 text-gray-700 text-xs rounded"
                                >
                                  {cuisine}
                                </span>
                              ))}
                          </div>

                          <div className="flex items-center justify-between">
                            <span
                              className={`text-xs font-medium ${
                                location.isOpenNow
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {location.isOpenNow ? "Open Now" : "Closed"}
                            </span>
                            <div className="flex items-center gap-1">
                              <Navigation className="w-3 h-3 text-primary" />
                              <span className="text-xs text-primary">
                                Directions
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Review Form Modal */}
      {showReviewForm && selectedLocation && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center p-4 sm:p-6 z-[60]">
          <ReviewSubmission
            location={selectedLocation}
            onSubmitted={() => {
              setShowReviewForm(false);
              info("Review submitted successfully!", "Thank you!");
              // The useLocationReviews hook will automatically refresh the data
            }}
            onCancel={() => setShowReviewForm(false)}
          />
        </div>
      )}
    </>
  );
}
