"use client";

/**
 * Chart Skeleton
 * Loading state for various chart types
 */

interface ChartSkeletonProps {
  type?: 'line' | 'bar' | 'pie' | 'area' | 'donut';
  height?: number;
  showLegend?: boolean;
  showTitle?: boolean;
  className?: string;
}

export function ChartSkeleton({ 
  type = 'line',
  height = 300,
  showLegend = true,
  showTitle = true,
  className = ""
}: ChartSkeletonProps) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="animate-pulse">
        {/* Chart Title */}
        {showTitle && (
          <div className="flex items-center justify-between mb-6">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="flex items-center space-x-2">
              <div className="h-8 bg-gray-200 rounded w-20"></div>
              <div className="h-8 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
        )}

        {/* Chart Area */}
        <div className="relative" style={{ height: `${height}px` }}>
          {type === 'pie' || type === 'donut' ? (
            // Pie/Donut Chart
            <div className="flex items-center justify-center h-full">
              <div className="w-48 h-48 bg-gray-200 rounded-full"></div>
            </div>
          ) : type === 'bar' ? (
            // Bar Chart
            <div className="flex items-end justify-between h-full space-x-2 px-4">
              {[...Array(8)].map((_, i) => (
                <div 
                  key={i} 
                  className="bg-gray-200 rounded-t w-full"
                  style={{ height: `${((i % 4) + 1) * 20 + 20}%` }}
                ></div>
              ))}
            </div>
          ) : (
            // Line/Area Chart
            <div className="relative h-full">
              {/* Grid Lines */}
              <div className="absolute inset-0">
                {[...Array(5)].map((_, i) => (
                  <div 
                    key={i}
                    className="absolute w-full h-px bg-gray-200"
                    style={{ top: `${i * 25}%` }}
                  ></div>
                ))}
                {[...Array(7)].map((_, i) => (
                  <div 
                    key={i}
                    className="absolute h-full w-px bg-gray-200"
                    style={{ left: `${i * 16.67}%` }}
                  ></div>
                ))}
              </div>
              
              {/* Chart Line */}
              <div className="absolute inset-0 flex items-end">
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path
                    d="M 0,80 Q 20,60 40,70 T 80,40 L 100,30"
                    stroke="#d1d5db"
                    strokeWidth="2"
                    fill="none"
                    className="animate-pulse"
                  />
                  {type === 'area' && (
                    <path
                      d="M 0,80 Q 20,60 40,70 T 80,40 L 100,30 L 100,100 L 0,100 Z"
                      fill="#f3f4f6"
                      className="animate-pulse"
                    />
                  )}
                </svg>
              </div>
            </div>
          )}

          {/* Y-Axis Labels */}
          <div className="absolute left-0 top-0 h-full flex flex-col justify-between -ml-8">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-3 bg-gray-200 rounded w-6"></div>
            ))}
          </div>

          {/* X-Axis Labels */}
          <div className="absolute bottom-0 left-0 w-full flex justify-between -mb-8">
            {[...Array(type === 'bar' ? 8 : 7)].map((_, i) => (
              <div key={i} className="h-3 bg-gray-200 rounded w-8"></div>
            ))}
          </div>
        </div>

        {/* Legend */}
        {showLegend && (
          <div className="mt-6 flex items-center justify-center space-x-6">
            {[...Array(type === 'pie' || type === 'donut' ? 4 : 2)].map((_, i) => (
              <div key={i} className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Mini Chart Skeleton
 * For smaller chart widgets
 */
interface MiniChartSkeletonProps {
  type?: 'line' | 'bar' | 'sparkline';
  height?: number;
  className?: string;
}

export function MiniChartSkeleton({ 
  type = 'sparkline',
  height = 60,
  className = ""
}: MiniChartSkeletonProps) {
  return (
    <div className={`${className}`}>
      <div className="animate-pulse">
        <div className="relative" style={{ height: `${height}px` }}>
          {type === 'bar' ? (
            // Mini Bar Chart
            <div className="flex items-end justify-between h-full space-x-1">
              {[...Array(12)].map((_, i) => (
                <div 
                  key={i} 
                  className="bg-gray-200 rounded-t w-full"
                  style={{ height: `${((i % 4) + 1) * 20 + 20}%` }}
                ></div>
              ))}
            </div>
          ) : (
            // Mini Line/Sparkline Chart
            <div className="relative h-full w-full">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path
                  d="M 0,70 Q 10,50 20,60 T 40,40 Q 60,30 80,50 L 100,20"
                  stroke="#d1d5db"
                  strokeWidth="2"
                  fill="none"
                  className="animate-pulse"
                />
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Chart Grid Skeleton
 * For dashboard with multiple charts
 */
interface ChartGridSkeletonProps {
  count?: number;
  columns?: number;
  chartType?: 'line' | 'bar' | 'pie' | 'area' | 'mixed';
  height?: number;
}

export function ChartGridSkeleton({ 
  count = 4, 
  columns = 2,
  chartType = 'mixed',
  height = 300
}: ChartGridSkeletonProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 lg:grid-cols-2',
    3: 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3',
    4: 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-4'
  };

  const chartTypes = ['line', 'bar', 'pie', 'area'] as const;

  return (
    <div className={`grid ${gridCols[columns as keyof typeof gridCols] || gridCols[2]} gap-6`}>
      {[...Array(count)].map((_, i) => {
        const type = chartType === 'mixed' 
          ? chartTypes[i % chartTypes.length]
          : chartType as 'line' | 'bar' | 'pie' | 'area';
        
        return (
          <ChartSkeleton
            key={i}
            type={type}
            height={height}
            showLegend={type === 'pie'}
            showTitle={true}
          />
        );
      })}
    </div>
  );
}
