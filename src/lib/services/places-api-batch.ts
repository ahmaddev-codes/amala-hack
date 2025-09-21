/**
 * Batched Google Places API Service
 * Reduces API calls by batching requests and implementing smart caching
 */

import { PlacesApiNewService, PlacesApiNewPlace } from './places-api';
import { memoryCache, CacheKeys } from '@/lib/cache/memory-cache';

interface BatchRequest {
  address: string;
  resolve: (placeId: string | null) => void;
  reject: (error: Error) => void;
}

interface BatchDetailsRequest {
  placeId: string;
  resolve: (details: PlacesApiNewPlace | null) => void;
  reject: (error: Error) => void;
}

export class BatchedPlacesApiService {
  private static placeIdBatch: BatchRequest[] = [];
  private static detailsBatch: BatchDetailsRequest[] = [];
  private static batchTimeout: NodeJS.Timeout | null = null;
  private static detailsTimeout: NodeJS.Timeout | null = null;
  private static readonly BATCH_SIZE = 10;
  private static readonly BATCH_DELAY = 100; // 100ms delay to collect requests

  /**
   * PERFORMANCE: Batched place ID lookup with caching
   */
  static async findPlaceId(address: string, apiKey: string): Promise<string | null> {
    // Check cache first
    const cacheKey = `place-id:${address.toLowerCase()}`;
    const cached = memoryCache.get<string>(cacheKey);
    if (cached) {
      console.log(`⚡ Cache HIT for place ID: ${address}`);
      return cached;
    }

    return new Promise((resolve, reject) => {
      this.placeIdBatch.push({ address, resolve, reject });

      // Clear existing timeout and set new one
      if (this.batchTimeout) {
        clearTimeout(this.batchTimeout);
      }

      this.batchTimeout = setTimeout(async () => {
        await this.processBatch(apiKey);
      }, this.BATCH_DELAY);

      // Process immediately if batch is full
      if (this.placeIdBatch.length >= this.BATCH_SIZE) {
        if (this.batchTimeout) {
          clearTimeout(this.batchTimeout);
        }
        this.processBatch(apiKey);
      }
    });
  }

  /**
   * PERFORMANCE: Batched place details lookup with caching
   */
  static async getPlaceDetails(placeId: string, apiKey: string): Promise<PlacesApiNewPlace | null> {
    // Check cache first
    const cacheKey = `place-details:${placeId}`;
    const cached = memoryCache.get<PlacesApiNewPlace>(cacheKey);
    if (cached) {
      console.log(`⚡ Cache HIT for place details: ${placeId}`);
      return cached;
    }

    return new Promise((resolve, reject) => {
      this.detailsBatch.push({ placeId, resolve, reject });

      // Clear existing timeout and set new one
      if (this.detailsTimeout) {
        clearTimeout(this.detailsTimeout);
      }

      this.detailsTimeout = setTimeout(async () => {
        await this.processDetailsBatch(apiKey);
      }, this.BATCH_DELAY);

      // Process immediately if batch is full
      if (this.detailsBatch.length >= this.BATCH_SIZE) {
        if (this.detailsTimeout) {
          clearTimeout(this.detailsTimeout);
        }
        this.processDetailsBatch(apiKey);
      }
    });
  }

  /**
   * Process batched place ID requests
   */
  private static async processBatch(apiKey: string): Promise<void> {
    const currentBatch = [...this.placeIdBatch];
    this.placeIdBatch = [];
    this.batchTimeout = null;

    console.log(`🔄 Processing batch of ${currentBatch.length} place ID requests`);

    // Process requests with small delays to respect rate limits
    for (let i = 0; i < currentBatch.length; i++) {
      const request = currentBatch[i];
      
      try {
        // Add small delay between requests in batch
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        const placeId = await PlacesApiNewService.findPlaceId(request.address, apiKey);
        
        // Cache the result for 24 hours
        if (placeId) {
          const cacheKey = `place-id:${request.address.toLowerCase()}`;
          memoryCache.set(cacheKey, placeId, 24 * 60 * 60 * 1000);
        }
        
        request.resolve(placeId);
      } catch (error) {
        request.reject(error instanceof Error ? error : new Error('Unknown error'));
      }
    }
  }

  /**
   * Process batched place details requests
   */
  private static async processDetailsBatch(apiKey: string): Promise<void> {
    const currentBatch = [...this.detailsBatch];
    this.detailsBatch = [];
    this.detailsTimeout = null;

    console.log(`🔄 Processing batch of ${currentBatch.length} place details requests`);

    // Process requests with small delays to respect rate limits
    for (let i = 0; i < currentBatch.length; i++) {
      const request = currentBatch[i];
      
      try {
        // Add small delay between requests in batch
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        const details = await PlacesApiNewService.getPlaceDetails(request.placeId, apiKey);
        
        // Cache the result for 24 hours
        if (details) {
          const cacheKey = `place-details:${request.placeId}`;
          memoryCache.set(cacheKey, details, 24 * 60 * 60 * 1000);
        }
        
        request.resolve(details);
      } catch (error) {
        request.reject(error instanceof Error ? error : new Error('Unknown error'));
      }
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  static getCacheStats() {
    const stats = memoryCache.getStats();
    const placeIdCacheKeys = stats.keys.filter(key => key.startsWith('place-id:'));
    const detailsCacheKeys = stats.keys.filter(key => key.startsWith('place-details:'));
    
    return {
      totalCacheSize: stats.size,
      placeIdCacheSize: placeIdCacheKeys.length,
      detailsCacheSize: detailsCacheKeys.length,
      pendingBatches: {
        placeId: this.placeIdBatch.length,
        details: this.detailsBatch.length
      }
    };
  }

  /**
   * Clear all caches (for testing or manual refresh)
   */
  static clearCache(): void {
    memoryCache.clear();
    console.log('🧹 Places API cache cleared');
  }
}
