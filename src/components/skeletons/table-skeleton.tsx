"use client";

/**
 * Table Skeleton
 * Loading state for table-based data displays
 */

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  showActions?: boolean;
  showCheckboxes?: boolean;
  className?: string;
}

export function TableSkeleton({ 
  rows = 5, 
  columns = 4, 
  showHeader = true,
  showActions = false,
  showCheckboxes = false,
  className = ""
}: TableSkeletonProps) {
  const totalColumns = columns + (showCheckboxes ? 1 : 0) + (showActions ? 1 : 0);

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      <div className="animate-pulse">
        {/* Table Header */}
        {showHeader && (
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${totalColumns}, 1fr)` }}>
              {showCheckboxes && (
                <div className="w-4 h-4 bg-gray-200 rounded"></div>
              )}
              {[...Array(columns)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded w-3/4"></div>
              ))}
              {showActions && (
                <div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div>
              )}
            </div>
          </div>
        )}

        {/* Table Rows */}
        <div className="divide-y divide-gray-100">
          {[...Array(rows)].map((_, rowIndex) => (
            <div key={rowIndex} className="px-6 py-4">
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${totalColumns}, 1fr)` }}>
                {showCheckboxes && (
                  <div className="w-4 h-4 bg-gray-200 rounded"></div>
                )}
                {[...Array(columns)].map((_, colIndex) => (
                  <div key={colIndex} className="flex items-center">
                    {colIndex === 0 ? (
                      // First column often has more complex content
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0"></div>
                        <div>
                          <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                          <div className="h-3 bg-gray-200 rounded w-16"></div>
                        </div>
                      </div>
                    ) : (
                      // Other columns have simpler content
                      <div className="h-4 bg-gray-200 rounded w-full max-w-[120px]"></div>
                    )}
                  </div>
                ))}
                {showActions && (
                  <div className="flex items-center justify-end space-x-2">
                    <div className="h-8 bg-gray-200 rounded w-8"></div>
                    <div className="h-8 bg-gray-200 rounded w-8"></div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Table Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <div className="flex items-center space-x-2">
              <div className="h-8 bg-gray-200 rounded w-8"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
              <div className="h-8 bg-gray-200 rounded w-8"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Simple List Table Skeleton
 * For simpler list-based tables
 */
interface ListTableSkeletonProps {
  rows?: number;
  showAvatar?: boolean;
  showStatus?: boolean;
  showActions?: boolean;
  className?: string;
}

export function ListTableSkeleton({ 
  rows = 8, 
  showAvatar = true,
  showStatus = true,
  showActions = true,
  className = ""
}: ListTableSkeletonProps) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>
      <div className="animate-pulse divide-y divide-gray-100">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-4">
              {showAvatar && (
                <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0"></div>
              )}
              <div>
                <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {showStatus && (
                <div className="h-6 bg-gray-200 rounded-full w-16"></div>
              )}
              {showActions && (
                <div className="flex items-center space-x-2">
                  <div className="h-8 bg-gray-200 rounded w-8"></div>
                  <div className="h-8 bg-gray-200 rounded w-8"></div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
