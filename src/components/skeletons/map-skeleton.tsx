"use client";

/**
 * Map Skeleton
 * Loading state for the main map interface
 */

export function MapSkeleton() {
  return (
    <div className="relative w-full h-full bg-gray-100">
      {/* Map Loading Animation */}
      <div className="absolute inset-0 animate-pulse">
        <div className="w-full h-full bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200"></div>
        
        {/* Simulated Map Elements */}
        <div className="absolute inset-0">
          {/* Simulated Roads */}
          <div className="absolute top-1/4 left-0 w-full h-1 bg-gray-300 transform rotate-12"></div>
          <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-300 transform -rotate-6"></div>
          <div className="absolute top-3/4 left-0 w-full h-1 bg-gray-300 transform rotate-3"></div>
          
          {/* Simulated Location Markers */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-6 h-6 bg-gray-300 rounded-full"
              style={{
                top: `${20 + (i * 10)}%`,
                left: `${15 + (i * 8)}%`,
                animationDelay: `${i * 0.2}s`
              }}
            ></div>
          ))}
        </div>
      </div>

      {/* Loading Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="h-6 bg-gray-200 rounded w-32 mx-auto mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
        </div>
      </div>

      {/* Map Controls Skeleton */}
      <div className="absolute top-4 right-4 space-y-2">
        <div className="w-10 h-10 bg-white rounded-lg shadow-md animate-pulse"></div>
        <div className="w-10 h-10 bg-white rounded-lg shadow-md animate-pulse"></div>
        <div className="w-10 h-10 bg-white rounded-lg shadow-md animate-pulse"></div>
      </div>

      {/* Search Bar Skeleton */}
      <div className="absolute top-4 left-4 right-20">
        <div className="h-12 bg-white rounded-lg shadow-md animate-pulse"></div>
      </div>

      {/* Filter Panel Skeleton */}
      <div className="absolute bottom-4 left-4 right-4 md:right-auto md:w-80">
        <div className="bg-white rounded-lg shadow-md p-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
          <div className="flex space-x-2 mb-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-200 rounded w-16"></div>
            ))}
          </div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
    </div>
  );
}
