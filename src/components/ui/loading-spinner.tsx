/**
 * Loading Spinner Component for Lazy Loading
 * Provides consistent loading states across the platform
 */

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

export function LoadingSpinner({ 
  size = 'md', 
  message = 'Loading...', 
  className = '' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-orange-600 ${sizeClasses[size]}`}></div>
      {message && (
        <p className="mt-3 text-sm text-gray-600 font-medium">{message}</p>
      )}
    </div>
  );
}

export function ComponentLoader({ message = 'Loading component...' }: { message?: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <LoadingSpinner size="md" message={message} />
    </div>
  );
}

export function DashboardLoader() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TabContentLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[300px] w-full">
      <div className="flex flex-col items-center justify-center space-y-3">
        <div className="animate-spin rounded-full border-2 border-gray-300 border-t-orange-600 w-8 h-8"></div>
        <p className="text-sm text-gray-600 font-medium">{message}</p>
      </div>
    </div>
  );
}
