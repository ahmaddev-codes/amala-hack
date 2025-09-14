import { AmalaLocation, Review } from "@/types/location";
import puppeteer from 'puppeteer';
import axios from "axios";
import { randomUUID } from 'node:crypto';

type Hours = AmalaLocation['hours'];

export interface ScrapingTarget {
  url: string;
  type:
    | "blog"
    | "directory"
    | "social"
    | "review-site"
    | "maps"
    | "business-directory";
  selectors: {
    name?: string;
    address?: string;
    phone?: string;
    website?: string;
    rating?: string;
    reviews?: string;
    price?: string;
  };
  searchQueries?: string[];
}

export interface DiscoverySource {
  name: string;
  baseUrl: string;
  searchEndpoint: string;
  type: "api" | "scraping";
  enabled: boolean;
}

export class WebScrapingService {
  private static readonly DISCOVERY_SOURCES: DiscoverySource[] = [
    {
      name: "Google Places API",
      baseUrl: "https://maps.googleapis.com/maps/api/place",
      searchEndpoint: "/textsearch/json",
      type: "api",
      enabled: true,
    },
    {
      name: "Foursquare Places API",
      baseUrl: "https://api.foursquare.com/v3/places",
      searchEndpoint: "/search",
      type: "api",
      enabled: true,
    },
    {
      name: "Yelp Fusion API",
      baseUrl: "https://api.yelp.com/v3/businesses",
      searchEndpoint: "/search",
      type: "api",
      enabled: true,
    },
  ];

  private static readonly SCRAPING_TARGETS: ScrapingTarget[] = [
    {
      url: "https://www.pulse.ng/lifestyle/food-travel-arts",
      type: "blog",
      selectors: {
        name: ".restaurant-name, .business-name, h3, h4",
        address: ".address, .location, .place",
        phone: ".phone, .contact",
        price: ".price, .cost, .pricing, .budget",
        reviews: ".review, .comment, .testimonial, .user-review",
      },
      searchQueries: ["amala restaurant lagos", "best amala spots nigeria"],
    },
    {
      url: "https://www.nairaland.com/search",
      type: "social",
      selectors: {
        name: ".post-title, .thread-title",
        address: ".location-info, .address",
        price: ".price, .cost",
        reviews: ".post-content, .comment, .reply",
      },
      searchQueries: ["amala restaurant lagos", "where to eat amala"],
    },
    {
      url: "https://guardian.ng/life/food-drink-travel",
      type: "blog",
      selectors: {
        name: ".entry-title, .post-title",
        address: ".location, .address",
        price: ".price, .cost, .pricing",
        reviews: ".comment, .reader-comment, .user-feedback",
      },
      searchQueries: ["amala restaurant", "nigerian food lagos"],
    },
    {
      url: "https://www.jumia.com.ng/restaurants",
      type: "directory",
      selectors: {
        name: ".restaurant-name, .name",
        address: ".address, .location",
        phone: ".phone",
        rating: ".rating",
        price: ".price, .cost, .pricing, .budget",
        reviews: ".review-item, .customer-review",
      },
      searchQueries: ["amala", "nigerian food"],
    },
    {
      url: "https://www.tripadvisor.com/Restaurants-g304026-Lagos_Lagos_State.html",
      type: "review-site",
      selectors: {
        name: ".restaurant-name, h3",
        address: ".address",
        rating: ".rating",
        price: ".price, .cost-range",
        reviews: ".review-container, .review-text, .review-body",
      },
      searchQueries: ["amala", "nigerian cuisine"],
    },
  ];

  static async discoverLocations(): Promise<AmalaLocation[]> {
    try {
      const discoveredLocations: AmalaLocation[] = [];

      // Iterate through real scraping targets
      for (const target of this.SCRAPING_TARGETS) {
        try {
          const locations = await this.scrapeSpecificSite(target);

          // Validate and process discovered locations
          for (const location of locations) {
            const validation = await this.validateDiscoveredLocation(location);
            if (validation.isValid && validation.confidence > 0.5) {
              discoveredLocations.push({
                id: randomUUID(),
                ...location,
                status: "pending",
                submittedAt: new Date(),
                discoverySource: "web-scraping",
                sourceUrl: target.url,
                // Ensure required fields have defaults
                name: location.name || "Unknown Location",
                address: location.address || "Address not specified",
                coordinates: location.coordinates || {
                  lat: 6.5244,
                  lng: 3.3792,
                },
                isOpenNow: location.isOpenNow ?? false,
                serviceType: location.serviceType || "both",
                priceRange: location.priceRange || "$$",
                cuisine: location.cuisine || ["Nigerian"],
                dietary: location.dietary || [],
                features: location.features || [],
                hours: location.hours || WebScrapingService.generateDefaultHours(),
              } as AmalaLocation);
            }
          }
        } catch (error) {
          // Continue with other sources
        }
      }
      return discoveredLocations;
    } catch (error) {
      return [];
    }
  }

  static async scrapeSpecificSite(
    target: ScrapingTarget
  ): Promise<Partial<AmalaLocation>[]> {
    try {
      let scrapeUrl = target.url;
      if (target.searchQueries && target.searchQueries.length > 0) {
        const query = target.searchQueries[0].toLowerCase().replace(/\s+/g, '+');
        if (scrapeUrl.includes('?')) {
          scrapeUrl += `&q=${query}`;
        } else {
          scrapeUrl += `?q=${query}`;
        }
      }

      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      await page.goto(scrapeUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await new Promise(r => setTimeout(r, 3000));
    
      const extractedData = await page.evaluate((selectors) => {
        const results: {
          name?: string;
          address?: string;
          phone?: string;
          website?: string;
          rating?: string;
          price?: string;
        }[] = [];
    
        // Extract names
        const nameSelectors = selectors.name ? selectors.name.split(',').map(s => s.trim()).filter(Boolean) : [];
        const allNames: string[] = [];
        for (const sel of nameSelectors) {
          const els = document.querySelectorAll(sel);
          for (const el of Array.from(els)) {
            const text = el.textContent?.trim();
            if (text && text.length > 2 && !allNames.some(n => n.includes(text))) {
              allNames.push(text);
            }
          }
        }
    
        // Extract addresses
        const addressSelectors = selectors.address ? selectors.address.split(',').map(s => s.trim()).filter(Boolean) : [];
        const allAddresses: string[] = [];
        for (const sel of addressSelectors) {
          const els = document.querySelectorAll(sel);
          for (const el of Array.from(els)) {
            const text = el.textContent?.trim();
            if (text && text.length > 5 && text.toLowerCase().includes('lagos')) {
              allAddresses.push(text);
            }
          }
        }
    
        // Extract phones
        const phoneSelectors = selectors.phone ? selectors.phone.split(',').map(s => s.trim()).filter(Boolean) : [];
        const allPhones: string[] = [];
        for (const sel of phoneSelectors) {
          const els = document.querySelectorAll(sel);
          for (const el of Array.from(els)) {
            const text = el.textContent?.trim();
            if (text && text.match(/\d{10,}/)) {
              allPhones.push(text);
            }
          }
        }
      
        // Extract websites
        const websiteSelectors = selectors.website ? selectors.website.split(',').map(s => s.trim()).filter(Boolean) : [];
        const allWebsites: string[] = [];
        for (const sel of websiteSelectors) {
          const els = document.querySelectorAll(sel);
          for (const el of Array.from(els)) {
            let text = el.textContent?.trim();
            if (!text) {
              const href = el.getAttribute('href');
              if (href && (href.startsWith('http') || href.includes('www'))) {
                text = href;
              }
            }
            if (text && (text.startsWith('http') || text.includes('www.'))) {
              allWebsites.push(text);
            }
          }
        }
      
        // Extract ratings
        const ratingSelectors = selectors.rating ? selectors.rating.split(',').map(s => s.trim()).filter(Boolean) : [];
        const allRatings: string[] = [];
        for (const sel of ratingSelectors) {
          const els = document.querySelectorAll(sel);
          for (const el of Array.from(els)) {
            const text = el.textContent?.trim();
            if (text && (text.includes('.') || text.match(/^\d+\.?\d*$/))) {
              allRatings.push(text);
            }
          }
        }
    
        // Extract prices with better pattern matching
        const priceSelectors = selectors.price ? selectors.price.split(',').map(s => s.trim()).filter(Boolean) : [];
        const allPrices: string[] = [];
        for (const sel of priceSelectors) {
          const els = document.querySelectorAll(sel);
          for (const el of Array.from(els)) {
            const text = el.textContent?.trim() || '';
            // Look for price patterns in text
            const priceMatches = text.match(/₦?(\d+(?:,\d+)?(?:\.\d+)?)(?:\s*-\s*₦?(\d+(?:,\d+)?(?:\.\d+)?))?(?:\s*per\s*(plate|person|meal|dish))?/i) || [];
            if (priceMatches.length > 0) {
              allPrices.push(priceMatches.join(' '));
            } else if (text.includes('₦') || text.match(/\d+\s*-\s*\d+/)) {
              allPrices.push(text);
            }
          }
        }
    
        // Extract reviews
        const reviewSelectors = selectors.reviews ? selectors.reviews.split(',').map(s => s.trim()).filter(Boolean) : ['.review', '.comment', '.testimonial'];
        const allReviews: Array<{
          author?: string;
          rating?: number;
          text?: string;
        }> = [];
        for (const sel of reviewSelectors) {
          const els = document.querySelectorAll(sel);
          for (const el of Array.from(els)) {
            const authorEl = el.querySelector?.('[class*="author"], [class*="name"], .reviewer');
            const author = authorEl?.textContent?.trim() || 'Anonymous';
            const ratingEl = el.querySelector?.('[class*="star"], [class*="rating"]');
            const ratingText = ratingEl?.textContent?.trim();
            const rating = ratingText ? parseFloat(ratingText) || 4 : 4;
            const textEl = el.querySelector?.('[class*="text"], [class*="body"], p');
            const text = textEl?.textContent?.trim();
            if (text && text.length > 10) {
              allReviews.push({ author, rating, text });
            }
          }
        }
    
        const numResults = Math.min(3, allNames.length);
        for (let i = 0; i < numResults; i++) {
          const name = allNames[i] || '';
          const address = allAddresses[i] || allAddresses[0] || '';
          const phone = allPhones[i] || allPhones[0] || '';
          const rating = allRatings[i] || '';
          const website = allWebsites[i] || allWebsites[0] || '';
          const price = allPrices[i] || '';
    
          if (name) {
            results.push({ name, address, phone, rating, price, website });
          }
        }
    
        return { results, allPrices, allReviews };
      }, target.selectors);

      await browser.close();
    
      const { results, allPrices, allReviews } = extractedData;
    
      const locations: Partial<AmalaLocation>[] = results.map((data: { name?: string; address?: string; phone?: string; rating?: string; price?: string; website?: string; }, index: number) => {
        const priceText = allPrices[index] || data.price || '';
        const realPrice = WebScrapingService.extractRealPrice(priceText);
        const locationReviews = allReviews.slice(0, 5).map((r) => ({
          id: randomUUID(),
          location_id: '', // Set later when inserting to DB
          author: r.author || 'Anonymous',
          rating: r.rating || 4,
          text: r.text || '',
          date_posted: new Date(),
          status: 'approved' as const,
        } as Review));
    
        return {
          name: data.name || 'Unknown',
          address: data.address || 'Lagos, Nigeria',
          phone: data.phone,
          rating: data.rating ? parseFloat(data.rating) : undefined,
          reviewCount: locationReviews.length,
          reviews: locationReviews,
          priceInfo: realPrice,
          priceRange: realPrice ? WebScrapingService.mapToPriceLevel(realPrice) : '$$',
          description: `Auto-discovered via web scraping from ${target.url}${realPrice ? ` (Price: ${realPrice})` : ''}`,
          coordinates: { lat: 6.5244, lng: 3.3792 },
          discoverySource: 'web-scraping',
          sourceUrl: target.url,
          serviceType: 'both',
          website: data.website,
          cuisine: ['Nigerian'],
          isOpenNow: true,
        };
      });

      // Enrich with Google Places API
      const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (googleApiKey) {
        const apiKey = googleApiKey;
        for (let i = 0; i < locations.length; i++) {
          const loc = locations[i];
          try {
            const query = `${loc.name} ${loc.address}`;
            const placeId = await WebScrapingService.findPlaceId(query, apiKey);
            if (placeId) {
              const details = await WebScrapingService.fetchPlaceDetails(placeId, apiKey);
              if (details) {
                // Update with Google data
                const images = details.photos ? details.photos.map((photo: any) =>
                  `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${apiKey}`
                ) : loc.images || [];

                const reviews: Review[] = details.reviews ? details.reviews.slice(0, 5).map((r: any) => ({
                  id: randomUUID(),
                  location_id: '',
                  author: r.author_name,
                  rating: r.rating,
                  text: r.text,
                  date_posted: new Date(r.time * 1000),
                  status: 'approved' as const,
                })) : loc.reviews || [];

                const rating = details.rating || (typeof loc.rating === 'number' ? loc.rating : typeof loc.rating === 'string' ? parseFloat(loc.rating) : undefined);
                const reviewCount = details.user_ratings_total || (loc as any).reviewCount || reviews.length;

                // Parse opening hours
                let hours: Hours | undefined;
                const isOpenNow = details.opening_hours?.open_now ?? (loc.isOpenNow ?? false);
                if (details.opening_hours?.periods) {
                  hours = WebScrapingService.parseGoogleHours(details.opening_hours.periods);
                }

                // Service type inference
                let serviceType = loc.serviceType || 'both';
                if (details.types) {
                  if (details.types.includes('meal_takeaway') || details.types.includes('meal_delivery')) {
                    serviceType = 'takeaway';
                  } else if (details.types.includes('restaurant')) {
                    serviceType = 'dine-in';
                  }
                }

                // Price range
                const priceLevel = details.price_level;
                let priceRange = loc.priceRange || '$$';
                if (priceLevel !== undefined) {
                  priceRange = priceLevel === 0 || priceLevel === 1 ? '$' : priceLevel === 2 ? '$$' : priceLevel === 3 ? '$$$' : '$$$$';
                }

                // Coordinates
                const coordinates = details.geometry ? {
                  lat: details.geometry.location.lat,
                  lng: details.geometry.location.lng,
                } : loc.coordinates;

                // Phone and website
                const phone = details.formatted_phone_number || loc.phone;
                const website = details.website || (loc as any).website;

                // Description
                const description = details.editorial_summary?.overview || loc.description || `Auto-discovered via web scraping from ${target.url}`;

                locations[i] = {
                  ...loc,
                  images,
                  reviews,
                  rating,
                  reviewCount,
                  hours,
                  isOpenNow,
                  serviceType,
                  priceRange,
                  coordinates,
                  phone,
                  website,
                  description,
                };
              }
            }
          } catch (enrichError) {
            console.warn(`Failed to enrich location ${loc.name}:`, enrichError);
            // Keep original scraped data
          }
        }
      }

      return locations.filter(loc => loc.name && (loc.name.toLowerCase().includes('amala') || loc.name.toLowerCase().includes('restaurant')));
  } catch (error) {
    console.error(`❌ Scraping failed for ${target.url}:`, error);
    return [];
  }
}

private static async findPlaceId(query: string, apiKey: string): Promise<string | null> {
  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/place/textsearch/json`,
      {
        params: {
          query,
          key: apiKey,
        },
      }
    );
    if (response.data.results && response.data.results.length > 0) {
      return response.data.results[0].place_id;
    }
    return null;
  } catch (error) {
    console.error(`Failed to find place_id for ${query}:`, error);
    return null;
  }
}

private static async fetchPlaceDetails(placeId: string, apiKey: string): Promise<any> {
  try {
    const fields = "name,formatted_address,geometry,photos,reviews,rating,user_ratings_total,opening_hours,price_level,website,formatted_phone_number,types";
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

private static parseGoogleHours(periods: any[]): Hours {
  const dayMap: { [key: number]: string } = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
  };

  const hours: Hours = {
    monday: { open: "08:00", close: "20:00", isOpen: false },
    tuesday: { open: "08:00", close: "20:00", isOpen: false },
    wednesday: { open: "08:00", close: "20:00", isOpen: false },
    thursday: { open: "08:00", close: "20:00", isOpen: false },
    friday: { open: "08:00", close: "20:00", isOpen: false },
    saturday: { open: "09:00", close: "19:00", isOpen: false },
    sunday: { open: "10:00", close: "18:00", isOpen: false },
  };

  periods.forEach(period => {
    const openDay = dayMap[period.open.day];
    const closeDay = period.close ? dayMap[period.close.day] : openDay;
    const openTime = WebScrapingService.formatTime(period.open.time);
    const closeTime = period.close ? WebScrapingService.formatTime(period.close.time) : "23:00";

    if (openDay) {
      hours[openDay] = { open: openTime, close: closeTime, isOpen: false };
    }

    // Handle overnight or multi-day, but simplify for now
  });

  return hours;
}

private static formatTime(timeStr: string): string {
  if (timeStr.length === 4) {
    return `${timeStr.substring(0, 2)}:${timeStr.substring(2)}`;
  }
  return timeStr; // fallback
}

private static extractRealPrice(priceText: string): string | undefined {
    // Extract and format real price ranges
    const match = priceText.match(/₦?(\d+(?:,\d+)?(?:\.\d+)?)(?:\s*-\s*₦?(\d+(?:,\d+)?(?:\.\d+)?))?/i);
    if (match) {
      const low = match[1].replace(/,/g, '');
      const high = match[2] ? match[2].replace(/,/g, '') : low;
      return `₦${parseFloat(low)} - ₦${parseFloat(high)}`;
    }
    // Fallback patterns
    if (priceText.includes('per plate') || priceText.includes('per person')) {
      const numMatch = priceText.match(/₦?(\d+(?:,\d+)?)/i);
      if (numMatch) {
        return `₦${numMatch[1].replace(/,/g, '')} per person`;
      }
    }
    return priceText.includes('₦') ? priceText : undefined;
  }

  private static mapToPriceLevel(realPrice: string): "$" | "$$" | "$$$" | "$$$$" {
    if (!realPrice) return "$$";
    const numMatch = realPrice.match(/₦(\d+)/);
    if (numMatch) {
      const price = parseInt(numMatch[1]);
      if (price < 2000) return "$";
      if (price < 5000) return "$$";
      if (price < 10000) return "$$$";
      return "$$$$";
    }
    return "$$";
  }

  private static mapExtractedPrice(priceText: string): "$" | "$$" | "$$$" | "$$$$" {
    const realPrice = WebScrapingService.extractRealPrice(priceText);
    return WebScrapingService.mapToPriceLevel(realPrice || priceText);
  }

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
    if (!location.name) {
      issues.push("Missing restaurant name");
      confidence -= 0.3;
    }

    if (!location.address) {
      issues.push("Missing address");
      confidence -= 0.3;
    }

    // Check if address looks like a Lagos address
    if (location.address && !location.address.toLowerCase().includes("lagos")) {
      issues.push("Address may not be in Lagos");
      confidence -= 0.2;
    }

    // Check for Amala-related keywords
    const amalaKeywords = ["amala", "ewedu", "gbegiri", "yoruba", "nigerian"];
    const hasAmalaKeyword = amalaKeywords.some(
      (keyword) =>
        location.name?.toLowerCase().includes(keyword) ||
        location.description?.toLowerCase().includes(keyword)
    );

    if (!hasAmalaKeyword) {
      issues.push("May not be an Amala restaurant");
      confidence -= 0.4;
    }

    return {
      isValid: confidence > 0.5,
      confidence: Math.max(0, confidence),
      issues,
    };
  }

  private static generateDefaultHours() {
    return {
      monday: { open: "08:00", close: "20:00", isOpen: false },
      tuesday: { open: "08:00", close: "20:00", isOpen: false },
      wednesday: { open: "08:00", close: "20:00", isOpen: false },
      thursday: { open: "08:00", close: "20:00", isOpen: false },
      friday: { open: "08:00", close: "20:00", isOpen: false },
      saturday: { open: "09:00", close: "19:00", isOpen: false },
      sunday: { open: "10:00", close: "18:00", isOpen: false },
    };
  }

  static async scheduledDiscovery(): Promise<void> {
    // This would be called by a cron job or scheduled function

    try {
      const discovered = await this.discoverLocations();

      for (const location of discovered) {
        const validation = await this.validateDiscoveredLocation(location);

        if (validation.isValid) {
          // In production, save to database with 'pending' status
        } else {
        }
      }
    } catch (error) {}
  }
}
