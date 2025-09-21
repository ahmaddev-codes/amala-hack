"use client";

import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'text';
  className?: string;
}

export function BrandLogo({ size = 'md', variant = 'full', className = '' }: BrandLogoProps) {
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-12',
    xl: 'h-16'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-3xl',
    xl: 'text-4xl'
  };

  // Custom Amala icon - represents a traditional Nigerian pot/bowl
  const AmalaIcon = ({ className: iconClassName = '' }: { className?: string }) => (
    <svg
      viewBox="0 0 32 32"
      className={iconClassName}
      fill="currentColor"
    >
      {/* Traditional pot/bowl shape */}
      <path d="M6 12c0-1.1.9-2 2-2h16c1.1 0 2 .9 2 2v8c0 4.4-3.6 8-8 8h-4c-4.4 0-8-3.6-8-8v-8z" className="text-orange-600" />
      {/* Steam/aroma lines */}
      <path d="M12 6v2M16 4v4M20 6v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-orange-400" />
      {/* Bowl rim highlight */}
      <ellipse cx="16" cy="12" rx="10" ry="2" className="text-orange-500 opacity-60" />
    </svg>
  );

  if (variant === 'icon') {
    return (
      <div className={`${sizeClasses[size]} ${className}`}>
        <AmalaIcon className="h-full w-auto" />
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <span className={`font-bold ${textSizeClasses[size]} text-gray-900 ${className}`}>
        Amala Map
      </span>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={sizeClasses[size]}>
        <AmalaIcon className="h-full w-auto" />
      </div>
      <span className={`font-bold ${textSizeClasses[size]} text-gray-900`}>
        Amala Map
      </span>
    </div>
  );
}

// Brand colors for consistent theming
export const brandColors = {
  primary: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316', // Main orange
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
  },
  secondary: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e', // Main green
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  }
};
