import axios from "axios";
import { AmalaLocation } from "@/types/location";

/**
 * Places API (New) Service
 * Handles all interactions with Google Places API (New)
 */

export interface PlacesApiNewPhoto {
  name: string;
  widthPx: number;
  heightPx: number;
  authorAttributions: Array<{
    displayName: string;
    uri: string;
    photoUri: string;
  }>;
}

export interface PlacesApiNewPlace {
  name: string;
  id: string;
  displayName: {
    text: string;
    languageCode: string;
  };
  formattedAddress: string;
  location: {
    latitude: number;
    longitude: number;
  };
  photos: PlacesApiNewPhoto[];
  reviews: Array<{
    name: string;
    relativePublishTimeDescription: string;
    rating: number;
    text: {
      text: string;
      languageCode: string;
    };
    originalText: {
      text: string;
      languageCode: string;
    };
    authorAttribution: {
      displayName: string;
      uri: string;
      photoUri: string;
    };
  }>;
  rating: number;
  userRatingCount: number;
  priceLevel: string;
  websiteUri: string;
  nationalPhoneNumber: string;
  regularOpeningHours: {
    openNow: boolean;
    periods: Array<{
      open: {
        day: number;
        hour: number;
        minute: number;
      };
      close: {
        day: number;
        hour: number;
        minute: number;
      };
    }>;
  };
  types: string[];
}

export class PlacesApiNewService {
  private static readonly BASE_URL = "https://places.googleapis.com/v1";

  /**
   * Search for places using text search
   */
  static async textSearch(
    query: string,
    apiKey: string,
    location?: { lat: number; lng: number },
    radius?: number
  ): Promise<PlacesApiNewPlace[]> {
    try {
      const requestBody = {
        textQuery: query,
        maxResultCount: 20,
        ...(location &&
          radius && {
            locationBias: {
              circle: {
                center: {
                  latitude: location.lat,
                  longitude: location.lng,
                },
                radius: radius,
              },
            },
          }),
        includedType: "restaurant",
        languageCode: "en",
      };

      const response = await axios.post(
        `${this.BASE_URL}/places:searchText`,
        requestBody,
        {
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask":
              "places.id,places.displayName,places.formattedAddress,places.location,places.photos,places.reviews,places.rating,places.userRatingCount,places.priceLevel,places.websiteUri,places.nationalPhoneNumber,places.regularOpeningHours,places.types",
          },
        }
      );

      return response.data.places || [];
    } catch (error: any) {
      console.error("Places API (New) text search error:", error);
      
      // Provide more specific error information for debugging
      if (error.response?.status === 403) {
        console.error("🔑 Places API 403 Error - Possible causes:");
        console.error("  - API key invalid or expired");
        console.error("  - Places API (New) not enabled in Google Cloud Console");
        console.error("  - Billing not enabled for the project");
        console.error("  - API key restrictions blocking the request");
        console.error("  - Check: https://console.cloud.google.com/apis/library/places-backend.googleapis.com");
      } else if (error.response?.status === 400) {
        console.error("🔑 Places API 400 Error - Invalid request format");
      }
      
      return [];
    }
  }

  /**
   * Get place details by place ID
   */
  static async getPlaceDetails(
    placeId: string,
    apiKey: string
  ): Promise<PlacesApiNewPlace | null> {
    try {
      const response = await axios.get(`${this.BASE_URL}/places/${placeId}`, {
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "id,displayName,formattedAddress,location,photos,reviews,rating,userRatingCount,priceLevel,websiteUri,nationalPhoneNumber,regularOpeningHours,types",
        },
      });

      return response.data;
    } catch (error) {
      console.error(`Failed to fetch details for place ${placeId}:`, error);
      return null;
    }
  }

  /**
   * Find place ID by address using text search
   */
  static async findPlaceId(
    address: string,
    apiKey: string
  ): Promise<string | null> {
    try {
      const places = await this.textSearch(address, apiKey);
      if (places.length > 0) {
        return places[0].id;
      }
      return null;
    } catch (error) {
      console.error("Error finding place ID:", error);
      return null;
    }
  }

  /**
   * Get photo URL for Places API (New) photo
   */
  static getPhotoUrl(photoName: string, maxWidth: number = 400): string {
    return `/api/proxy/google-photo?photoreference=${photoName}&maxwidth=${maxWidth}`;
  }

  /**
   * Convert Places API (New) place to AmalaLocation format
   */
  static convertToAmalaLocation(place: PlacesApiNewPlace): Partial<AmalaLocation> {
    return {
      name: place.displayName.text,
      address: place.formattedAddress,
      coordinates: {
        lat: place.location.latitude,
        lng: place.location.longitude,
      },
      phone: place.nationalPhoneNumber,
      website: place.websiteUri,
      rating: place.rating,
      reviewCount: place.userRatingCount,
      priceRange: this.convertPriceLevel(place.priceLevel, place.formattedAddress),
      images: place.photos?.map((photo) => this.getPhotoUrl(photo.name)) || [],
      reviews:
        place.reviews?.map((review) => ({
          id: crypto.randomUUID(),
          location_id: "",
          author: review.authorAttribution?.displayName || "Anonymous",
          rating: review.rating || 0,
          text: review.text?.text || "",
          date_posted: new Date(),
          status: "approved" as const,
        })).filter(review => review.text.length > 0) || [],
      hours: this.convertOpeningHours(place.regularOpeningHours),
      isOpenNow: place.regularOpeningHours?.openNow || false,
      cuisine: this.convertTypes(place.types),
      serviceType: this.inferServiceType(place.types),
    };
  }

  /**
   * Convert price level from Places API (New) format to actual price ranges
   */
  private static convertPriceLevel(priceLevel: string, address?: string): string {
    const currency = this.getCurrencyByLocation(address);
    
    switch (priceLevel) {
      case "PRICE_LEVEL_FREE":
        return `${currency.symbol}0 - ${currency.symbol}${currency.low}`;
      case "PRICE_LEVEL_INEXPENSIVE":
        return `${currency.symbol}${currency.low} - ${currency.symbol}${currency.moderate}`;
      case "PRICE_LEVEL_MODERATE":
        return `${currency.symbol}${currency.moderate} - ${currency.symbol}${currency.high}`;
      case "PRICE_LEVEL_EXPENSIVE":
        return `${currency.symbol}${currency.high} - ${currency.symbol}${currency.veryHigh}`;
      case "PRICE_LEVEL_VERY_EXPENSIVE":
        return `${currency.symbol}${currency.veryHigh}+`;
      default:
        return `${currency.symbol}${currency.low} - ${currency.symbol}${currency.moderate}`;
    }
  }

  /**
   * Get currency and price ranges based on location
   */
  private static getCurrencyByLocation(address?: string): {
    symbol: string;
    code: string;
    low: number;
    moderate: number;
    high: number;
    veryHigh: number;
  } {
    if (!address) {
      return { symbol: "₦", code: "NGN", low: 500, moderate: 2000, high: 5000, veryHigh: 10000 };
    }

    const lowerAddress = address.toLowerCase();

    // Nigeria
    if (lowerAddress.includes("nigeria") || lowerAddress.includes("lagos") || 
        lowerAddress.includes("abuja") || lowerAddress.includes("ibadan")) {
      return { symbol: "₦", code: "NGN", low: 500, moderate: 2000, high: 5000, veryHigh: 10000 };
    }

    // UK
    if (lowerAddress.includes("uk") || lowerAddress.includes("united kingdom") || 
        lowerAddress.includes("london") || lowerAddress.includes("manchester") ||
        lowerAddress.includes("birmingham") || lowerAddress.includes("england")) {
      return { symbol: "£", code: "GBP", low: 8, moderate: 15, high: 25, veryHigh: 40 };
    }

    // USA
    if (lowerAddress.includes("usa") || lowerAddress.includes("united states") || 
        lowerAddress.includes("new york") || lowerAddress.includes("houston") ||
        lowerAddress.includes("atlanta") || lowerAddress.includes("chicago")) {
      return { symbol: "$", code: "USD", low: 10, moderate: 20, high: 35, veryHigh: 50 };
    }

    // Canada
    if (lowerAddress.includes("canada") || lowerAddress.includes("toronto") || 
        lowerAddress.includes("vancouver") || lowerAddress.includes("montreal")) {
      return { symbol: "C$", code: "CAD", low: 12, moderate: 25, high: 40, veryHigh: 60 };
    }

    // Australia
    if (lowerAddress.includes("australia") || lowerAddress.includes("sydney") || 
        lowerAddress.includes("melbourne") || lowerAddress.includes("brisbane")) {
      return { symbol: "A$", code: "AUD", low: 15, moderate: 25, high: 40, veryHigh: 60 };
    }

    // South Africa
    if (lowerAddress.includes("south africa") || lowerAddress.includes("johannesburg") || 
        lowerAddress.includes("cape town") || lowerAddress.includes("durban")) {
      return { symbol: "R", code: "ZAR", low: 80, moderate: 150, high: 250, veryHigh: 400 };
    }

    // Germany
    if (lowerAddress.includes("germany") || lowerAddress.includes("berlin") || 
        lowerAddress.includes("munich") || lowerAddress.includes("hamburg")) {
      return { symbol: "€", code: "EUR", low: 8, moderate: 15, high: 25, veryHigh: 40 };
    }

    // France
    if (lowerAddress.includes("france") || lowerAddress.includes("paris") || 
        lowerAddress.includes("lyon") || lowerAddress.includes("marseille")) {
      return { symbol: "€", code: "EUR", low: 10, moderate: 18, high: 30, veryHigh: 45 };
    }

    // UAE
    if (lowerAddress.includes("uae") || lowerAddress.includes("dubai") || 
        lowerAddress.includes("abu dhabi") || lowerAddress.includes("emirates")) {
      return { symbol: "AED", code: "AED", low: 25, moderate: 50, high: 80, veryHigh: 120 };
    }

    // Default to Naira for unknown locations
    return { symbol: "₦", code: "NGN", low: 500, moderate: 2000, high: 5000, veryHigh: 10000 };
  }

  /**
   * Convert opening hours from Places API (New) format
   */
  private static convertOpeningHours(openingHours: any): any {
    if (!openingHours?.periods) return {};

    const dayMap: { [key: number]: string } = {
      0: "sunday",
      1: "monday",
      2: "tuesday",
      3: "wednesday",
      4: "thursday",
      5: "friday",
      6: "saturday",
    };

    const hours: any = {};

    openingHours.periods.forEach((period: any) => {
      const day = dayMap[period.open?.day];
      if (day && period.open) {
        hours[day] = {
          open: `${(period.open.hour || 0)
            .toString()
            .padStart(2, "0")}:${(period.open.minute || 0)
            .toString()
            .padStart(2, "0")}`,
          close: period.close ? `${(period.close.hour || 0)
            .toString()
            .padStart(2, "0")}:${(period.close.minute || 0)
            .toString()
            .padStart(2, "0")}` : "23:59",
          isOpen: true,
        };
      }
    });

    return hours;
  }

  /**
   * Convert types to cuisine array
   */
  private static convertTypes(types: string[]): string[] {
    const cuisineMap: { [key: string]: string } = {
      restaurant: "restaurant",
      meal_takeaway: "takeaway",
      meal_delivery: "delivery",
      food: "food",
      cafe: "cafe",
      bakery: "bakery",
      bar: "bar",
      night_club: "nightlife",
    };

    return types
      .map((type) => cuisineMap[type])
      .filter(Boolean)
      .slice(0, 3);
  }

  /**
   * Infer service type from place types
   */
  private static inferServiceType(
    types: string[]
  ): "dine-in" | "takeaway" | "both" {
    if (types.includes("meal_takeaway") || types.includes("meal_delivery")) {
      return "takeaway";
    } else if (types.includes("restaurant")) {
      return "dine-in";
    }
    return "both";
  }
}
