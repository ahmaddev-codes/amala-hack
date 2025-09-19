"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Star,
  AccessTime as Clock,
  Phone,
  Language as Globe,
  LocationOn as MapPin,
  Navigation as Directions,
  Share as ShareIcon,
  Bookmark as SaveIcon,
  CameraAlt as Camera,
  AttachMoney as DollarSign,
  Restaurant as RestaurantIcon,
  LocalBar as BarIcon,
  Accessible as AccessibleIcon,
  ThumbUp as LikeIcon,
  MoreVert as MoreIcon,
  Search as SearchIcon,
  Sort as SortIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Info as InfoIcon,
  ChevronLeft,
  ChevronRight,
  ExpandMore,
  KeyboardArrowDown,
} from "@mui/icons-material";
import { AmalaLocation } from "@/types/location";

interface GoogleMapsInfoPanelProps {
  location: AmalaLocation;
  onClose?: () => void;
}

export function GoogleMapsInfoPanel({
  location,
  onClose,
}: GoogleMapsInfoPanelProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "menu" | "reviews" | "about"
  >("overview");
  const [showAllHours, setShowAllHours] = useState(false);
  const [reviewSort, setReviewSort] = useState("most_relevant");
  const [reviewFilter, setReviewFilter] = useState("all");

  // Use real reviews from location data
  const reviews = location.reviews || [];

  const handleTabClick = (tab: "overview" | "menu" | "reviews" | "about") => {
    setActiveTab(tab);
  };

  const renderOverviewTab = () => (
    <div className="flex-1 overflow-y-auto">
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 p-4 border-b border-gray-200">
        <button className="flex flex-col items-center gap-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-green-700 transition-colors">
          <Directions className="w-5 h-5" />
          <span className="text-sm font-medium">Directions</span>
        </button>
        <button className="flex flex-col items-center gap-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <SaveIcon className="w-5 h-5" />
          <span className="text-sm font-medium">Save</span>
        </button>
        <button className="flex flex-col items-center gap-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <MapPin className="w-5 h-5" />
          <span className="text-sm font-medium">Nearby</span>
        </button>
        <button className="flex flex-col items-center gap-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <Phone className="w-5 h-5" />
          <span className="text-sm font-medium">Send to phone</span>
        </button>
        <button className="flex flex-col items-center gap-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <ShareIcon className="w-5 h-5" />
          <span className="text-sm font-medium">Share</span>
        </button>
      </div>

      {/* Services */}
      <div className="p-4 border-b border-gray-200">
        <button className="flex items-center justify-between w-full p-3 hover:bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>·</span> <RestaurantIcon className="w-5 h-5" />
              {location.serviceType === "dine-in"
                ? "Dine-in"
                : location.serviceType === "takeaway"
                ? "Takeaway"
                : location.serviceType === "both"
                ? "Dine-in & Takeaway"
                : "Restaurant"}
              {location.features?.includes("wifi") && (
                <>
                  <span>·</span> <span>WiFi</span>
                </>
              )}
              {location.features?.includes("parking") && (
                <>
                  <span>·</span> <span>Parking</span>
                </>
              )}
            </div>
          </div>
          <ExpandMore className="w-6 h-6 text-gray-400" />
        </button>
      </div>

      {/* Address */}
      <div className="p-4 border-b border-gray-200">
        <button className="flex items-center gap-3 w-full p-3 hover:bg-gray-50 rounded-lg">
          <MapPin className="w-6 h-6 text-gray-500" />
          <div className="flex-1 text-left">
            <div className="font-medium text-gray-900">{location.address}</div>
            {location.city && location.country && (
              <div className="text-sm text-gray-500">
                {location.city}, {location.country}
              </div>
            )}
          </div>
          <button className="p-1 hover:bg-gray-100 rounded">
            <ShareIcon className="w-4 h-4 text-gray-500" />
          </button>
        </button>
      </div>

      {/* Hours */}
      <div className="p-4 border-b border-gray-200">
        <button
          className="flex items-center gap-3 w-full p-3 hover:bg-gray-50 rounded-lg"
          onClick={() => setShowAllHours(!showAllHours)}
        >
          <Clock className="w-6 h-6 text-gray-500" />
          <div className="flex-1 text-left">
            <div
              className={`font-medium ${
                location.isOpenNow ? "text-green-700" : "text-red-600"
              }`}
            >
              {location.isOpenNow ? "Open" : "Closed"}
            </div>
            {location.hours && Object.keys(location.hours).length > 0 && (
              <div className="text-sm text-gray-500">Click to see hours</div>
            )}
          </div>
          <KeyboardArrowDown
            className={`w-5 h-5 text-gray-400 transition-transform ${
              showAllHours ? "rotate-180" : ""
            }`}
          />
        </button>

        {showAllHours && location.hours && (
          <div className="mt-3 ml-9">
            <div className="space-y-2">
              {Object.entries(location.hours).map(([day, hours]) => (
                <div
                  key={day}
                  className="flex justify-between items-center py-1"
                >
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {day}
                  </span>
                  <span className="text-sm text-gray-600">
                    {hours.isOpen ? `${hours.open} - ${hours.close}` : "Closed"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Price Range */}
      <div className="p-4 border-b border-gray-200">
        <button className="flex items-center gap-3 w-full p-3 hover:bg-gray-50 rounded-lg">
          <DollarSign className="w-6 h-6 text-gray-500" />
          <div className="flex-1 text-left">
            <div className="font-medium text-gray-900">
              {location.priceInfo || "Contact for pricing"}
            </div>
            {location.priceLevel && (
              <div className="text-sm text-gray-500">
                {"$".repeat(location.priceLevel)} out of $$$$
              </div>
            )}
          </div>
        </button>
      </div>

      {/* Photos */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Photos & videos</h3>
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {location.images && location.images.length > 0 ? (
            location.images.slice(0, 6).map((image, index) => (
              <div
                key={index}
                className="flex-shrink-0 relative w-32 h-24 bg-gray-200 rounded-lg overflow-hidden"
              >
                <Image
                  src={image}
                  alt={`${location.name} photo ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
            ))
          ) : (
            <div className="flex-shrink-0 relative w-32 h-24 bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
              <Camera className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>
        <button className="mt-3 flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <AddIcon className="w-4 h-4" />
          <span className="text-sm font-medium">Add photos & videos</span>
        </button>
      </div>

      {/* Q&A Section */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Don&#39;t see what you need here?
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Questions are often answered by the community within 20 minutes.
        </p>
        <div className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg">
          <div className="w-8 h-8 bg-gray-300 rounded-full" />
          <input
            className="flex-1 text-sm placeholder-gray-500 border-none outline-none"
            placeholder="Ask the community"
          />
        </div>
      </div>
    </div>
  );

  const renderReviewsTab = () => (
    <div className="flex-1 overflow-y-auto">
      {/* Review Summary */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Review summary</h3>
          <button className="p-1 hover:bg-gray-50 rounded-full">
            <InfoIcon className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-4xl font-light text-gray-900">
              {location.rating?.toFixed(1) || "4.3"}
            </div>
            <div className="flex items-center justify-center gap-1 my-2">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${
                    i < Math.floor(location.rating || 4.3)
                      ? "text-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>
            <div className="text-sm text-gray-600">
              {location.reviewCount || "0"} reviews
            </div>
          </div>

          <div className="flex-1">
            {[5, 4, 3, 2, 1].map((stars) => (
              <div key={stars} className="flex items-center gap-3 mb-1">
                <span className="text-sm w-2">{stars}</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-400 rounded-full"
                    style={{
                      width: `${
                        stars === 5
                          ? 60
                          : stars === 4
                          ? 30
                          : stars === 3
                          ? 20
                          : stars === 2
                          ? 5
                          : 8
                      }%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <button className="mt-4 flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <EditIcon className="w-4 h-4" />
          <span className="text-sm font-medium">Write a review</span>
        </button>
      </div>

      {/* Review Controls */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Reviews</h3>
          <button className="p-2 hover:bg-gray-50 rounded-full">
            <SearchIcon className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="mb-4">
          <input
            className="w-full p-3 text-sm border border-gray-300 rounded-lg placeholder-gray-500"
            placeholder="Search reviews"
          />
        </div>

        <div className="flex items-center gap-3 mb-4">
          <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <SortIcon className="w-4 h-4" />
            <span className="text-sm">Sort</span>
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <button className="px-4 py-2 bg-green-100 text-primary rounded-full text-sm font-medium">
            All
          </button>
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm">
            Recent
          </button>
        </div>
      </div>

      {/* Reviews List */}
      <div className="p-4">
        {reviews.length > 0 ? (
          reviews.map((review) => (
            <div
              key={review.id}
              className="border-b border-gray-200 pb-6 mb-6 last:border-b-0"
            >
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-gray-300 rounded-full flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <div className="font-medium text-gray-900">
                        {review.author}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(review.date_posted).toLocaleDateString()}
                      </div>
                    </div>
                    <button className="p-1 hover:bg-gray-50 rounded-full">
                      <MoreIcon className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating
                              ? "text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {review.text && (
                    <p className="text-gray-700 mb-3">{review.text}</p>
                  )}

                  <div className="flex items-center gap-4">
                    <button className="flex items-center gap-2 text-sm text-gray-600 hover:bg-gray-50 px-3 py-1 rounded">
                      <LikeIcon className="w-4 h-4" />
                      <span>Like</span>
                    </button>
                    <button className="flex items-center gap-2 text-sm text-gray-600 hover:bg-gray-50 px-3 py-1 rounded">
                      <ShareIcon className="w-4 h-4" />
                      <span>Share</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No reviews yet</p>
            <p className="text-sm text-gray-400">
              Be the first to write a review!
            </p>
          </div>
        )}

        {reviews.length > 0 && (
          <button className="w-full mt-4 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <span className="text-sm font-medium">More reviews</span>
          </button>
        )}
      </div>
    </div>
  );

  const renderMenuTab = () => (
    <div className="flex-1 p-4 flex items-center justify-center">
      <div className="text-center text-gray-500">
        <RestaurantIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
        <p>Menu information not available</p>
        <p className="text-sm text-gray-400 mt-1">
          Contact the restaurant for menu details
        </p>
      </div>
    </div>
  );

  const renderAboutTab = () => (
    <div className="flex-1 p-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">About</h3>
      <p className="text-gray-700 mb-4">
        {location.description ||
          "Authentic Nigerian cuisine serving traditional dishes like amala, gbegiri, and ewedu soup."}
      </p>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <MapPin className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-600">{location.address}</span>
        </div>
        {location.phone && (
          <div className="flex items-center gap-3">
            <Phone className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-600">{location.phone}</span>
          </div>
        )}
        {location.website && (
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-primary">{location.website}</span>
          </div>
        )}
        {location.cuisine && location.cuisine.length > 0 && (
          <div className="flex items-center gap-3">
            <RestaurantIcon className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-600">
              {location.cuisine.join(", ")}
            </span>
          </div>
        )}
        {location.features && location.features.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Features</h4>
            <div className="flex flex-wrap gap-2">
              {location.features.map((feature) => (
                <span
                  key={feature}
                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md"
                >
                  {feature.replace("-", " ")}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="absolute left-[408px] top-0 bottom-0 w-[400px] bg-white shadow-lg z-30 flex flex-col">
      {/* Hero Image */}
      <div className="relative h-48 bg-gradient-to-br from-orange-400 to-red-500 overflow-hidden">
        {location.images && location.images.length > 0 ? (
          <Image
            src={location.images[0]}
            alt={location.name}
            className="w-full h-full object-cover"
            fill
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Camera className="w-12 h-12 text-white opacity-60" />
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center text-white"
        >
          ×
        </button>

        {/* Status badge */}
        <div className="absolute top-4 left-4">
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

        {/* See photos button */}
        {location.images && location.images.length > 0 && (
          <button className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1 bg-black/20 rounded-lg text-white text-sm">
            <Camera className="w-4 h-4" />
            See photos
          </button>
        )}
      </div>

      {/* Header Info */}
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-medium text-gray-900 mb-2">
          {location.name}
        </h1>

        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center">
            <span className="font-medium text-gray-900">
              {location.rating?.toFixed(1) || "4.3"}
            </span>
            <div className="flex items-center ml-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.floor(location.rating || 4.3)
                      ? "text-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>
            <span className="ml-2 text-gray-600">
              ({location.reviewCount || "0"})
            </span>
          </div>
          <span className="text-gray-400">·</span>
          <span className="text-gray-600">
            {location.priceInfo || "Contact for pricing"}
          </span>
        </div>

        <div className="flex items-center gap-1 text-sm text-gray-600">
          <RestaurantIcon className="w-4 h-4" />
          <span>Restaurant</span>
          <span className="text-gray-400">·</span>
          {location.features?.includes("wheelchair-accessible") && (
            <AccessibleIcon className="w-4 h-4" />
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex">
          {[
            { id: "overview", label: "Overview" },
            { id: "menu", label: "Menu" },
            { id: "reviews", label: "Reviews" },
            { id: "about", label: "About" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() =>
                handleTabClick(
                  tab.id as "overview" | "menu" | "reviews" | "about"
                )
              }
              className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? "text-primary"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && renderOverviewTab()}
      {activeTab === "reviews" && renderReviewsTab()}
      {activeTab === "menu" && renderMenuTab()}
      {activeTab === "about" && renderAboutTab()}
    </div>
  );
}
