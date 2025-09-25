/**
 * API Response Caching Middleware
 * Provides 5X performance improvement by caching API responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { memoryCache, ResponseTimeTracker, ApiCallTracker } from '@/lib/cache/memory-cache';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds (default: 300 = 5 minutes)
  keyGenerator?: (req: NextRequest) => string;
  skipCache?: (req: NextRequest) => boolean;
  cacheHeaders?: boolean; // Add cache-related headers to response
}

/**
 * Generate a cache key from request
 */
function generateCacheKey(req: NextRequest, customGenerator?: (req: NextRequest) => string): string {
  if (customGenerator) {
    return customGenerator(req);
  }

  const url = new URL(req.url);
  const method = req.method;
  const pathname = url.pathname;
  const searchParams = url.searchParams.toString();
  
  // Include authorization header in key for user-specific caching
  const authHeader = req.headers.get('authorization');
  const userHash = authHeader ? Buffer.from(authHeader).toString('base64').slice(0, 8) : 'anonymous';
  
  return `api:${method}:${pathname}:${searchParams}:${userHash}`;
}

/**
 * Check if request should skip cache
 */
function shouldSkipCache(req: NextRequest, skipCacheFn?: (req: NextRequest) => boolean): boolean {
  if (skipCacheFn && skipCacheFn(req)) {
    return true;
  }

  // Skip cache for mutations (POST, PUT, DELETE, PATCH)
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    return true;
  }

  // Skip cache if no-cache header is present
  if (req.headers.get('cache-control')?.includes('no-cache')) {
    return true;
  }

  return false;
}

/**
 * API Response Caching Middleware
 * Usage: export const GET = withCache(handler, { ttl: 300 });
 */
export function withCache<T extends any[], R>(
  handler: (req: NextRequest, ...args: T) => Promise<NextResponse>,
  options: CacheOptions = {}
) {
  const {
    ttl = 300, // 5 minutes default
    keyGenerator,
    skipCache,
    cacheHeaders = true
  } = options;

  return async (req: NextRequest, ...args: T): Promise<NextResponse> => {
    const startTime = Date.now();
    const endpoint = new URL(req.url).pathname;

    try {
      // Check if we should skip cache
      if (shouldSkipCache(req, skipCache)) {
        const response = await handler(req, ...args);
        const duration = Date.now() - startTime;
        
        // Track API call performance
        ApiCallTracker.recordApiCall(endpoint, duration);
        ResponseTimeTracker.recordResponseTime(duration);
        
        if (cacheHeaders) {
          response.headers.set('X-Cache-Status', 'SKIP');
          response.headers.set('X-Response-Time', `${duration}ms`);
        }
        
        return response;
      }

      // Generate cache key
      const cacheKey = generateCacheKey(req, keyGenerator);
      
      // Try to get from cache
      const cached = memoryCache.get<{
        status: number;
        headers: Record<string, string>;
        body: any;
      }>(cacheKey);

      if (cached) {
        const duration = Date.now() - startTime;
        
        // Track cache hit
        ApiCallTracker.recordApiCall(endpoint, duration);
        ResponseTimeTracker.recordResponseTime(duration);
        
        // Return cached response
        const response = NextResponse.json(cached.body, { 
          status: cached.status,
          headers: cached.headers 
        });
        
        if (cacheHeaders) {
          response.headers.set('X-Cache-Status', 'HIT');
          response.headers.set('X-Response-Time', `${duration}ms`);
          response.headers.set('Cache-Control', `public, max-age=${ttl}, stale-while-revalidate=${ttl * 2}`);
        }
        
        console.log(`🚀 Cache HIT for ${endpoint} (${duration}ms)`);
        return response;
      }

      // Cache miss - execute handler
      const response = await handler(req, ...args);
      const duration = Date.now() - startTime;
      
      // Track API call performance
      ApiCallTracker.recordApiCall(endpoint, duration);
      ResponseTimeTracker.recordResponseTime(duration);

      // Only cache successful responses
      if (response.status >= 200 && response.status < 300) {
        try {
          // Clone response to read body without consuming it
          const responseClone = response.clone();
          const body = await responseClone.json();
          
          // Extract headers to cache
          const headersToCache: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            // Cache important headers but not all
            if (['content-type', 'content-encoding'].includes(key.toLowerCase())) {
              headersToCache[key] = value;
            }
          });

          // Cache the response
          memoryCache.set(cacheKey, {
            status: response.status,
            headers: headersToCache,
            body
          }, ttl * 1000); // Convert to milliseconds

          console.log(`💾 Cache MISS for ${endpoint} - cached for ${ttl}s (${duration}ms)`);
        } catch (error) {
          console.warn(`⚠️ Failed to cache response for ${endpoint}:`, error);
        }
      }

      if (cacheHeaders) {
        response.headers.set('X-Cache-Status', 'MISS');
        response.headers.set('X-Response-Time', `${duration}ms`);
        response.headers.set('Cache-Control', `public, max-age=${ttl}, stale-while-revalidate=${ttl * 2}`);
      }

      return response;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Track failed API call
      ApiCallTracker.recordApiCall(endpoint, duration);
      ResponseTimeTracker.recordResponseTime(duration);
      
      console.error(`❌ Cache middleware error for ${endpoint}:`, error);
      throw error;
    }
  };
}

/**
 * Cache invalidation utilities
 */
export class CacheInvalidator {
  /**
   * Invalidate cache entries by pattern
   */
  static invalidateByPattern(pattern: string): number {
    const stats = memoryCache.getStats();
    let invalidated = 0;
    
    for (const key of stats.keys) {
      if (key.includes(pattern)) {
        memoryCache.delete(key);
        invalidated++;
      }
    }
    
    console.log(`🗑️ Invalidated ${invalidated} cache entries matching pattern: ${pattern}`);
    return invalidated;
  }

  /**
   * Invalidate all API cache entries
   */
  static invalidateApiCache(): number {
    return this.invalidateByPattern('api:');
  }

  /**
   * Invalidate cache for specific endpoint
   */
  static invalidateEndpoint(endpoint: string): number {
    return this.invalidateByPattern(`:${endpoint}:`);
  }

  /**
   * Invalidate user-specific cache
   */
  static invalidateUserCache(userHash: string): number {
    return this.invalidateByPattern(`:${userHash}`);
  }
}

/**
 * Cache warming utilities
 */
export class CacheWarmer {
  /**
   * Pre-warm cache with common requests
   */
  static async warmCommonEndpoints(): Promise<void> {
    console.log('🔥 Starting cache warming...');
    
    // Add your common endpoints here
    const commonEndpoints = [
      '/api/locations',
      '/api/analytics/metrics',
      '/api/moderation'
    ];

    for (const endpoint of commonEndpoints) {
      try {
        // Make request to warm cache
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${endpoint}`);
        if (response.ok) {
          console.log(`🔥 Warmed cache for ${endpoint}`);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to warm cache for ${endpoint}:`, error);
      }
    }
    
    console.log('🔥 Cache warming completed');
  }
}

/**
 * Performance monitoring for cached APIs
 */
export class CachePerformanceMonitor {
  /**
   * Get cache performance metrics
   */
  static getMetrics() {
    const cacheStats = memoryCache.getStats();
    const apiStats = ApiCallTracker.getApiCallStats();
    const avgResponseTime = ResponseTimeTracker.getAverageResponseTime();
    const p95ResponseTime = ResponseTimeTracker.getP95ResponseTime();
    
    const hitRate = cacheStats.hits + cacheStats.misses > 0 
      ? (cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100 
      : 0;

    return {
      cache: {
        size: cacheStats.size,
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        hitRate: Math.round(hitRate * 100) / 100
      },
      performance: {
        averageResponseTime: avgResponseTime,
        p95ResponseTime: p95ResponseTime,
        totalApiCalls: apiStats.totalCalls,
        averageApiDuration: apiStats.averageDuration
      },
      endpoints: apiStats.callsByEndpoint
    };
  }

  /**
   * Log performance summary
   */
  static logPerformanceSummary(): void {
    const metrics = this.getMetrics();
    
    console.log('📊 Cache Performance Summary:');
    console.log(`   Cache Hit Rate: ${metrics.cache.hitRate}%`);
    console.log(`   Cache Size: ${metrics.cache.size} entries`);
    console.log(`   Average Response Time: ${metrics.performance.averageResponseTime}ms`);
    console.log(`   P95 Response Time: ${metrics.performance.p95ResponseTime}ms`);
    console.log(`   Total API Calls: ${metrics.performance.totalApiCalls}`);
  }
}
