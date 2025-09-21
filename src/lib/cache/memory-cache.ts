/**
 * High-performance in-memory cache for frequently accessed data
 * Reduces database queries and API calls significantly
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  // Performance tracking
  private hits: number = 0;
  private misses: number = 0;
  private lastResetDate: string = new Date().toISOString().slice(0, 10);

  /**
   * Reset daily performance counters if needed
   */
  private resetPerformanceCountersIfNeeded(): void {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== this.lastResetDate) {
      this.hits = 0;
      this.misses = 0;
      this.lastResetDate = today;
    }
  }

  /**
   * Record a cache hit
   */
  private recordHit(): void {
    this.resetPerformanceCountersIfNeeded();
    this.hits++;
  }

  /**
   * Record a cache miss
   */
  private recordMiss(): void {
    this.resetPerformanceCountersIfNeeded();
    this.misses++;
  }

  /**
   * Get cached data if still valid
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.recordMiss();
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.recordMiss();
      return null;
    }

    this.recordHit();
    return entry.data;
  }

  /**
   * Set cached data with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL
    });
    console.log(`💾 Cache SET for key: ${key} (TTL: ${(ttl || this.DEFAULT_TTL) / 1000}s)`);
  }

  /**
   * Delete specific cache entry
   */
  delete(key: string): void {
    this.cache.delete(key);
    console.log(`🗑️ Cache DELETE for key: ${key}`);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    console.log(`🧹 Cache CLEARED`);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    this.resetPerformanceCountersIfNeeded();

    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      hits: this.hits,
      misses: this.misses
    };
  }

  /**
   * Clean expired entries
   */
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cache cleanup: removed ${cleaned} expired entries`);
    }
  }
}

// Response time tracking utility
export class ResponseTimeTracker {
  private static responseTimes: number[] = [];
  private static readonly MAX_SAMPLES = 1000;

  static recordResponseTime(durationMs: number): void {
    this.responseTimes.push(durationMs);
    if (this.responseTimes.length > this.MAX_SAMPLES) {
      this.responseTimes.shift(); // Remove oldest
    }
  }

  static getAverageResponseTime(): number {
    if (this.responseTimes.length === 0) return 0;
    const sum = this.responseTimes.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.responseTimes.length);
  }

  static getP95ResponseTime(): number {
    if (this.responseTimes.length === 0) return 0;
    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    return sorted[p95Index] || sorted[sorted.length - 1];
  }

  static clear(): void {
    this.responseTimes = [];
  }
}

// API Call tracking utility
export class ApiCallTracker {
  private static apiCalls: Map<string, {
    count: number;
    totalDuration: number;
    lastResetDate: string;
  }> = new Map();

  static recordApiCall(endpoint: string, duration: number): void {
    const today = new Date().toISOString().slice(0, 10);

    if (!this.apiCalls.has(endpoint)) {
      this.apiCalls.set(endpoint, {
        count: 0,
        totalDuration: 0,
        lastResetDate: today
      });
    }

    const stats = this.apiCalls.get(endpoint)!;

    // Reset if new day
    if (stats.lastResetDate !== today) {
      stats.count = 0;
      stats.totalDuration = 0;
      stats.lastResetDate = today;
    }

    stats.count++;
    stats.totalDuration += duration;
  }

  static getApiCallStats(endpoint?: string): {
    totalCalls: number;
    averageDuration: number;
    callsByEndpoint: Record<string, { count: number; averageDuration: number }>;
  } {
    if (endpoint) {
      const stats = this.apiCalls.get(endpoint);
      if (!stats) return { totalCalls: 0, averageDuration: 0, callsByEndpoint: {} };

      return {
        totalCalls: stats.count,
        averageDuration: stats.count > 0 ? Math.round(stats.totalDuration / stats.count) : 0,
        callsByEndpoint: {
          [endpoint]: {
            count: stats.count,
            averageDuration: stats.count > 0 ? Math.round(stats.totalDuration / stats.count) : 0
          }
        }
      };
    }

    let totalCalls = 0;
    let totalDuration = 0;
    const callsByEndpoint: Record<string, { count: number; averageDuration: number }> = {};

    for (const [endpointName, stats] of this.apiCalls.entries()) {
      totalCalls += stats.count;
      totalDuration += stats.totalDuration;
      callsByEndpoint[endpointName] = {
        count: stats.count,
        averageDuration: stats.count > 0 ? Math.round(stats.totalDuration / stats.count) : 0
      };
    }

    return {
      totalCalls,
      averageDuration: totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0,
      callsByEndpoint
    };
  }

  static clear(): void {
    this.apiCalls.clear();
  }
}

// Enhanced response time tracker with endpoint tracking
export function trackApiCall(endpoint: string) {
  return function<T extends any[], R>(
    fn: (...args: T) => Promise<R>
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      const start = Date.now();
      try {
        const result = await fn(...args);
        const duration = Date.now() - start;
        ApiCallTracker.recordApiCall(endpoint, duration);
        ResponseTimeTracker.recordResponseTime(duration);
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        ApiCallTracker.recordApiCall(endpoint, duration);
        ResponseTimeTracker.recordResponseTime(duration);
        throw error;
      }
    };
  };
}

// Memory usage tracking utility
export class MemoryTracker {
  private static memoryUsage: { heapUsed: number; heapTotal: number; timestamp: number } | null = null;

static recordMemoryUsage(): void {
    // Only record memory usage in Node.js environment
    if (typeof process !== 'undefined' && process && typeof process.memoryUsage === 'function') {
      const memUsage = process.memoryUsage();
      this.memoryUsage = {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        timestamp: Date.now()
      };
    }
  }

  static getMemoryUsage(): { heapUsed: number; heapTotal: number; usagePercentage: number } | null {
    // Only get memory usage in Node.js environment
    if (typeof process !== 'undefined' && process && typeof process.memoryUsage === 'function') {
      if (this.memoryUsage) {
        const usagePercentage = Math.round((this.memoryUsage.heapUsed / this.memoryUsage.heapTotal) * 100);
        return {
          heapUsed: this.memoryUsage.heapUsed,
          heapTotal: this.memoryUsage.heapTotal,
          usagePercentage: usagePercentage
        };
      }
      // If no stored memory usage, get current
      const memUsage = process.memoryUsage();
      const usagePercentage = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
      return {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        usagePercentage
      };
    }
    return null;
  }

  static getFormattedMemoryUsage(): string {
    const usage = this.getMemoryUsage();
    if (usage) {
      const usedMB = Math.round(usage.heapUsed / 1024 / 1024);
      const totalMB = Math.round(usage.heapTotal / 1024 / 1024);
      return `${usedMB} MB / ${totalMB} MB (${usage.usagePercentage}%)`;
    }
    return 'Not available in browser';
  }

static clear(): void {
    this.memoryUsage = null;
  }
}

// Global cache instance
export const memoryCache = new MemoryCache();

// Auto-cleanup every 10 minutes
setInterval(() => {
  memoryCache.cleanup();
}, 10 * 60 * 1000);

// Record memory usage periodically (only in Node.js)
if (typeof process !== 'undefined' && process && typeof process.memoryUsage === 'function') {
  setInterval(() => {
    MemoryTracker.recordMemoryUsage();
  }, 30 * 1000);

  // Record immediately
  MemoryTracker.recordMemoryUsage();
}

// Cache key generators for consistency
export const CacheKeys = {
  moderatorStats: () => 'moderator:stats',
  pendingLocations: () => 'locations:pending',
  pendingReviews: () => 'reviews:pending',
  flaggedContent: () => 'flagged:pending',
  adminAnalytics: (days: number) => `admin:analytics:${days}`,
  locationEnrichment: (locationId: string) => `location:enrichment:${locationId}`,
  discoveryStats: (days: number) => `discovery:stats:${days}`,
} as const;
