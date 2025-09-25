"use client";

/**
 * Location List Skeleton
 * Loading state for location lists and search results
 */

interface LocationListSkeletonProps {
  count?: number;
  showImages?: boolean;
}

export function LocationListSkeleton({ count = 6, showImages = true }: LocationListSkeletonProps) {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="p-4 animate-pulse">
          <div className="flex gap-4">
            <div className="flex-1">
              {/* Location name */}
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
              
              {/* Address */}
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
              
              {/* Rating and status */}
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-4 h-4 bg-gray-200 rounded"></div>
                  ))}
                </div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
              
              {/* Description */}
              <div className="space-y-2 mb-3">
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-4/5"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>

              {/* Tags */}
              <div className="flex gap-2 mb-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-6 bg-gray-200 rounded-full w-16"></div>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3">
                <div className="h-8 bg-gray-200 rounded w-20"></div>
                <div className="h-8 bg-gray-200 rounded w-24"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
            
            {/* Image skeleton */}
            {showImages && (
              <div className="flex-shrink-0">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-lg bg-gray-200"></div>
              </div>
            )}
          </div>

          {/* Reviews section */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-3"></div>
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0"></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-3 bg-gray-200 rounded w-20"></div>
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, j) => (
                          <div key={j} className="w-3 h-3 bg-gray-200 rounded"></div>
                        ))}
                      </div>
                    </div>
                    <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
