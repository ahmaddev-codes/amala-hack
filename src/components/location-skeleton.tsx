"use client";

interface LocationSkeletonProps {
  count?: number;
}

export const LocationSkeleton = ({ count = 6 }: LocationSkeletonProps) => {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="p-4 animate-pulse">
          <div className="flex gap-3">
            <div className="flex-1">
              {/* Location name */}
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
              
              {/* Address */}
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              
              {/* Rating and status */}
              <div className="flex items-center gap-2 mb-2">
                <div className="h-4 bg-gray-200 rounded w-16"></div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </div>
              
              {/* Review text */}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-gray-200 flex-shrink-0 mt-0.5"></div>
                  <div className="flex-1">
                    <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Image skeleton */}
            <div className="flex-shrink-0 w-20 h-20 rounded-lg bg-gray-200"></div>
          </div>
        </div>
      ))}
    </div>
  );
};
