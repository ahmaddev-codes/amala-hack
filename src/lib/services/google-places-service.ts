// Google Places API service for real pricing data
import { AmalaLocation } from "@/types/location";

interface PlacesDetailResponse {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: { lat: number; lng: number };
  };
  price_level?: number; // 0-4 (Free, Inexpensive, Moderate, Expensive, Very Expensive)
  types: string[];
  formatted_phone_number?: string;
  website?: string;
  opening_hours?: {
    open_now: boolean;
    periods: Array<{
      close: { day: number; time: string };
      open: { day: number; time: string };
    }>;
  };
  rating?: number;
  user_ratings_total?: number;
  photos?: Array<{ photo_reference: string }>;
}

interface CurrencyMapping {
  country: string;
  currency: string;
  symbol: string;
  priceRanges: {
    0: { min: 0; max: 0; description: "Free" };
    1: { min: number; max: number; description: string }; // Inexpensive
    2: { min: number; max: number; description: string }; // Moderate
    3: { min: number; max: number; description: string }; // Expensive
    4: { min: number; max: number; description: string }; // Very Expensive
  };
}

// Real price ranges by country/currency based on Google Places price_level
const CURRENCY_PRICE_MAPPINGS: Record<string, CurrencyMapping> = {
  // Nigeria (Naira)
  NG: {
    country: "Nigeria",
    currency: "NGN",
    symbol: "₦",
    priceRanges: {
      0: { min: 0, max: 0, description: "Free" },
      1: { min: 50000, max: 150000, description: "₦500-1,500" }, // kobo
      2: { min: 150000, max: 400000, description: "₦1,500-4,000" },
      3: { min: 400000, max: 800000, description: "₦4,000-8,000" },
      4: { min: 800000, max: 1500000, description: "₦8,000-15,000" },
    },
  },

  // United States (Dollars)
  US: {
    country: "United States",
    currency: "USD",
    symbol: "$",
    priceRanges: {
      0: { min: 0, max: 0, description: "Free" },
      1: { min: 500, max: 1500, description: "$5-15" }, // cents
      2: { min: 1500, max: 3500, description: "$15-35" },
      3: { min: 3500, max: 6000, description: "$35-60" },
      4: { min: 6000, max: 12000, description: "$60-120" },
    },
  },

  // United Kingdom (Pounds)
  GB: {
    country: "United Kingdom",
    currency: "GBP",
    symbol: "£",
    priceRanges: {
      0: { min: 0, max: 0, description: "Free" },
      1: { min: 800, max: 2000, description: "£8-20" }, // pence
      2: { min: 2000, max: 4500, description: "£20-45" },
      3: { min: 4500, max: 8000, description: "£45-80" },
      4: { min: 8000, max: 15000, description: "£80-150" },
    },
  },

  // Canada (Canadian Dollars)
  CA: {
    country: "Canada",
    currency: "CAD",
    symbol: "CAD $",
    priceRanges: {
      0: { min: 0, max: 0, description: "Free" },
      1: { min: 800, max: 2000, description: "CAD $8-20" }, // cents
      2: { min: 2000, max: 4500, description: "CAD $20-45" },
      3: { min: 4500, max: 8000, description: "CAD $45-80" },
      4: { min: 8000, max: 15000, description: "CAD $80-150" },
    },
  },
};

export class GooglePlacesService {
  private apiKey: string;
  private baseUrl = "https://maps.googleapis.com/maps/api/place";

  constructor() {
    this.apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
    if (!this.apiKey) {
      throw new Error("GOOGLE_PLACES_API_KEY or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable is required");
    }
  }

  /**
   * Get detailed information about a place including pricing
   */
  async getPlaceDetails(placeId: string): Promise<PlacesDetailResponse | null> {
    try {
      const fields = [
        "place_id",
        "name",
        "formatted_address",
        "geometry",
        "price_level",
        "types",
        "formatted_phone_number",
        "website",
        "opening_hours",
        "rating",
        "user_ratings_total",
        "photos",
      ].join(",");

      const url = `${this.baseUrl}/details/json?place_id=${placeId}&fields=${fields}&key=${this.apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== "OK") {
        console.error("Places API error:", data.status, data.error_message);
        return null;
      }

      return data.result;
    } catch (error) {
      console.error("Error fetching place details:", error);
      return null;
    }
  }

  /**
   * Search for restaurants near a location
   */
  async searchRestaurants(
    query: string,
    location?: { lat: number; lng: number },
    radius = 5000
  ) {
    try {
      let url: string;

      if (location) {
        // Location-based search
        url = `${this.baseUrl}/nearbysearch/json?location=${location.lat},${
          location.lng
        }&radius=${radius}&type=restaurant&keyword=${encodeURIComponent(
          query
        )}&key=${this.apiKey}`;
      } else {
        // Text-based search
        url = `${this.baseUrl}/textsearch/json?query=${encodeURIComponent(
          query + " restaurant"
        )}&key=${this.apiKey}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== "OK") {
        console.error("Places search error:", data.status, data.error_message);
        return [];
      }

      return data.results;
    } catch (error) {
      console.error("Error searching restaurants:", error);
      return [];
    }
  }

  /**
   * Convert Google Places price_level to real pricing data
   */
  convertPriceLevelToRealPricing(
    priceLevel: number,
    countryCode: string
  ): {
    priceMin: number;
    priceMax: number;
    currency: string;
    priceInfo: string;
  } {
    const mapping = CURRENCY_PRICE_MAPPINGS[countryCode];

    if (!mapping || priceLevel < 0 || priceLevel > 4) {
      // Default to USD moderate pricing
      return {
        priceMin: 1500,
        priceMax: 3500,
        currency: "USD",
        priceInfo: "$15-35 per person",
      };
    }

    const priceRange =
      mapping.priceRanges[priceLevel as keyof typeof mapping.priceRanges];

    return {
      priceMin: priceRange.min,
      priceMax: priceRange.max,
      currency: mapping.currency,
      priceInfo: `${priceRange.description} per person`,
    };
  }

  /**
   * Get country code from place details
   */
  extractCountryCode(placeDetails: PlacesDetailResponse): string {
    // Extract from formatted_address or use geometry for reverse geocoding
    const address = placeDetails.formatted_address.toLowerCase();

    if (address.includes("nigeria")) return "NG";
    if (address.includes("united states") || address.includes("usa"))
      return "US";
    if (address.includes("united kingdom") || address.includes("uk"))
      return "GB";
    if (address.includes("canada")) return "CA";

    // Default fallback
    return "US";
  }

  /**
   * Enrich location data with real pricing from Google Places
   */
  async enrichLocationWithPricing(
    location: Partial<AmalaLocation>
  ): Promise<Partial<AmalaLocation>> {
    try {
      // Search for the restaurant using name and address
      const searchQuery = `${location.name} ${location.address}`;
      const searchResults = await this.searchRestaurants(searchQuery);

      if (searchResults.length === 0) {
        console.log(`No Places API results found for: ${searchQuery}`);
        return location;
      }

      // Get detailed info for the first result
      const placeDetails = await this.getPlaceDetails(
        searchResults[0].place_id
      );

      if (!placeDetails) {
        return location;
      }

      // Extract country and convert pricing
      const countryCode = this.extractCountryCode(placeDetails);
      const pricingData =
        placeDetails.price_level !== undefined
          ? this.convertPriceLevelToRealPricing(
              placeDetails.price_level,
              countryCode
            )
          : null;

      // Enrich location with real data
      const enrichedLocation: Partial<AmalaLocation> = {
        ...location,
        // Update pricing if available
        ...(pricingData && {
          priceMin: pricingData.priceMin,
          priceMax: pricingData.priceMax,
          currency: pricingData.currency,
          priceInfo: pricingData.priceInfo,
          priceLevel: placeDetails.price_level,
        }),
        // Update other details
        phone: placeDetails.formatted_phone_number || location.phone,
        website: placeDetails.website || location.website,
        rating: placeDetails.rating || location.rating,
        reviewCount: placeDetails.user_ratings_total || location.reviewCount,
        isOpenNow: placeDetails.opening_hours?.open_now,
      };

      console.log(
        `Enriched ${location.name} with real pricing: ${pricingData?.priceInfo}`
      );
      return enrichedLocation;
    } catch (error) {
      console.error(`Error enriching location ${location.name}:`, error);
      return location;
    }
  }

  /**
   * Format price for display based on currency
   */
  static formatPrice(
    priceMin: number,
    priceMax: number,
    currency: string
  ): string {
    const formatters: Record<string, (amount: number) => string> = {
      NGN: (amount) => `₦${(amount / 100).toLocaleString()}`, // kobo to naira
      USD: (amount) => `$${(amount / 100).toFixed(0)}`, // cents to dollars
      GBP: (amount) => `£${(amount / 100).toFixed(0)}`, // pence to pounds
      CAD: (amount) => `CAD $${(amount / 100).toFixed(0)}`, // cents to CAD
    };

    const formatter = formatters[currency] || formatters.USD;

    if (priceMin === 0 && priceMax === 0) {
      return "Free";
    }

    return `${formatter(priceMin)}-${formatter(priceMax)}`;
  }
}

export const googlePlacesService = new GooglePlacesService();
