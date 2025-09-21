// OpenStreetMap + Nominatim service for free geocoding and place search

interface NominatimResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  boundingbox: string[];
  lat: string;
  lon: string;
  display_name: string;
  class: string;
  type: string;
  importance: number;
  icon?: string;
  address?: {
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
    country_code?: string;
  };
}

interface LocationSearchResult {
  id: string;
  name: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  type: string;
  importance: number;
  country: string;
  city?: string;
  state?: string;
}

export class OpenStreetMapService {
  private static readonly BASE_URL = 'https://nominatim.openstreetmap.org';
  private static readonly USER_AGENT = 'Amala Discovery Platform/1.0';

  /**
   * Search for places using Nominatim
   * @param query Search query
   * @param countryCode Optional country code filter (e.g., 'ng' for Nigeria)
   * @param limit Maximum number of results (default: 5)
   */
  static async searchPlaces(
    query: string,
    countryCode?: string,
    limit: number = 5
  ): Promise<LocationSearchResult[]> {
    try {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: '1',
        limit: limit.toString(),
        'accept-language': 'en',
      });

      if (countryCode) {
        params.append('countrycodes', countryCode);
      }

      const response = await fetch(`${this.BASE_URL}/search?${params}`, {
        headers: {
          'User-Agent': this.USER_AGENT,
        },
      });

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status}`);
      }

      const results: NominatimResult[] = await response.json();

      return results.map((result) => ({
        id: `osm_${result.osm_type}_${result.osm_id}`,
        name: this.extractLocationName(result),
        address: result.display_name,
        coordinates: {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
        },
        type: result.type,
        importance: result.importance,
        country: result.address?.country || 'Unknown',
        city: result.address?.city || result.address?.suburb,
        state: result.address?.state,
      }));
    } catch (error) {
      console.error('OpenStreetMap search error:', error);
      return [];
    }
  }

  /**
   * Geocode an address to get coordinates
   * @param address Address to geocode
   * @param countryCode Optional country code filter
   */
  static async geocodeAddress(
    address: string,
    countryCode?: string
  ): Promise<{ lat: number; lng: number } | null> {
    try {
      const results = await this.searchPlaces(address, countryCode, 1);
      return results.length > 0 ? results[0].coordinates : null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  /**
   * Reverse geocode coordinates to get address
   * @param lat Latitude
   * @param lng Longitude
   */
  static async reverseGeocode(
    lat: number,
    lng: number
  ): Promise<string | null> {
    try {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lng.toString(),
        format: 'json',
        addressdetails: '1',
        'accept-language': 'en',
      });

      const response = await fetch(`${this.BASE_URL}/reverse?${params}`, {
        headers: {
          'User-Agent': this.USER_AGENT,
        },
      });

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status}`);
      }

      const result: NominatimResult = await response.json();
      return result.display_name;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  }

  /**
   * Search for restaurants specifically
   * @param query Search query
   * @param countryCode Optional country code filter
   * @param limit Maximum number of results
   */
  static async searchRestaurants(
    query: string,
    countryCode?: string,
    limit: number = 5
  ): Promise<LocationSearchResult[]> {
    const restaurantQuery = `${query} restaurant`;
    return this.searchPlaces(restaurantQuery, countryCode, limit);
  }

  /**
   * Search for Nigerian/Amala restaurants globally
   * @param query Search query
   * @param city Optional city filter
   * @param country Optional country filter
   * @param limit Maximum number of results
   */
  static async searchNigerianRestaurants(
    query: string,
    city?: string,
    country?: string,
    limit: number = 5
  ): Promise<LocationSearchResult[]> {
    let searchQuery = `${query} Nigerian restaurant Amala`;
    
    if (city) {
      searchQuery += ` ${city}`;
    }
    
    if (country) {
      searchQuery += ` ${country}`;
    }

    const countryCode = this.getCountryCode(country);
    return this.searchPlaces(searchQuery, countryCode, limit);
  }

  /**
   * Get nearby places around coordinates
   * @param lat Latitude
   * @param lng Longitude
   * @param radius Radius in meters (not supported by Nominatim, but we can simulate)
   * @param type Place type filter
   */
  static async getNearbyPlaces(
    lat: number,
    lng: number,
    radius: number = 1000,
    type: string = 'restaurant'
  ): Promise<LocationSearchResult[]> {
    try {
      // Nominatim doesn't support radius search directly, so we search by area
      const address = await this.reverseGeocode(lat, lng);
      if (!address) return [];

      // Extract city/area from address and search for restaurants there
      const cityMatch = address.match(/([^,]+),\s*([^,]+)/);
      const searchArea = cityMatch ? cityMatch[1] : address.split(',')[0];
      
      return this.searchPlaces(`${type} ${searchArea}`, undefined, 10);
    } catch (error) {
      console.error('Nearby places search error:', error);
      return [];
    }
  }

  /**
   * Extract a meaningful location name from Nominatim result
   */
  private static extractLocationName(result: NominatimResult): string {
    // Try to get a meaningful name from the result
    if (result.address?.house_number && result.address?.road) {
      return `${result.address.house_number} ${result.address.road}`;
    }
    
    if (result.address?.road) {
      return result.address.road;
    }

    // Fallback to first part of display name
    const firstPart = result.display_name.split(',')[0];
    return firstPart || 'Unknown Location';
  }

  /**
   * Get country code from country name
   */
  private static getCountryCode(country?: string): string | undefined {
    if (!country) return undefined;

    const countryCodes: Record<string, string> = {
      'nigeria': 'ng',
      'united kingdom': 'gb',
      'uk': 'gb',
      'united states': 'us',
      'usa': 'us',
      'canada': 'ca',
      'south africa': 'za',
      'ghana': 'gh',
      'kenya': 'ke',
      'france': 'fr',
      'germany': 'de',
      'italy': 'it',
      'spain': 'es',
    };

    return countryCodes[country.toLowerCase()];
  }

  /**
   * Rate limiting helper - add delays between requests
   */
  static async withRateLimit<T>(fn: () => Promise<T>): Promise<T> {
    // Nominatim has a 1 request per second rate limit
    const result = await fn();
    await new Promise(resolve => setTimeout(resolve, 1000));
    return result;
  }
}

// Export convenience functions
export const {
  searchPlaces,
  geocodeAddress,
  reverseGeocode,
  searchRestaurants,
  searchNigerianRestaurants,
  getNearbyPlaces,
} = OpenStreetMapService;
