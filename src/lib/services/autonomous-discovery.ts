import { AmalaLocation, Review } from "@/types/location";
import axios from "axios";
import { WebScrapingService } from "./scraping-service";

export interface DiscoverySource {
  name: string;
  type: "api" | "scraping" | "social";
  enabled: boolean;
  searchQueries: string[];
}

export interface ScrapingTarget {
  url: string;
  type: "blog" | "directory" | "social" | "review-site";
  selectors: {
    name?: string;
    address?: string;
    phone?: string;
    rating?: string;
  };
}

export class AutonomousDiscoveryService {
  private static readonly DISCOVERY_SOURCES: DiscoverySource[] = [
    {
      name: "Google Places API",
      type: "api",
      enabled: true,
      searchQueries: [
        "amala restaurant Lagos Nigeria",
        "amala spots Ikeja Lagos",
        "amala restaurants Surulere Lagos",
        "best amala Yaba Lagos",
        "amala bukka Victoria Island Lagos",
        "traditional amala Lekki Lagos",
        "ewedu gbegiri restaurants Lagos Island",
        "Yoruba food Gbagada Lagos",
        "Nigerian amala Mushin Lagos",
        "amala eatery Alimosho Lagos",
        "swallow and ewedu Agege Lagos",
        "amala and gbegiri Ojota Lagos",
      ],
    },
    {
      name: "Web Scraping",
      type: "scraping",
      enabled: true,
      searchQueries: [
        "best amala spots Lagos",
        "where to eat amala in Lagos",
        "Nigerian restaurants Lagos",
      ],
    },
    {
      name: "Social Media",
      type: "social",
      enabled: true,
      searchQueries: ["#amalalagos", "#nigerianfood", "amala restaurant Lagos"],
    },
  ];

  private static readonly SCRAPING_TARGETS: ScrapingTarget[] = [
    {
      url: "https://www.pulse.ng",
      type: "blog",
      selectors: {
        name: ".restaurant-name, .business-name, h3, h4",
        address: ".address, .location, .place",
        phone: ".phone, .contact",
      },
    },
    {
      url: "https://guardian.ng",
      type: "blog",
      selectors: {
        name: ".entry-title, .post-title",
        address: ".location, .address",
      },
    },
    {
      url: "https://www.tripadvisor.com",
      type: "review-site",
      selectors: {
        name: ".restaurant-name, h3",
        address: ".address",
        rating: ".rating",
      },
    },
  ];

  /**
   * Main autonomous discovery method
   * Searches multiple sources for Amala locations and returns validated results
   */
  static async discoverLocations(): Promise<AmalaLocation[]> {
    try {
      const allDiscoveredLocations: Partial<AmalaLocation>[] = [];

      // 1. API-based discovery
      const apiLocations = await this.discoverFromAPIs();
      allDiscoveredLocations.push(...apiLocations);

      // 2. Web scraping discovery
      const scrapedLocations = await this.discoverFromWebScraping();
      allDiscoveredLocations.push(...scrapedLocations);

      // 3. Social media discovery
      const socialLocations = await this.discoverFromSocialMedia();
      allDiscoveredLocations.push(...socialLocations);

      // 4. Process and validate discoveries
      const processedLocations = await this.processDiscoveries(
        allDiscoveredLocations
      );
      return processedLocations;
    } catch (error) {
      return [];
    }
  }

  /**
   * Discover locations using Google Places API and other APIs
   */
  private static async fetchPlaceDetails(placeId: string, apiKey: string): Promise<any> {
    try {
      const fields = "name,formatted_address,geometry,photos,reviews,rating,user_ratings_total,opening_hours,price_level,website,formatted_phone_number";
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/details/json`,
        {
          params: {
            place_id: placeId,
            fields,
            key: apiKey,
          },
        }
      );
      return response.data.result;
    } catch (error) {
      console.error(`Failed to fetch details for place ${placeId}:`, error);
      return null;
    }
  }

  static async discoverFromAPIs(): Promise<Partial<AmalaLocation>[]> {
    const locations: Partial<AmalaLocation>[] = [];

    try {
      // Google Places API discovery
      const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

      if (googleApiKey) {
        for (const query of this.DISCOVERY_SOURCES[0].searchQueries) {
          try {
            const response = await axios.get(
              `https://maps.googleapis.com/maps/api/place/textsearch/json`,
              {
                params: {
                  query,
                  key: googleApiKey,
                  location: "6.5244,3.3792", // Lagos coordinates
                  radius: 50000, // 50km radius
                },
              }
            );

            if (response.data.results) {
              for (const place of response.data.results.slice(0, 10)) { // Increased to 10 per query for more coverage
                const details = await this.fetchPlaceDetails(place.place_id, googleApiKey);
                if (!details) continue;

                // Map photos to image URLs
                const images = details.photos ? details.photos.map((photo: any) =>
                  `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${googleApiKey}`
                ) : [];

                // Map reviews (up to 5)
                const reviews: Review[] = details.reviews ? details.reviews.slice(0, 5).map((r: any) => ({
                  id: crypto.randomUUID(),
                  location_id: '', // Will be set later
                  author: r.author_name,
                  rating: r.rating,
                  text: r.text,
                  date_posted: new Date(r.time * 1000),
                  status: 'approved' as const,
                })) : [];

                locations.push({
                  name: details.name,
                  address: details.formatted_address,
                  coordinates: {
                    lat: details.geometry.location.lat,
                    lng: details.geometry.location.lng,
                  },
                  phone: details.formatted_phone_number,
                  website: details.website,
                  rating: details.rating,
                  reviewCount: details.user_ratings_total,
                  images,
                  reviews,
                  priceRange: this.mapPriceLevel(details.price_level),
                  isOpenNow: details.opening_hours?.open_now ?? false,
                  discoverySource: "directory",
                  sourceUrl: `https://maps.google.com/place/${place.place_id}`,
                });
              }
            }
          } catch (error) {
            console.error(`Error in textsearch for query "${query}":`, error);
          }
        }
      }
    } catch (error) {
      console.error("Error in discoverFromAPIs:", error);
    }

    return locations;
  }

  /**
   * Discover locations through web scraping
   */
  static async discoverFromWebScraping(): Promise<Partial<AmalaLocation>[]> {
    const scraped = await WebScrapingService.discoverLocations();
    return scraped.map(loc => ({
      ...loc,
      discoverySource: 'web-scraping',
    })) as Partial<AmalaLocation>[];
  }

  /**
   * Discover locations from social media sources
   */
  static async discoverFromSocialMedia(): Promise<Partial<AmalaLocation>[]> {
    const socialDiscoveries: Partial<AmalaLocation>[] = [];

    // Twitter (X) API Integration
    const twitterBearerToken = process.env.TWITTER_BEARER_TOKEN;
    if (twitterBearerToken) {
      try {
        const { TwitterApi } = await import('twitter-api-v2');
        const client = new TwitterApi(twitterBearerToken);

        const queries = [
          '#AmalaLagos OR #AmalaNigeria lang:en geocode:6.5244,3.3792,50km',
          'amala restaurant Lagos -is:retweet',
          'best amala Lagos -is:retweet',
          'ewedu gbegiri Lagos -is:retweet',
          'Yoruba food Lagos -is:retweet',
        ];

        for (const query of queries) {
          const tweets = await client.v2.search(query, {
            'tweet.fields': 'author_id,text,geo,created_at,public_metrics',
            max_results: 10,
            'expansions': 'author_id',
            'user.fields': 'name,location',
          });

          if (tweets.data) {
            for (const tweet of tweets.data.data) {
              const text = tweet.text.toLowerCase();
              // Simple extraction: look for potential location names (capitalized words) and addresses (Lagos mentions)
              const potentialName = text.match(/([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,3})\s+(restaurant|bukka|spot|place)/i)?.[1] || '';
              if (potentialName && text.includes('lagos')) {
                socialDiscoveries.push({
                  name: potentialName,
                  address: "Lagos, Nigeria",
                  coordinates: { lat: 6.5244, lng: 3.3792 },
                  description: `Discovered via Twitter: ${tweet.text.substring(0, 200)}...`,
                  discoverySource: "social-media",
                  sourceUrl: `https://twitter.com/i/status/${tweet.id}`,
                  isOpenNow: true,
                  serviceType: "both",
                  priceRange: "$$",
                  cuisine: ["Nigerian"],
                  rating: 4.0,
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Twitter API error:', error);
      }
    } else {
      console.warn('Twitter Bearer Token not configured. Set TWITTER_BEARER_TOKEN in .env.local');
    }

    // Instagram Graph API Integration (Placeholder - requires Facebook Developer App setup)
    // To integrate:
    // 1. Create Facebook App at developers.facebook.com
    // 2. Add Instagram Graph API product
    // 3. Get long-lived access token with instagram_basic, pages_show_list permissions
    // 4. Use the following code template:
    /*
    const instagramAccessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    if (instagramAccessToken) {
      try {
        const response = await axios.get('https://graph.facebook.com/v18.0/me/media', {
          params: {
            fields: 'id,caption,media_url,permalink,username,timestamp',
            access_token: instagramAccessToken,
            limit: 20,
          },
        });
        // Process captions for Amala mentions similar to Twitter
      } catch (error) {
        console.error('Instagram API error:', error);
      }
    }
    */

    return socialDiscoveries;
  }

  /**
   * Process and validate all discovered locations
   */
  static async processDiscoveries(
    discoveries: Partial<AmalaLocation>[]
  ): Promise<AmalaLocation[]> {
    const processedLocations: AmalaLocation[] = [];

    // Remove duplicates
    const uniqueDiscoveries = this.removeDuplicates(discoveries);

    // Validate and normalize each location
    for (const location of uniqueDiscoveries) {
      const validation = await this.validateDiscoveredLocation(location);

      if (validation.isValid && validation.confidence > 0.6) {
        const normalizedLocation = this.normalizeLocation(location);
        processedLocations.push(normalizedLocation);
      } else {
      }
    }

    return processedLocations;
  }

  /**
   * Validate a discovered location
   */
  static async validateDiscoveredLocation(
    location: Partial<AmalaLocation>
  ): Promise<{
    isValid: boolean;
    confidence: number;
    issues: string[];
  }> {
    const issues: string[] = [];
    let confidence = 1.0;

    // Basic validation
    if (!location.name || location.name.length < 3) {
      issues.push("Invalid or missing name");
      confidence -= 0.4;
    }

    if (!location.address) {
      issues.push("Missing address");
      confidence -= 0.3;
    }

    // Check if it's Lagos-based
    if (location.address && !location.address.toLowerCase().includes("lagos")) {
      issues.push("Not in Lagos");
      confidence -= 0.2;
    }

    // Check for Amala relevance
    const amalaKeywords = [
      "amala",
      "ewedu",
      "gbegiri",
      "yoruba",
      "nigerian",
      "bukka",
      "buka",
    ];
    const hasAmalaKeyword = amalaKeywords.some(
      (keyword) =>
        location.name?.toLowerCase().includes(keyword) ||
        location.description?.toLowerCase().includes(keyword)
    );

    if (!hasAmalaKeyword) {
      issues.push("May not serve Amala");
      confidence -= 0.3;
    }

    // Boost confidence for certain indicators
    if (location.rating && location.rating > 4.0) {
      confidence += 0.1;
    }

    if (location.discoverySource === "google-places-api") {
      confidence += 0.1; // API sources are more reliable
    }

    return {
      isValid: confidence > 0.6 && issues.length < 3,
      confidence: Math.max(0, Math.min(1, confidence)),
      issues,
    };
  }

  /**
   * Remove duplicate locations based on name and address similarity
   */
  static removeDuplicates(
    locations: Partial<AmalaLocation>[]
  ): Partial<AmalaLocation>[] {
    const unique: Partial<AmalaLocation>[] = [];

    for (const location of locations) {
      const isDuplicate = unique.some(
        (existing) =>
          this.calculateSimilarity(
            location.name?.toLowerCase() || "",
            existing.name?.toLowerCase() || ""
          ) > 0.8 ||
          this.calculateSimilarity(
            location.address?.toLowerCase() || "",
            existing.address?.toLowerCase() || ""
          ) > 0.9
      );

      if (!isDuplicate) {
        unique.push(location);
      }
    }

    return unique;
  }

  /**
   * Normalize a location to ensure all required fields
   */
  static normalizeLocation(location: Partial<AmalaLocation>): AmalaLocation {
    return {
      id: crypto.randomUUID(),
      name: location.name || "Unknown Restaurant",
      address: location.address || "Lagos, Nigeria",
      coordinates: location.coordinates || { lat: 6.5244, lng: 3.3792 },
      phone: location.phone,
      website: location.website,
      description:
        location.description ||
        `Amala restaurant discovered through ${location.discoverySource}`,
      isOpenNow: location.isOpenNow ?? true,
      serviceType: location.serviceType || "both",
      priceRange: location.priceRange || "$",
      cuisine: location.cuisine || ["Nigerian"],
      dietary: location.dietary || [],
      features: location.features || [],
      rating: location.rating,
      reviewCount: location.reviewCount || (location.reviews ? location.reviews.length : 0),
      reviews: location.reviews || [],
      hours: location.hours || this.generateDefaultHours(),
      images: location.images || [],
      status: "pending",
      submittedAt: new Date(),
      discoverySource: location.discoverySource || "autonomous-discovery",
      sourceUrl: location.sourceUrl,
    } as AmalaLocation;
  }

  /**
   * Helper methods
   */
  private static isAmalaRelated(text: string): boolean {
    const keywords = [
      "amala",
      "ewedu",
      "gbegiri",
      "yoruba",
      "nigerian",
      "bukka",
      "buka",
      "traditional",
    ];
    return keywords.some((keyword) => text.toLowerCase().includes(keyword));
  }

  private static mapPriceLevel(
    priceLevel?: number
  ): "$" | "$$" | "$$$" | "$$$$" {
    switch (priceLevel) {
      case 0:
        return "$";
      case 1:
        return "$";
      case 2:
        return "$$";
      case 3:
        return "$$$";
      case 4:
        return "$$$$";
      default:
        return "$$";
    }
  }

  public static calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = AutonomousDiscoveryService.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  private static generateDefaultHours() {
    return {
      monday: { open: "08:00", close: "20:00", isOpen: true },
      tuesday: { open: "08:00", close: "20:00", isOpen: true },
      wednesday: { open: "08:00", close: "20:00", isOpen: true },
      thursday: { open: "08:00", close: "20:00", isOpen: true },
      friday: { open: "08:00", close: "20:00", isOpen: true },
      saturday: { open: "09:00", close: "19:00", isOpen: true },
      sunday: { open: "10:00", close: "18:00", isOpen: false },
    };
  }

  /**
   * Schedule autonomous discovery to run periodically
   */
  static async scheduleDiscovery(): Promise<void> {
    try {
      const discovered = await this.discoverLocations();

      // In production, save to database and notify moderators
      return;
    } catch (error) {}
  }
}
