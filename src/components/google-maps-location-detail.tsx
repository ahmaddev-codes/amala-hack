"use client";

import React, { useState, useEffect } from "react";
import { AmalaLocation, Review } from "@/types/location";
import {
  StarIcon as Star,
  PhoneIcon as Phone,
  GlobeAltIcon as Globe,
  MapPinIcon as MapPin,
  ClockIcon as Clock,
  ShareIcon,
  BookmarkIcon as Bookmark,
  CameraIcon as Camera,
  ArrowTopRightOnSquareIcon as Directions,
  EllipsisHorizontalIcon as MoreHorizontal,
  XMarkIcon as X,
  HandThumbUpIcon as ThumbsUp,
  HandThumbDownIcon as ThumbsDown,
  ArrowsUpDownIcon as Sort,
  AdjustmentsHorizontalIcon as Filter,
  ChevronLeftIcon as ChevronLeft,
  ChevronRightIcon as ChevronRight,
  PlusIcon as Add,
  HeartIcon as Heart,
  CurrencyDollarIcon as DollarSign,
  ChatBubbleLeftIcon as RateReview,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useToast } from "@/contexts/ToastContext";
import { ReviewSubmission } from "./review-submission";
import { trackEvent } from "@/lib/utils";
import { TabContentLoader } from "@/components/ui/loading-spinner";

interface GoogleMapsLocationDetailProps {
  location: AmalaLocation;
  onClose?: () => void;
  onDirections?: () => void;
  onCall?: () => void;
  onShare?: () => void;
  onSave?: () => void;
  compact?: boolean;
  variant?: 'full' | 'compact'; // New prop to support both layouts
}

export function GoogleMapsLocationDetail({
  location,
  onClose,
  onDirections,
  onCall,
  onShare,
  onSave,
  compact = false,
  variant = 'full',
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
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [locationPhotos, setLocationPhotos] = useState<any[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);

  // Fetch reviews for this location
  const fetchReviews = async () => {
    if (!location.id) return;
    
    setReviewsLoading(true);
    try {
      const response = await fetch(`/api/reviews?location_id=${location.id}`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setReviewsLoading(false);
    }
  };

  // Fetch photos for this location
  const fetchPhotos = async () => {
    if (!location.id) return;
    
    setPhotosLoading(true);
    try {
      const response = await fetch(`/api/photos?location_id=${location.id}`);
      if (response.ok) {
        const data = await response.json();
        setLocationPhotos(data.photos || []);
      }
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setPhotosLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
    fetchPhotos();
  }, [location.id]);

  // Enhanced action handlers from LocationInfoWindow
  const shareLocationWithDirections = (location: AmalaLocation) => {
    if (navigator.share) {
      navigator.share({
        title: location.name,
        text: `Check out ${location.name} - ${location.description || 'Great Amala restaurant'}`,
        url: `${window.location.origin}/?location=${location.id}`,
      }).catch(console.error);
    } else {
      // Fallback: copy to clipboard
      const shareText = `${location.name}\n${location.address}\n${window.location.origin}/?location=${location.id}`;
      navigator.clipboard.writeText(shareText).then(() => {
        info('Location details copied to clipboard!', 'Shared');
      }).catch(() => {
        info('Unable to share location', 'Share Failed');
      });
    }
  };

  const handleDirections = () => {
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
    onCall?.();
  };

  const handleWebsite = () => {
    if (location.website && typeof window !== "undefined") {
      window.open(location.website, "_blank");
    }
  };

  const handleShare = () => {
    shareLocationWithDirections(location);
    onShare?.();
    trackEvent({ type: "place_viewed", id: location.id });
  };

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
  const locationReviews = location.reviews || [];

  const handleReviewSubmit = async () => {
    try {
      success("Review submitted successfully!", "Thank you for your feedback");
      // Refresh the reviews list to show the new review
      await fetchReviews();
    } catch (error) {
      console.error("Error refreshing reviews after submission:", error);
      // Still show success message since the review was submitted
      // The error is just in refreshing the list
    }
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
          onClick={handleDirections}
          className="flex flex-col items-center gap-1 h-auto p-3 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Directions className="w-5 h-5" />
          <span className="text-xs">Directions</span>
        </Button>
        <Button
          onClick={handleCall}
          variant="outline"
          className="flex flex-col items-center gap-1 h-auto p-3"
          disabled={!location.phone}
        >
          <Phone className="w-5 h-5" />
          <span className="text-xs">Call</span>
        </Button>
        <Button
          onClick={handleShare}
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
            <button
              onClick={handleWebsite}
              className="text-primary hover:underline"
            >
              Visit website
            </button>
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

  const renderReviews = () => {
    if (reviewsLoading) {
      return <TabContentLoader message="Loading reviews..." />;
    }

    return (
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
        {(() => {
          // Filter reviews based on rating
          let filteredReviews = reviewFilter === "all" 
            ? reviews 
            : reviews.filter(review => review.rating === parseInt(reviewFilter));
          
          // Sort reviews
          filteredReviews = [...filteredReviews].sort((a, b) => {
            switch (reviewSort) {
              case "newest":
                return new Date(b.date_posted).getTime() - new Date(a.date_posted).getTime();
              case "oldest":
                return new Date(a.date_posted).getTime() - new Date(b.date_posted).getTime();
              case "highest":
                return b.rating - a.rating;
              case "lowest":
                return a.rating - b.rating;
              default:
                return 0;
            }
          });
          
          return filteredReviews.length > 0 ? (
            filteredReviews.map((review, index) => (
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
                      {review.date_posted ? new Date(review.date_posted).toLocaleDateString() : 'Recently'}
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
              <p>No reviews {reviewFilter !== "all" ? `with ${reviewFilter} stars` : ""}</p>
              <p className="text-sm mt-1">
                {reviewFilter !== "all" 
                  ? `Try changing the filter to see more reviews` 
                  : "Be the first to write a review!"
                }
              </p>
            </div>
          );
        })()}
      </div>
    </div>
    );
  };

  const renderPhotos = () => {
    // Combine location images with uploaded photos
    const allPhotos = [
      ...images.map((url: string) => ({ url, source: 'location' })),
      ...locationPhotos.map((photo: any) => ({ 
        url: photo.cloudinary_url || photo.url, 
        source: 'user',
        user_name: photo.user_name,
        description: photo.description
      }))
    ];

    return (
      <div className="space-y-4">
        {photosLoading && (
          <div className="text-center py-4">
            <div className="text-sm text-gray-500">Loading photos...</div>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">Photos ({allPhotos.length})</h3>
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

        {allPhotos.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {allPhotos.map((photo: any, index: number) => (
              <div
                key={index}
                className="aspect-square relative rounded-lg overflow-hidden cursor-pointer hover:opacity-90 group"
                onClick={() => setCurrentImageIndex(index)}
              >
                <Image
                  src={photo.url}
                  alt={photo.description || `Photo ${index + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                  onError={(e) => {
                    console.log("Photo failed to load:", e.currentTarget.src);
                    e.currentTarget.src = "/placeholder-image.svg";
                  }}
                />
                {photo.source === 'user' && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="text-white text-xs">
                      <div className="font-medium">{photo.user_name}</div>
                      {photo.description && (
                        <div className="text-gray-200 truncate">{photo.description}</div>
                      )}
                    </div>
                  </div>
                )}
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
  };

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

  const renderFullLayout = () => (
    <div className="h-full bg-white overflow-y-auto">
      {/* Header - Sticky */}
      <div className="sticky top-0 z-10 bg-white border-b">
        <div className="flex items-center justify-between p-4">
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
      </div>

      {/* Hero Image */}
      <div className="relative h-48">
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
          unoptimized
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
      <div className="p-4 border-b">
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

      {/* Tab Content - All content flows together */}
      <div className="p-4">
        {activeTab === "overview" && renderOverview()}
        {activeTab === "reviews" && renderReviews()}
        {activeTab === "photos" && renderPhotos()}
        {activeTab === "about" && renderAbout()}
      </div>

      {/* Review Form Modal */}
      {showReviewForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 sm:p-6">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto mx-4 sm:mx-0">
            <ReviewSubmission
              location={location}
              onSubmitted={async () => {
                setShowReviewForm(false);
                // Refresh both reviews and photos after submission
                await fetchReviews();
                await fetchPhotos();
                success("Review submitted successfully!", "Thank you for your feedback");
              }}
              onCancel={() => setShowReviewForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );

  // Compact layout for info windows and mobile bottom sheets
  const renderCompactLayout = () => (
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
                {location.rating} ({reviews.length} reviews)
              </span>
            </div>
          )}
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
            {location.serviceType?.replace("-", " ") || "Restaurant"}
          </span>
        </div>

        {/* Cuisine Tags */}
        {location.cuisine && location.cuisine.length > 0 && (
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
        )}

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
            <Directions className="w-4 h-4" />
            Directions
          </button>

          <button
            onClick={handleShare}
            className="px-3 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
            title="Share"
          >
            <ShareIcon className="w-4 h-4" />
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
        {!isLoading && user && (
          <button
            onClick={() => setShowReviewForm(true)}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 mb-3"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 sm:p-6 z-50">
          <ReviewSubmission
            location={location}
            onSubmitted={async () => {
              setShowReviewForm(false);
              // Refresh both reviews and photos after submission
              await fetchReviews();
              await fetchPhotos();
              success("Review submitted successfully!", "Thank you for your feedback");
            }}
            onCancel={() => setShowReviewForm(false)}
          />
        </div>
      )}
    </div>
  );

  // Return compact or full layout based on variant prop
  if (variant === 'compact' || compact) {
    return renderCompactLayout();
  }

  return renderFullLayout();
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
          <span style="color: #5f6368; text-transform: capitalize;">${(location.serviceType || "restaurant").replace(
            "-",
            " "
          )}</span>
        </div>
        
        <div style="margin-bottom: 8px;">
          ${(location.cuisine || [])
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
