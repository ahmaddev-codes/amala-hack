import { AmalaLocation, LocationFilter } from "@/types/location";

export interface SearchResult {
  locations: AmalaLocation[];
  totalCount: number;
  searchTime: number;
  suggestions: string[];
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  includeInactive?: boolean;
  sortBy?: "relevance" | "distance" | "rating" | "name";
  sortOrder?: "asc" | "desc";
}

export class SearchService {
  private static searchCache = new Map<string, SearchResult>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Real-time search with debouncing and caching
   */
  static async searchLocations(
    query: string,
    locations: AmalaLocation[],
    filters: LocationFilter = {},
    options: SearchOptions = {}
  ): Promise<SearchResult> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(query, filters, options);

    // Check cache first
    const cached = this.searchCache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }

    try {
      let filteredLocations = [...locations];

      // Apply basic filters first
      filteredLocations = this.applyFilters(filteredLocations, filters);

      // Apply search query
      if (query.trim()) {
        filteredLocations = this.performSearch(filteredLocations, query);
      }

      // Sort results
      filteredLocations = this.sortResults(
        filteredLocations,
        options.sortBy || "relevance",
        query
      );

      // Apply pagination
      const { limit = 50, offset = 0 } = options;
      const paginatedResults = filteredLocations.slice(offset, offset + limit);

      const result: SearchResult = {
        locations: paginatedResults,
        totalCount: filteredLocations.length,
        searchTime: Date.now() - startTime,
        suggestions: this.generateSuggestions(query, locations),
      };

      // Cache the result
      this.searchCache.set(cacheKey, {
        ...result,
        timestamp: Date.now(),
      } as any);

      return result;
    } catch (error) {
      return {
        locations: [],
        totalCount: 0,
        searchTime: Date.now() - startTime,
        suggestions: [],
      };
    }
  }

  /**
   * Get search suggestions based on query
   */
  static generateSuggestions(
    query: string,
    locations: AmalaLocation[]
  ): string[] {
    if (!query.trim()) return [];

    const suggestions = new Set<string>();
    const queryLower = query.toLowerCase();

    // Add location name suggestions
    locations.forEach((location) => {
      if (location.name.toLowerCase().includes(queryLower)) {
        suggestions.add(location.name);
      }
    });

    // Add cuisine type suggestions
    locations.forEach((location) => {
      location.cuisine.forEach((cuisine) => {
        if (cuisine.toLowerCase().includes(queryLower)) {
          suggestions.add(cuisine);
        }
      });
    });

    // Add area suggestions from addresses
    locations.forEach((location) => {
      const addressParts = location.address.split(",");
      addressParts.forEach((part) => {
        const trimmed = part.trim();
        if (trimmed.toLowerCase().includes(queryLower) && trimmed.length > 3) {
          suggestions.add(trimmed);
        }
      });
    });

    return Array.from(suggestions).slice(0, 5);
  }

  private static performSearch(
    locations: AmalaLocation[],
    query: string
  ): AmalaLocation[] {
    const queryLower = query.toLowerCase().trim();
    const searchTerms = queryLower.split(/\s+/);

    return locations
      .map((location) => ({
        location,
        score: this.calculateRelevanceScore(location, searchTerms, queryLower),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.location);
  }

  private static calculateRelevanceScore(
    location: AmalaLocation,
    searchTerms: string[],
    fullQuery: string
  ): number {
    let score = 0;
    const weights = {
      exactNameMatch: 100,
      nameContains: 50,
      nameStartsWith: 75,
      cuisineMatch: 30,
      addressMatch: 20,
      descriptionMatch: 10,
      multiTermBonus: 25,
    };

    const name = location.name.toLowerCase();
    const address = location.address.toLowerCase();
    const description = location.description?.toLowerCase() || "";
    const cuisine = location.cuisine.join(" ").toLowerCase();

    // Exact name match
    if (name === fullQuery) {
      score += weights.exactNameMatch;
    }

    // Name starts with query
    if (name.startsWith(fullQuery)) {
      score += weights.nameStartsWith;
    }

    // Name contains query
    if (name.includes(fullQuery)) {
      score += weights.nameContains;
    }

    // Individual term matching
    let matchedTerms = 0;
    searchTerms.forEach((term) => {
      if (name.includes(term)) {
        score += weights.nameContains / searchTerms.length;
        matchedTerms++;
      }
      if (cuisine.includes(term)) {
        score += weights.cuisineMatch / searchTerms.length;
        matchedTerms++;
      }
      if (address.includes(term)) {
        score += weights.addressMatch / searchTerms.length;
        matchedTerms++;
      }
      if (description.includes(term)) {
        score += weights.descriptionMatch / searchTerms.length;
        matchedTerms++;
      }
    });

    // Bonus for matching multiple terms
    if (matchedTerms > 1) {
      score += weights.multiTermBonus * (matchedTerms - 1);
    }

    // Boost for popular locations
    if (location.rating && location.rating > 4.0) {
      score *= 1.2;
    }

    // Boost for currently open locations
    if (location.isOpenNow) {
      score *= 1.1;
    }

    return score;
  }

  private static applyFilters(
    locations: AmalaLocation[],
    filters: LocationFilter
  ): AmalaLocation[] {
    return locations.filter((location) => {
      // Open now filter
      if (
        filters.isOpenNow !== undefined &&
        location.isOpenNow !== filters.isOpenNow
      ) {
        return false;
      }

      // Service type filter
      if (filters.serviceType && filters.serviceType !== "all") {
        if (
          location.serviceType !== filters.serviceType &&
          location.serviceType !== "both"
        ) {
          return false;
        }
      }

      // Price range filter
      if (filters.priceRange && filters.priceRange.length > 0) {
        if (!filters.priceRange.includes(location.priceRange)) {
          return false;
        }
      }

      // Cuisine filter
      if (filters.cuisine && filters.cuisine.length > 0) {
        const hasMatchingCuisine = filters.cuisine.some((filterCuisine) =>
          location.cuisine.some((locationCuisine) =>
            locationCuisine.toLowerCase().includes(filterCuisine.toLowerCase())
          )
        );
        if (!hasMatchingCuisine) return false;
      }

      // Dietary filter
      if (filters.dietary && filters.dietary.length > 0) {
        const hasMatchingDietary = filters.dietary.some((filterDiet) =>
          location.dietary.includes(filterDiet as any)
        );
        if (!hasMatchingDietary) return false;
      }

      // Features filter
      if (filters.features && filters.features.length > 0) {
        const hasMatchingFeature = filters.features.some((filterFeature) =>
          location.features.includes(filterFeature as any)
        );
        if (!hasMatchingFeature) return false;
      }

      // Bounds filter (geographic)
      if (filters.bounds) {
        const { lat, lng } = location.coordinates;
        const { north, south, east, west } = filters.bounds;
        if (lat > north || lat < south || lng > east || lng < west) {
          return false;
        }
      }

      return true;
    });
  }

  private static sortResults(
    locations: AmalaLocation[],
    sortBy: string,
    query?: string
  ): AmalaLocation[] {
    switch (sortBy) {
      case "rating":
        return locations.sort((a, b) => (b.rating || 0) - (a.rating || 0));

      case "name":
        return locations.sort((a, b) => a.name.localeCompare(b.name));

      case "distance":
        // Would need user location for proper distance sorting
        return locations;

      case "relevance":
      default:
        // Already sorted by relevance in performSearch
        return locations;
    }
  }

  private static generateCacheKey(
    query: string,
    filters: LocationFilter,
    options: SearchOptions
  ): string {
    return JSON.stringify({ query, filters, options });
  }

  private static isCacheValid(cached: any): boolean {
    return cached.timestamp && Date.now() - cached.timestamp < this.CACHE_TTL;
  }

  /**
   * Clear search cache
   */
  static clearCache(): void {
    this.searchCache.clear();
  }

  /**
   * Get popular search terms
   */
  static getPopularSearches(locations: AmalaLocation[]): string[] {
    const termFrequency = new Map<string, number>();

    locations.forEach((location) => {
      // Count cuisine types
      location.cuisine.forEach((cuisine) => {
        termFrequency.set(cuisine, (termFrequency.get(cuisine) || 0) + 1);
      });

      // Count location areas
      const addressParts = location.address.split(",");
      addressParts.forEach((part) => {
        const trimmed = part.trim();
        if (trimmed.length > 3) {
          termFrequency.set(trimmed, (termFrequency.get(trimmed) || 0) + 1);
        }
      });
    });

    return Array.from(termFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([term]) => term);
  }
}
