import { AmalaLocation, Review } from "@/types/location";
import puppeteer from "puppeteer";
import axios from "axios";
import { randomUUID } from "node:crypto";
import { PlacesApiNewService } from "./places-api-new";

type Hours = AmalaLocation["hours"];

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
      baseUrl: "https://places.googleapis.com/v1/places",
      searchEndpoint: ":searchText",
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
    // Nigerian Sources
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
      searchQueries: [
        "amala restaurant lagos",
        "best amala spots nigeria",
        "yoruba food nigeria",
      ],
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
      searchQueries: [
        "amala restaurant lagos",
        "where to eat amala",
        "best amala spots",
      ],
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
      searchQueries: [
        "amala restaurant",
        "nigerian food lagos",
        "traditional yoruba food",
      ],
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
      searchQueries: ["amala", "nigerian food", "yoruba cuisine"],
    },

    // Global TripAdvisor Sources
    {
      url: "https://www.tripadvisor.com/Restaurants",
      type: "review-site",
      selectors: {
        name: ".restaurant-name, h3, [data-test='restaurant-name']",
        address: ".address, [data-test='address']",
        rating: ".rating, [data-test='rating']",
        price: ".price, .cost-range, [data-test='price']",
        reviews: ".review-container, .review-text, .review-body",
      },
      searchQueries: [
        "amala",
        "nigerian cuisine",
        "west african food",
        "yoruba food",
      ],
    },

    // Global Yelp Sources
    {
      url: "https://www.yelp.com/search",
      type: "review-site",
      selectors: {
        name: ".business-name, h3, [data-testid='business-name']",
        address: ".address, [data-testid='address']",
        rating: ".rating, [data-testid='rating']",
        price: ".price-range, [data-testid='price']",
        reviews: ".review-content, [data-testid='review']",
      },
      searchQueries: [
        "amala",
        "nigerian food",
        "west african cuisine",
        "african restaurant",
      ],
    },

    // Global Zomato Sources
    {
      url: "https://www.zomato.com/search",
      type: "directory",
      selectors: {
        name: ".restaurant-name, h4, [data-testid='restaurant-name']",
        address: ".address, [data-testid='address']",
        phone: ".contact-info, [data-testid='phone']",
        rating: ".rating, [data-testid='rating']",
        price: ".cost-for-two, [data-testid='cost']",
        reviews: ".review-text, [data-testid='review']",
      },
      searchQueries: [
        "amala",
        "nigerian food",
        "african cuisine",
        "west african food",
      ],
    },

    // UK/Europe Sources
    {
      url: "https://www.timeout.com/london/restaurants",
      type: "blog",
      selectors: {
        name: ".restaurant-name, h3, .venue-name",
        address: ".address, .location",
        phone: ".contact-info",
        rating: ".rating, .stars",
        price: ".price",
        reviews: ".review-text, .comment",
      },
      searchQueries: [
        "nigerian restaurant london",
        "west african food london",
        "amala london",
      ],
    },
    {
      url: "https://www.opentable.co.uk/london-restaurant-listings",
      type: "directory",
      selectors: {
        name: ".restaurant-name, h3",
        address: ".address",
        phone: ".phone",
        rating: ".rating",
        price: ".price-range",
        reviews: ".review",
      },
      searchQueries: [
        "nigerian cuisine",
        "west african food",
        "african restaurant",
      ],
    },

    // US Sources
    {
      url: "https://www.zagat.com/search",
      type: "review-site",
      selectors: {
        name: ".restaurant-name, h3",
        address: ".address",
        rating: ".rating",
        price: ".price",
        reviews: ".review-text",
      },
      searchQueries: [
        "nigerian restaurant",
        "west african cuisine",
        "african food",
      ],
    },
    {
      url: "https://foursquare.com/explore",
      type: "directory",
      selectors: {
        name: ".venue-name, h3",
        address: ".address",
        rating: ".rating",
        price: ".price",
        reviews: ".tip, .review",
      },
      searchQueries: [
        "nigerian food",
        "west african restaurant",
        "african cuisine",
      ],
    },

    // Canada Sources
    {
      url: "https://www.blogto.com/eat_drink/",
      type: "blog",
      selectors: {
        name: ".restaurant-name, h3",
        address: ".address, .location",
        phone: ".contact",
        rating: ".rating",
        price: ".price",
        reviews: ".comment, .review",
      },
      searchQueries: [
        "nigerian restaurant toronto",
        "west african food toronto",
        "african cuisine canada",
      ],
    },

    // Australia Sources
    {
      url: "https://www.urbanspoon.com/search",
      type: "directory",
      selectors: {
        name: ".restaurant-name, h3",
        address: ".address",
        rating: ".rating",
        price: ".price",
        reviews: ".review",
      },
      searchQueries: [
        "nigerian restaurant sydney",
        "west african food australia",
        "african cuisine melbourne",
      ],
    },

    // General Food Blog Sources
    {
      url: "https://www.foodnetwork.com/restaurants",
      type: "blog",
      selectors: {
        name: ".restaurant-name, h3",
        address: ".address",
        rating: ".rating",
        price: ".price",
        reviews: ".review, .comment",
      },
      searchQueries: [
        "nigerian cuisine",
        "west african food",
        "traditional african dishes",
      ],
    },
    {
      url: "https://www.eater.com/maps",
      type: "blog",
      selectors: {
        name: ".restaurant-name, h3",
        address: ".address",
        rating: ".rating",
        price: ".price",
        reviews: ".review",
      },
      searchQueries: [
        "nigerian restaurant",
        "west african cuisine",
        "african food guide",
      ],
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
                priceMin: location.priceMin || 150000,
                priceMax: location.priceMax || 400000,
                currency: location.currency || "NGN",
                priceInfo: location.priceInfo || "₦1,500-4,000 per person",
                cuisine: location.cuisine || ["Nigerian"],
                dietary: location.dietary || [],
                features: location.features || [],
                hours:
                  location.hours || WebScrapingService.generateDefaultHours(),
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
        const query = target.searchQueries[0]
          .toLowerCase()
          .replace(/\s+/g, "+");
        if (scrapeUrl.includes("?")) {
          scrapeUrl += `&q=${query}`;
        } else {
          scrapeUrl += `?q=${query}`;
        }
      }

      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      );
      await page.goto(scrapeUrl, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      await new Promise((r) => setTimeout(r, 3000));

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
        const nameSelectors = selectors.name
          ? selectors.name
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];
        const allNames: string[] = [];
        for (const sel of nameSelectors) {
          const els = document.querySelectorAll(sel);
          for (const el of Array.from(els)) {
            const text = el.textContent?.trim();
            if (
              text &&
              text.length > 2 &&
              !allNames.some((n) => n.includes(text))
            ) {
              allNames.push(text);
            }
          }
        }

        // Extract addresses
        const addressSelectors = selectors.address
          ? selectors.address
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];
        const allAddresses: string[] = [];
        for (const sel of addressSelectors) {
          const els = document.querySelectorAll(sel);
          for (const el of Array.from(els)) {
            const text = el.textContent?.trim();
            if (
              text &&
              text.length > 5 &&
              text.toLowerCase().includes("lagos")
            ) {
              allAddresses.push(text);
            }
          }
        }

        // Extract phones
        const phoneSelectors = selectors.phone
          ? selectors.phone
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];
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
        const websiteSelectors = selectors.website
          ? selectors.website
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];
        const allWebsites: string[] = [];
        for (const sel of websiteSelectors) {
          const els = document.querySelectorAll(sel);
          for (const el of Array.from(els)) {
            let text = el.textContent?.trim();
            if (!text) {
              const href = el.getAttribute("href");
              if (href && (href.startsWith("http") || href.includes("www"))) {
                text = href;
              }
            }
            if (text && (text.startsWith("http") || text.includes("www."))) {
              allWebsites.push(text);
            }
          }
        }

        // Extract ratings
        const ratingSelectors = selectors.rating
          ? selectors.rating
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];
        const allRatings: string[] = [];
        for (const sel of ratingSelectors) {
          const els = document.querySelectorAll(sel);
          for (const el of Array.from(els)) {
            const text = el.textContent?.trim();
            if (text && (text.includes(".") || text.match(/^\d+\.?\d*$/))) {
              allRatings.push(text);
            }
          }
        }

        // Extract prices with better pattern matching
        const priceSelectors = selectors.price
          ? selectors.price
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];
        const allPrices: string[] = [];
        for (const sel of priceSelectors) {
          const els = document.querySelectorAll(sel);
          for (const el of Array.from(els)) {
            const text = el.textContent?.trim() || "";
            // Look for price patterns in text
            const priceMatches =
              text.match(
                /₦?(\d+(?:,\d+)?(?:\.\d+)?)(?:\s*-\s*₦?(\d+(?:,\d+)?(?:\.\d+)?))?(?:\s*per\s*(plate|person|meal|dish))?/i
              ) || [];
            if (priceMatches.length > 0) {
              allPrices.push(priceMatches.join(" "));
            } else if (text.includes("₦") || text.match(/\d+\s*-\s*\d+/)) {
              allPrices.push(text);
            }
          }
        }

        // Extract reviews
        const reviewSelectors = selectors.reviews
          ? selectors.reviews
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [".review", ".comment", ".testimonial"];
        const allReviews: Array<{
          author?: string;
          rating?: number;
          text?: string;
        }> = [];
        for (const sel of reviewSelectors) {
          const els = document.querySelectorAll(sel);
          for (const el of Array.from(els)) {
            const authorEl = el.querySelector?.(
              '[class*="author"], [class*="name"], .reviewer'
            );
            const author = authorEl?.textContent?.trim() || "Anonymous";
            const ratingEl = el.querySelector?.(
              '[class*="star"], [class*="rating"]'
            );
            const ratingText = ratingEl?.textContent?.trim();
            const rating = ratingText ? parseFloat(ratingText) || 4 : 4;
            const textEl = el.querySelector?.(
              '[class*="text"], [class*="body"], p'
            );
            const text = textEl?.textContent?.trim();
            if (text && text.length > 10) {
              allReviews.push({ author, rating, text });
            }
          }
        }

        const numResults = Math.min(3, allNames.length);
        for (let i = 0; i < numResults; i++) {
          const name = allNames[i] || "";
          const address = allAddresses[i] || allAddresses[0] || "";
          const phone = allPhones[i] || allPhones[0] || "";
          const rating = allRatings[i] || "";
          const website = allWebsites[i] || allWebsites[0] || "";
          const price = allPrices[i] || "";

          if (name) {
            results.push({ name, address, phone, rating, price, website });
          }
        }

        return { results, allPrices, allReviews };
      }, target.selectors);

      await browser.close();

      const { results, allPrices, allReviews } = extractedData;

      const locations: Partial<AmalaLocation>[] = results.map(
        (
          data: {
            name?: string;
            address?: string;
            phone?: string;
            rating?: string;
            price?: string;
            website?: string;
          },
          index: number
        ) => {
          const priceText = allPrices[index] || data.price || "";
          const realPrice = WebScrapingService.extractRealPrice(priceText);
          const locationReviews = allReviews.slice(0, 5).map(
            (r) =>
              ({
                id: randomUUID(),
                location_id: "", // Set later when inserting to DB
                author: r.author || "Anonymous",
                rating: r.rating || 4,
                text: r.text || "",
                date_posted: new Date(),
                status: "approved" as const,
              } as Review)
          );

          return {
            name: data.name || "Unknown",
            address: data.address || "Lagos, Nigeria",
            phone: data.phone,
            rating: data.rating ? parseFloat(data.rating) : undefined,
            reviewCount: locationReviews.length,
            reviews: locationReviews,
            priceInfo: realPrice,
            priceRange: realPrice
              ? WebScrapingService.mapToPriceLevel(realPrice)
              : "$$",
            description: `Auto-discovered via web scraping from ${target.url}${
              realPrice ? ` (Price: ${realPrice})` : ""
            }`,
            coordinates: { lat: 6.5244, lng: 3.3792 },
            discoverySource: "web-scraping",
            sourceUrl: target.url,
            serviceType: "both",
            website: data.website,
            cuisine: ["Nigerian"],
            isOpenNow: true,
          };
        }
      );

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
              const details = await WebScrapingService.fetchPlaceDetails(
                placeId,
                apiKey
              );
              if (details) {
                // Update with Google data (Places API New format)
                const images = details.photos
                  ? details.photos.map(
                      (photo: any) =>
                        `/api/proxy/google-photo?photoreference=${
                          photo.name
                        }&maxwidth=400&locationName=${encodeURIComponent(
                          details.displayName.text
                        )}&cuisine=${encodeURIComponent(
                          (details.types || []).join(",")
                        )}`
                    )
                  : loc.images || [];

                const reviews: Review[] = details.reviews
                  ? details.reviews?.map((r: any) => ({
                      id: randomUUID(),
                      location_id: "",
                      author: r.authorAttribution?.displayName || "Anonymous",
                      rating: r.rating || 0,
                      text: r.text?.text || "",
                      date_posted: new Date(),
                      status: "approved" as const,
                    })).filter((review: any) => review.text.length > 0)
                  : loc.reviews || [];

                const rating =
                  details.rating ||
                  (typeof loc.rating === "number"
                    ? loc.rating
                    : typeof loc.rating === "string"
                    ? parseFloat(loc.rating)
                    : undefined);
                const reviewCount =
                  details.userRatingCount ||
                  (loc as any).reviewCount ||
                  reviews.length;

                // Parse opening hours
                let hours: Hours | undefined;
                const isOpenNow =
                  details.regularOpeningHours?.openNow ??
                  loc.isOpenNow ??
                  false;
                if (details.regularOpeningHours?.periods) {
                  hours = WebScrapingService.parseGoogleHours(
                    details.regularOpeningHours.periods
                  );
                }

                // Service type inference
                let serviceType = loc.serviceType || "both";
                if (details.types) {
                  if (
                    details.types.includes("meal_takeaway") ||
                    details.types.includes("meal_delivery")
                  ) {
                    serviceType = "takeaway";
                  } else if (details.types.includes("restaurant")) {
                    serviceType = "dine-in";
                  }
                }

                // Price range - convert to new pricing system
                const priceLevel = details.priceLevel;
                let priceMin = loc.priceMin || 150000;
                let priceMax = loc.priceMax || 400000;
                const currency = loc.currency || "NGN";
                let priceInfo = loc.priceInfo || "₦1,500-4,000 per person";

                if (priceLevel !== undefined) {
                  // Convert Google Places price level to our pricing system
                  if (priceLevel === "PRICE_LEVEL_FREE") {
                    priceMin = 0;
                    priceMax = 0;
                    priceInfo = "Free";
                  } else if (priceLevel === "PRICE_LEVEL_INEXPENSIVE") {
                    priceMin = 50000; // ₦500
                    priceMax = 150000; // ₦1,500
                    priceInfo = "₦500-1,500 per person";
                  } else if (priceLevel === "PRICE_LEVEL_MODERATE") {
                    priceMin = 150000; // ₦1,500
                    priceMax = 400000; // ₦4,000
                    priceInfo = "₦1,500-4,000 per person";
                  } else if (priceLevel === "PRICE_LEVEL_EXPENSIVE") {
                    priceMin = 400000; // ₦4,000
                    priceMax = 800000; // ₦8,000
                    priceInfo = "₦4,000-8,000 per person";
                  } else {
                    priceMin = 800000; // ₦8,000+
                    priceMax = 1500000; // ₦15,000
                    priceInfo = "₦8,000-15,000 per person";
                  }
                }

                // Coordinates
                const coordinates = details.location
                  ? {
                      lat: details.location.latitude,
                      lng: details.location.longitude,
                    }
                  : loc.coordinates;

                // Phone and website
                const phone = details.nationalPhoneNumber || loc.phone;
                const website = details.websiteUri || (loc as any).website;

                // Description
                const description =
                  loc.description ||
                  `Auto-discovered via web scraping from ${target.url}`;

                locations[i] = {
                  ...loc,
                  images,
                  reviews,
                  rating,
                  reviewCount,
                  hours,
                  isOpenNow,
                  serviceType,
                  priceMin,
                  priceMax,
                  currency,
                  priceInfo,
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

      return locations.filter(
        (loc) =>
          loc.name &&
          (loc.name.toLowerCase().includes("amala") ||
            loc.name.toLowerCase().includes("restaurant"))
      );
    } catch (error) {
      console.error(`❌ Scraping failed for ${target.url}:`, error);
      return [];
    }
  }

  private static async findPlaceId(
    query: string,
    apiKey: string
  ): Promise<string | null> {
    // Use Places API (New) service instead of direct API calls
    return await PlacesApiNewService.findPlaceId(query, apiKey);
  }

  private static async fetchPlaceDetails(
    placeId: string,
    apiKey: string
  ): Promise<any> {
    // Use Places API (New) service instead of direct API calls
    return await PlacesApiNewService.getPlaceDetails(placeId, apiKey);
  }

  private static parseGoogleHours(periods: any[]): Hours {
    const dayMap: { [key: number]: string } = {
      0: "sunday",
      1: "monday",
      2: "tuesday",
      3: "wednesday",
      4: "thursday",
      5: "friday",
      6: "saturday",
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

    periods.forEach((period) => {
      const openDay = dayMap[period.open.day];
      const closeDay = period.close ? dayMap[period.close.day] : openDay;
      const openTime = WebScrapingService.formatTime(period.open.time);
      const closeTime = period.close
        ? WebScrapingService.formatTime(period.close.time)
        : "23:00";

      if (openDay) {
        hours[openDay] = { open: openTime, close: closeTime, isOpen: false };
      }

      // Handle overnight or multi-day, but simplify for now
    });

    return hours;
  }

  private static formatTime(timeStr: string): string {
    if (!timeStr || typeof timeStr !== 'string') {
      return '00:00'; // fallback for undefined/null
    }
    if (timeStr.length === 4) {
      return `${timeStr.substring(0, 2)}:${timeStr.substring(2)}`;
    }
    return timeStr; // fallback
  }

  private static extractRealPrice(priceText: string): string | undefined {
    // Extract and format real price ranges
    const match = priceText.match(
      /₦?(\d+(?:,\d+)?(?:\.\d+)?)(?:\s*-\s*₦?(\d+(?:,\d+)?(?:\.\d+)?))?/i
    );
    if (match) {
      const low = match[1].replace(/,/g, "");
      const high = match[2] ? match[2].replace(/,/g, "") : low;
      return `₦${parseFloat(low)} - ₦${parseFloat(high)}`;
    }
    // Fallback patterns
    if (priceText.includes("per plate") || priceText.includes("per person")) {
      const numMatch = priceText.match(/₦?(\d+(?:,\d+)?)/i);
      if (numMatch) {
        return `₦${numMatch[1].replace(/,/g, "")} per person`;
      }
    }
    return priceText.includes("₦") ? priceText : undefined;
  }

  private static mapToPriceLevel(
    realPrice: string
  ): "$" | "$$" | "$$$" | "$$$$" {
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

  private static mapExtractedPrice(
    priceText: string
  ): "$" | "$$" | "$$$" | "$$$$" {
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
