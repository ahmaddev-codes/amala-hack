/**
 * Performance Dashboard Component
 * Displays real-time performance metrics and cache statistics
 */

"use client";

import React, { useState, useEffect } from 'react';
import { 
  BoltIcon, 
  ClockIcon, 
  CpuChipIcon, 
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon 
} from '@heroicons/react/24/outline';
import { memoryCache, ResponseTimeTracker, ApiCallTracker, MemoryTracker } from '@/lib/cache/memory-cache';
import { CachePerformanceMonitor } from '@/lib/middleware/cache-middleware';

interface PerformanceMetrics {
  cache: {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
  };
  performance: {
    averageResponseTime: number;
    p95ResponseTime: number;
    totalApiCalls: number;
    averageApiDuration: number;
  };
  endpoints: Record<string, { count: number; averageDuration: number }>;
}

function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [memoryUsage, setMemoryUsage] = useState<string>('Not available');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = () => {
      try {
        const performanceMetrics = CachePerformanceMonitor.getMetrics();
        setMetrics(performanceMetrics);
        
        const memUsage = MemoryTracker.getFormattedMemoryUsage();
        setMemoryUsage(memUsage);
        
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch performance metrics:', error);
        setLoading(false);
      }
    };

    // Initial fetch
    fetchMetrics();

    // Update every 5 seconds
    const interval = setInterval(fetchMetrics, 5000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getCacheHitRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getResponseTimeColor = (time: number) => {
    if (time <= 100) return 'text-green-600';
    if (time <= 500) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Performance Dashboard</h2>
          <p className="text-gray-600">Real-time system performance and cache metrics</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Live Data</span>
        </div>
      </div>

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Cache Hit Rate */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Cache Hit Rate</p>
              <p className={`text-2xl font-bold ${getCacheHitRateColor(metrics?.cache.hitRate || 0)}`}>
                {metrics?.cache.hitRate.toFixed(1) || '0'}%
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <BoltIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {metrics?.cache.hits || 0} hits, {metrics?.cache.misses || 0} misses
          </div>
        </div>

        {/* Average Response Time */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
              <p className={`text-2xl font-bold ${getResponseTimeColor(metrics?.performance.averageResponseTime || 0)}`}>
                {metrics?.performance.averageResponseTime || 0}ms
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-full">
              <ClockIcon className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            P95: {metrics?.performance.p95ResponseTime || 0}ms
          </div>
        </div>

        {/* Total API Calls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">API Calls Today</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics?.performance.totalApiCalls || 0}
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-full">
              <ChartBarIcon className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Avg: {metrics?.performance.averageApiDuration || 0}ms per call
          </div>
        </div>

        {/* Memory Usage */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Memory Usage</p>
              <p className="text-lg font-bold text-gray-900">
                {memoryUsage}
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-full">
              <CpuChipIcon className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Cache entries: {metrics?.cache.size || 0}
          </div>
        </div>
      </div>

      {/* API Endpoint Performance */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">API Endpoint Performance</h3>
          <p className="text-sm text-gray-600">Response times by endpoint</p>
        </div>
        <div className="p-6">
          {metrics?.endpoints && Object.keys(metrics.endpoints).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(metrics.endpoints)
                .sort(([,a], [,b]) => b.count - a.count)
                .slice(0, 10)
                .map(([endpoint, stats]) => (
                <div key={endpoint} className="flex items-center justify-between py-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{endpoint}</p>
                    <p className="text-xs text-gray-500">{stats.count} calls</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`text-sm font-medium ${getResponseTimeColor(stats.averageDuration)}`}>
                      {stats.averageDuration}ms
                    </span>
                    {stats.averageDuration <= 100 ? (
                      <ArrowTrendingDownIcon className="w-4 h-4 text-green-500" />
                    ) : (
                      <ArrowTrendingUpIcon className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ChartBarIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No API performance data available yet</p>
              <p className="text-sm">Make some API calls to see performance metrics</p>
            </div>
          )}
        </div>
      </div>

      {/* Performance Tips */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
        <div className="flex items-start space-x-3">
          <BoltIcon className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-blue-900">Performance Optimization Tips</h3>
            <div className="mt-2 space-y-2 text-sm text-blue-800">
              <p>• <strong>Cache Hit Rate:</strong> Target 80%+ for optimal performance</p>
              <p>• <strong>Response Time:</strong> Keep under 100ms for best user experience</p>
              <p>• <strong>Memory Usage:</strong> Monitor for memory leaks in production</p>
              <p>• <strong>API Calls:</strong> Use caching to reduce database load</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PerformanceDashboard;
