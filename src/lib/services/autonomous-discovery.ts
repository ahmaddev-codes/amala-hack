import { AmalaLocation, Review } from "@/types/location";
import axios from "axios";
import crypto from "crypto";
import { PlacesApiNewService } from "./places-api";
import { WebScrapingService } from "./scraping-service";
import { EnhancedScrapingService, ScrapingTarget } from "./enhanced-scraping-service";

export interface DiscoverySource {
  name: string;
  type: "api" | "scraping" | "social";
  enabled: boolean;
  searchQueries: string[];
}

export interface RegionalBatch {
  name: string;
  continent: string;
  countries: string[];
  states?: { [countryCode: string]: string[] };
  searchQueries: string[];
}

export class AutonomousDiscoveryService {
  private static readonly REGIONAL_BATCHES: RegionalBatch[] = [
    {
      name: "Americas",
      continent: "North America",
      countries: ["US", "CA", "BR", "MX", "AR", "CO", "VE", "PE"],
      states: {
        "US": ["NY", "CA", "TX", "FL", "IL", "GA", "MD", "VA", "NJ", "MA"],
        "CA": ["ON", "BC", "AB", "QC"]
      },
      searchQueries: [
        "amala restaurant",
        "nigerian food",
        "west african cuisine",
        "yoruba food",
        "african restaurant",
        "nigerian diaspora restaurant",
        "best amala near me",
        "authentic nigerian food"
      ],
    },
    {
      name: "Europe", 
      continent: "Europe",
      countries: ["GB", "DE", "FR", "IT", "ES", "NL", "BE", "SE", "NO", "DK"],
      states: {
        "GB": ["London", "Manchester", "Birmingham", "Liverpool", "Leeds"],
        "DE": ["Berlin", "Hamburg", "Munich", "Cologne", "Frankfurt"]
      },
      searchQueries: [
        "amala restaurant",
        "nigerian food",
        "west african food",
        "african cuisine",
        "yoruba restaurant",
        "nigerian diaspora food",
        "authentic amala",
        "traditional yoruba cuisine"
      ],
    },
    {
      name: "Africa",
      continent: "Africa",
      countries: ["NG", "GH", "SN", "CI", "KE", "ZA", "BF", "ML", "NE", "TD"],
      states: {
        "NG": ["Lagos", "Oyo", "Ogun", "Osun", "Ondo", "Ekiti", "Kwara", "FCT"],
        "GH": ["Greater Accra", "Ashanti", "Western", "Central"]
      },
      searchQueries: [
        "amala bukka",
        "best amala",
        "traditional amala",
        "ewedu gbegiri",
        "yoruba food",
        "amala restaurant",
        "local amala spot",
        "authentic amala",
        "amala joint",
        "mama put amala"
      ],
    },
    {
      name: "Asia-Pacific",
      continent: "Asia",
      countries: ["AU", "SG", "MY", "JP", "IN", "TH", "PH", "ID", "VN", "KR"],
      states: {
        "AU": ["NSW", "VIC", "QLD", "WA", "SA"],
        "IN": ["Maharashtra", "Delhi", "Karnataka", "Tamil Nadu", "Gujarat"]
      },
      searchQueries: [
        "nigerian restaurant",
        "west african food",
        "amala restaurant",
        "african cuisine",
        "yoruba food",
        "nigerian diaspora restaurant",
        "authentic african food",
        "traditional nigerian cuisine"
      ],
    },
    {
      name: "Middle East",
      continent: "Asia",
      countries: ["AE", "SA", "QA", "KW", "BH", "OM", "JO", "LB"],
      states: {
        "AE": ["Dubai", "Abu Dhabi", "Sharjah", "Ajman"],
        "SA": ["Riyadh", "Jeddah", "Dammam", "Mecca"]
      },
      searchQueries: [
        "nigerian restaurant",
        "west african cuisine",
        "amala restaurant",
        "african food",
        "yoruba restaurant",
        "halal nigerian food",
        "authentic west african"
      ],
    },
  ];

  private static readonly DISCOVERY_SOURCES: DiscoverySource[] = [
    {
      name: "Google Places API",
      type: "api",
      enabled: true,
      searchQueries: [
        "amala restaurant",
        "best amala",
        "amala bukka",
        "traditional amala",
        "ewedu gbegiri",
        "yoruba food",
        "nigerian restaurant amala",
        "west african food amala",
        "african cuisine amala",
        "traditional nigerian food",
        "yoruba cuisine restaurant",
        "nigerian food near me",
        "african restaurant",
        "west african cuisine",
        "traditional african food",
        "nigerian diaspora restaurant",
      ],
    },
    {
      name: "Web Scraping",
      type: "scraping",
      enabled: true,
      searchQueries: [
        "best amala spots",
        "where to eat amala",
        "nigerian amala restaurant",
        "amala restaurant review",
        "traditional yoruba food",
        "nigerian food guide",
        "african restaurant directory",
        "west african cuisine guide",
        "nigerian diaspora food",
        "authentic nigerian restaurant",
      ],
    },
    {
      name: "Social Media",
      type: "social",
      enabled: true,
      searchQueries: [
        "#amala",
        "#nigerianfood",
        "amala restaurant",
        "#yorubafood",
        "#westafricanfood",
        "#africanfood",
        "#nigerianrestaurant",
        "#ewedu",
        "#gbegiri",
        "#nigeriandiaspora",
        "#authenticnigerian",
        "#traditionalfood",
      ],
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
   * Main autonomous discovery method with regional batching
   * Searches multiple sources for Amala locations and returns validated results
   */
  static async discoverLocations(region?: string, country?: string, state?: string): Promise<Partial<AmalaLocation>[]> {
    try {
      const allDiscoveredLocations: Partial<AmalaLocation>[] = [];

      // Determine which regions to search based on filters
      let regionsToSearch = this.REGIONAL_BATCHES;
      
      if (region) {
        regionsToSearch = this.REGIONAL_BATCHES.filter(batch => 
          batch.name.toLowerCase() === region.toLowerCase() ||
          batch.continent?.toLowerCase() === region.toLowerCase()
        );
      }
      
      if (country) {
        regionsToSearch = regionsToSearch.filter(batch => 
          batch.countries.some(c => c.toLowerCase() === country.toLowerCase())
        );
      }
      
      if (state && country) {
        regionsToSearch = regionsToSearch.filter(batch => {
          const countryStates = batch.states?.[country.toUpperCase()];
          return countryStates?.some((s: string) => s.toLowerCase().includes(state.toLowerCase()));
        });
      }

      const locationFilter = region || country || state;
      console.log(`🔍 Starting autonomous discovery${locationFilter ? ` for ${region ? 'region: ' + region : ''}${country ? 'country: ' + country : ''}${state ? 'state: ' + state : ''}` : ' globally'}...`);
      
      const allDiscovered: Partial<AmalaLocation>[] = [];

      for (const regionalBatch of regionsToSearch) {
        console.log(`🔍 Discovering locations in ${regionalBatch.name}...`);

        // 1. API-based discovery for this region
        const apiLocations = await this.discoverFromAPIsRegional(regionalBatch, country, state);
        allDiscovered.push(...apiLocations);

        // 2. Web scraping discovery for this region
        const scrapedLocations = await this.discoverFromWebScraping();
        allDiscovered.push(...scrapedLocations);

        // 3. Social media discovery for this region
        const socialLocations = await this.discoverFromSocialMedia();
        allDiscovered.push(...socialLocations);

        console.log(`✅ Found ${apiLocations.length} locations in ${regionalBatch.name}`);
      }

      // 4. Process and validate discoveries
      const processedLocations = await this.processDiscoveries(
        allDiscovered
      );
      
      console.log(`🎉 Total processed locations: ${processedLocations.length}`);
      return processedLocations;
    } catch (error) {
      console.error('❌ Discovery error:', error);
      return [];
    }
  }

  /**
   * Discover locations using Google Places API (New) and other APIs
   */
  private static async searchGooglePlaces(query: string, countryCode?: string, stateOrCity?: string): Promise<AmalaLocation[]> {
    // Use Places API (New) service instead of direct API calls
    const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!googleApiKey) {
      console.log('⚠️ Google API key not found, skipping API discovery');
      return [];
    }

    let searchQuery = query;
    if (stateOrCity && countryCode) {
      searchQuery += ` in ${stateOrCity}, ${countryCode}`;
    } else if (countryCode) {
      searchQuery += ` country:${countryCode}`;
    }

    const searchResults = await PlacesApiNewService.textSearch(searchQuery, googleApiKey);
    const locations: AmalaLocation[] = [];

    for (const place of searchResults) {
      const details = await PlacesApiNewService.getPlaceDetails(place.id, googleApiKey);
      if (details) {
        const partialLocation = PlacesApiNewService.convertToAmalaLocation(details);
        
        // Create a complete AmalaLocation with required fields
        const location: AmalaLocation = {
          id: crypto.randomUUID(),
          name: partialLocation.name || 'Unknown Restaurant',
          address: partialLocation.address || 'Unknown Address',
          coordinates: partialLocation.coordinates || { lat: 0, lng: 0 },
          cuisine: partialLocation.cuisine || ['Nigerian'],
          dietary: [],
          features: [],
          description: partialLocation.description || '',
          phone: partialLocation.phone || '',
          website: partialLocation.website || '',
          rating: partialLocation.rating || 0,
          reviewCount: partialLocation.reviewCount || 0,
          priceRange: partialLocation.priceRange || '$$',
          hours: partialLocation.hours || {},
          images: partialLocation.images || [],
          reviews: partialLocation.reviews || [],
          isOpenNow: partialLocation.isOpenNow || false,
          serviceType: partialLocation.serviceType || 'dine-in',
          discoverySource: "google-places-api",
          sourceUrl: `https://maps.google.com/place/${place.id}`,
          submittedAt: new Date(),
          status: 'pending',
          country: countryCode || 'Unknown',
          city: stateOrCity || 'Unknown',
        };
        
        locations.push(location);
      }
    }

    return locations;
  }

  /**
   * Regional API discovery using specific search queries for each region
   */
  static async discoverFromAPIsRegional(regionalBatch: RegionalBatch, country?: string, state?: string): Promise<AmalaLocation[]> {
    const locations: AmalaLocation[] = [];

    try {
      const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!googleApiKey) {
        console.log('⚠️ Google API key not found, skipping API discovery');
        return locations;
      }

      // Use region-specific search queries with geographic targeting
      const searchQueries = regionalBatch.searchQueries;
      const targetCountries = country ? [country.toUpperCase()] : regionalBatch.countries;
        const targetStates = state && country ? regionalBatch.states?.[country.toUpperCase()]?.filter((s: string) => 
        s.toLowerCase().includes(state.toLowerCase())
      ) : undefined;
      
      for (const query of searchQueries) {
        for (const targetCountry of targetCountries) {
          try {
            const locationContext = targetStates ? 
              `${query} in ${targetStates.join(', ')}, ${targetCountry}` : 
              `${query} in ${targetCountry}`;
            
            // Perform Google Places API search for this query
            const foundLocations = await this.searchGooglePlaces(
              query,
              targetCountry,
              targetStates?.[0] || undefined
            );
            
            locations.push(...foundLocations);
            
            console.log(`    ✅ Found ${foundLocations.length} locations for "${locationContext}"`, foundLocations.length > 0 ? foundLocations.slice(0, 2).map(l => l.name) : '');
          } catch (error) {
            console.error(`    ❌ Error searching "${query}" in ${targetCountry}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('❌ Regional API discovery error:', error);
    }

    return locations;
  }

  static async discoverFromAPIs(): Promise<Partial<AmalaLocation>[]> {
    const locations: Partial<AmalaLocation>[] = [];

    try {
      // Google Places API discovery
      const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

      if (googleApiKey) {
        // Global regional seeds for comprehensive Amala discovery
        const regionCenters: Array<{ name: string; lat: number; lng: number; radius: number }> = [
          // Nigeria - Primary Amala regions
          { name: "Lagos-Nigeria", lat: 6.5244, lng: 3.3792, radius: 50000 },
          { name: "Ibadan-Nigeria", lat: 7.3775, lng: 3.9470, radius: 30000 },
          { name: "Abeokuta-Nigeria", lat: 7.1475, lng: 3.3619, radius: 25000 },
          { name: "Oyo-Nigeria", lat: 7.8526, lng: 3.9470, radius: 25000 },
          { name: "Abuja-Nigeria", lat: 9.0579, lng: 7.4951, radius: 40000 },
          { name: "Kano-Nigeria", lat: 12.0022, lng: 8.5920, radius: 30000 },
          
          // West Africa - Nigerian diaspora
          { name: "Accra-Ghana", lat: 5.6037, lng: -0.1870, radius: 40000 },
          { name: "Cotonou-Benin", lat: 6.4023, lng: 2.5055, radius: 30000 },
          { name: "Lome-Togo", lat: 6.1319, lng: 1.2228, radius: 25000 },
          { name: "Dakar-Senegal", lat: 14.7167, lng: -17.4677, radius: 30000 },
          
          // Europe - Nigerian diaspora communities
          { name: "London-UK", lat: 51.5074, lng: -0.1278, radius: 50000 },
          { name: "Manchester-UK", lat: 53.4808, lng: -2.2426, radius: 30000 },
          { name: "Birmingham-UK", lat: 52.4862, lng: -1.8904, radius: 30000 },
          { name: "Paris-France", lat: 48.8566, lng: 2.3522, radius: 40000 },
          { name: "Berlin-Germany", lat: 52.5200, lng: 13.4050, radius: 35000 },
          { name: "Amsterdam-Netherlands", lat: 52.3676, lng: 4.9041, radius: 30000 },
          { name: "Brussels-Belgium", lat: 50.8503, lng: 4.3517, radius: 25000 },
          { name: "Rome-Italy", lat: 41.9028, lng: 12.4964, radius: 35000 },
          
          // North America - Nigerian diaspora
          { name: "New-York-USA", lat: 40.7128, lng: -74.0060, radius: 50000 },
          { name: "Houston-USA", lat: 29.7604, lng: -95.3698, radius: 40000 },
          { name: "Atlanta-USA", lat: 33.7490, lng: -84.3880, radius: 40000 },
          { name: "Washington-DC-USA", lat: 38.9072, lng: -77.0369, radius: 35000 },
          { name: "Chicago-USA", lat: 41.8781, lng: -87.6298, radius: 40000 },
          { name: "Los-Angeles-USA", lat: 34.0522, lng: -118.2437, radius: 45000 },
          { name: "Toronto-Canada", lat: 43.6532, lng: -79.3832, radius: 40000 },
          { name: "Vancouver-Canada", lat: 49.2827, lng: -123.1207, radius: 30000 },
          
          // Middle East - Nigerian diaspora
          { name: "Dubai-UAE", lat: 25.2048, lng: 55.2708, radius: 40000 },
          { name: "Doha-Qatar", lat: 25.2854, lng: 51.5310, radius: 30000 },
          { name: "Riyadh-Saudi", lat: 24.7136, lng: 46.6753, radius: 35000 },
          
          // Asia - Nigerian diaspora
          { name: "Mumbai-India", lat: 19.0760, lng: 72.8777, radius: 40000 },
          { name: "Delhi-India", lat: 28.7041, lng: 77.1025, radius: 40000 },
          { name: "Singapore", lat: 1.3521, lng: 103.8198, radius: 30000 },
          { name: "Kuala-Lumpur-Malaysia", lat: 3.1390, lng: 101.6869, radius: 30000 },
          { name: "Tokyo-Japan", lat: 35.6762, lng: 139.6503, radius: 35000 },
          
          // Oceania - Nigerian diaspora
          { name: "Sydney-Australia", lat: -33.8688, lng: 151.2093, radius: 40000 },
          { name: "Melbourne-Australia", lat: -37.8136, lng: 144.9631, radius: 35000 },
          { name: "Auckland-New-Zealand", lat: -36.8485, lng: 174.7633, radius: 30000 },
          
          // South America - Nigerian diaspora
          { name: "São-Paulo-Brazil", lat: -23.5505, lng: -46.6333, radius: 40000 },
          { name: "Buenos-Aires-Argentina", lat: -34.6118, lng: -58.3960, radius: 35000 },
          
          // East Africa - Regional Nigerian communities
          { name: "Nairobi-Kenya", lat: -1.2921, lng: 36.8219, radius: 35000 },
          { name: "Kampala-Uganda", lat: 0.3476, lng: 32.5825, radius: 25000 },
          { name: "Dar-es-Salaam-Tanzania", lat: -6.7924, lng: 39.2083, radius: 30000 },
          
          // North Africa
          { name: "Cairo-Egypt", lat: 30.0444, lng: 31.2357, radius: 35000 },
          { name: "Casablanca-Morocco", lat: 33.5731, lng: -7.5898, radius: 30000 },
          
          // South Africa
          { name: "Johannesburg-South-Africa", lat: -26.2041, lng: 28.0473, radius: 40000 },
          { name: "Cape-Town-South-Africa", lat: -33.9249, lng: 18.4241, radius: 35000 },
        ];

        for (const query of this.DISCOVERY_SOURCES[0].searchQueries) {
          for (const center of regionCenters) {
            try {
              // Use Places API (New) text search
              const places = await PlacesApiNewService.textSearch(
                query,
                googleApiKey,
                { lat: center.lat, lng: center.lng },
                center.radius
              );

              if (places.length > 0) {
                for (const place of places.slice(0, 6)) { // limit per region per query
                  const details = await PlacesApiNewService.getPlaceDetails(place.id, googleApiKey);
                  if (!details) continue;

                  const images = details.photos ? details.photos.map((photo: any) =>
                    `/api/proxy/google-photo?photoreference=${photo.name}&maxwidth=400&locationName=${encodeURIComponent(details.displayName.text)}&cuisine=${encodeURIComponent((details.types || []).join(','))}`
                  ) : [];

                  const reviews: Review[] = details.reviews ? details.reviews.slice(0, 5).map((r: any) => ({
                    id: crypto.randomUUID(),
                    location_id: '',
                    author: r.authorAttribution.displayName,
                    rating: r.rating,
                    text: r.text.text,
                    date_posted: new Date(),
                    status: 'approved' as const,
                  })) : [];

                  locations.push({
                    name: details.displayName.text,
                    address: details.formattedAddress,
                    coordinates: {
                      lat: details.location.latitude,
                      lng: details.location.longitude,
                    },
                    phone: details.nationalPhoneNumber,
                    website: details.websiteUri,
                    rating: details.rating,
                    reviewCount: details.userRatingCount,
                    images,
                    reviews,
                    priceRange: this.mapPriceLevel(typeof details.priceLevel === 'string' ? parseInt(details.priceLevel) : details.priceLevel),
                    isOpenNow: details.regularOpeningHours?.openNow ?? false,
                    discoverySource: "google-places-api",
                    sourceUrl: `https://maps.google.com/place/${place.id}`,
                  });
                }
              }
            } catch (error) {
              console.error(`Error in textsearch for query "${query}" @ ${center.name}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error in discoverFromAPIs:", error);
    }

    return locations;
  }

  /**
   * Discover locations through enhanced web scraping with fallbacks
   */
  static async discoverFromWebScraping(): Promise<Partial<AmalaLocation>[]> {
    console.log('🔍 Starting enhanced web scraping discovery...');
    
    // Define scraping targets with enhanced configuration
    const scrapingTargets: ScrapingTarget[] = [
      {
        url: 'https://www.nairaland.com/search',
        type: 'directory',
        searchQueries: ['amala restaurant lagos', 'amala spot nigeria', 'best amala place'],
        selectors: {
          name: '.post-title, .thread-title, h3',
          address: '.location, .address',
        },
        fallbackStrategy: 'alternative-scraper'
      },
      {
        url: 'https://www.pulse.ng/lifestyle/food-travel-arts',
        type: 'blog',
        searchQueries: ['amala restaurant', 'nigerian food spots'],
        selectors: {
          name: 'h1, h2, .article-title',
          address: '.location, .venue',
        },
        fallbackStrategy: 'api'
      },
      {
        url: 'https://www.tripadvisor.com/Restaurants',
        type: 'review-site',
        searchQueries: ['amala', 'nigerian restaurant'],
        selectors: {
          name: '.restaurant-name, h3',
          address: '.address, .location',
          rating: '.rating, .stars',
        },
        fallbackStrategy: 'alternative-scraper'
      },
      {
        url: 'https://www.jumia.com.ng/restaurants',
        type: 'directory',
        searchQueries: ['amala'],
        selectors: {
          name: '.restaurant-name, .name',
          address: '.address',
          phone: '.phone',
        },
        fallbackStrategy: 'skip'
      }
    ];

    try {
      // Use enhanced scraping service with multiple fallback strategies
      const results = await EnhancedScrapingService.scrapeMultipleTargets(scrapingTargets, 2);
      
      const allLocations: Partial<AmalaLocation>[] = [];
      
      results.forEach(result => {
        if (result.success && result.locations.length > 0) {
          console.log(`✅ Successfully scraped ${result.locations.length} locations from ${result.source} using ${result.strategy} strategy`);
          
          const processedLocations = result.locations.map(loc => ({
            ...loc,
            discoverySource: 'web-scraping' as const,
            sourceUrl: result.source,
            description: `[Auto-discovered via enhanced scraping from ${result.source} using ${result.strategy} strategy]`,
          }));
          
          allLocations.push(...processedLocations);
        } else {
          console.log(`❌ Failed to scrape from ${result.source}: ${result.error}`);
        }
      });

      console.log(`🎯 Enhanced scraping completed: ${allLocations.length} total locations discovered`);
      return allLocations;
      
    } catch (error) {
      console.error('❌ Enhanced web scraping failed:', error);
      
      // Fallback to original scraping service
      console.log('🔄 Falling back to original scraping service...');
      try {
        const scraped = await WebScrapingService.discoverLocationsParallel(2);
        return scraped.map(loc => ({
          ...loc,
          discoverySource: 'web-scraping' as const,
          sourceUrl: loc.sourceUrl || 'scraped-content',
        }));
      } catch (fallbackError) {
        console.error('❌ Fallback scraping also failed:', fallbackError);
        return [];
      }
    }
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
          '#Amala OR #AmalaNigeria lang:en',
          'amala restaurant -is:retweet',
          'best amala -is:retweet',
          'ewedu gbegiri -is:retweet',
          'Yoruba food -is:retweet',
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
              const originalText = tweet.text || "";
              const lowerText = originalText.toLowerCase();
              // Simple extraction: look for potential location names (capitalized words)
              const potentialName = originalText.match(/([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,3})\s+(restaurant|bukka|spot|place)/)?.[1] || '';
              if (potentialName) {
                socialDiscoveries.push({
                  name: potentialName,
                  address: "",
                  coordinates: (this.detailsFromTweetGeo(tweet) || undefined) as any,
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

    return socialDiscoveries;
  }

  // Try to infer coordinates from tweet if available
  private static detailsFromTweetGeo(tweet: any): { lat: number; lng: number } | null {
    try {
      const lat = tweet?.geo?.coordinates?.coordinates?.[1];
      const lng = tweet?.geo?.coordinates?.coordinates?.[0];
      if (typeof lat === 'number' && typeof lng === 'number') return { lat, lng };
    } catch {}
    return null;
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
      address: location.address || "Unknown address",
      coordinates: location.coordinates || { lat: 20, lng: 0 },
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
