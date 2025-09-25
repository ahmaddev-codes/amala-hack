"use client";

/**
 * Card Skeleton
 * Reusable skeleton component for card-based layouts
 */

interface CardSkeletonProps {
  showImage?: boolean;
  showHeader?: boolean;
  showFooter?: boolean;
  lines?: number;
  className?: string;
}

export function CardSkeleton({ 
  showImage = false, 
  showHeader = true, 
  showFooter = false, 
  lines = 3,
  className = ""
}: CardSkeletonProps) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="animate-pulse">
        {/* Header */}
        {showHeader && (
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="w-4 h-4 bg-gray-200 rounded"></div>
          </div>
        )}

        {/* Image */}
        {showImage && (
          <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
        )}

        {/* Content Lines */}
        <div className="space-y-3">
          {[...Array(lines)].map((_, i) => (
            <div 
              key={i} 
              className={`h-3 bg-gray-200 rounded ${
                i === lines - 1 ? 'w-2/3' : 'w-full'
              }`}
            ></div>
          ))}
        </div>

        {/* Footer */}
        {showFooter && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-8 bg-gray-200 rounded w-20"></div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Grid of Card Skeletons
 */
interface CardGridSkeletonProps {
  count?: number;
  columns?: number;
  showImage?: boolean;
  showHeader?: boolean;
  showFooter?: boolean;
  lines?: number;
}

export function CardGridSkeleton({ 
  count = 6, 
  columns = 3,
  showImage = false,
  showHeader = true,
  showFooter = false,
  lines = 3
}: CardGridSkeletonProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
    6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'
  };

  return (
    <div className={`grid ${gridCols[columns as keyof typeof gridCols] || gridCols[3]} gap-6`}>
      {[...Array(count)].map((_, i) => (
        <CardSkeleton
          key={i}
          showImage={showImage}
          showHeader={showHeader}
          showFooter={showFooter}
          lines={lines}
        />
      ))}
    </div>
  );
}
