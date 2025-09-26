"use client";

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
  variant?: 'dashboard' | 'content' | 'sidebar' | 'modal';
}

export function ResponsiveContainer({ 
  children, 
  className,
  variant = 'content' 
}: ResponsiveContainerProps) {
  const baseClasses = "w-full";
  
  const variantClasses = {
    dashboard: "min-h-screen bg-gray-50 flex flex-col lg:flex-row overflow-hidden",
    content: "flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8",
    sidebar: "w-full lg:w-64 bg-white shadow-lg flex flex-col border-r border-gray-200",
    modal: "fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/30",
  };

  return (
    <div className={cn(baseClasses, variantClasses[variant], className)}>
      {children}
    </div>
  );
}

interface ResponsiveGridProps {
  children: ReactNode;
  className?: string;
  cols?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number;
}

export function ResponsiveGrid({ 
  children, 
  className,
  cols = { sm: 1, md: 2, lg: 3, xl: 4 },
  gap = 4
}: ResponsiveGridProps) {
  const gridClasses = [
    "grid",
    `gap-${gap}`,
    cols.sm && `grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
  ].filter(Boolean).join(' ');

  return (
    <div className={cn(gridClasses, className)}>
      {children}
    </div>
  );
}

interface ResponsiveCardProps {
  children: ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export function ResponsiveCard({ 
  children, 
  className,
  padding = 'md',
  hover = false
}: ResponsiveCardProps) {
  const paddingClasses = {
    sm: "p-3 sm:p-4",
    md: "p-4 sm:p-6",
    lg: "p-6 sm:p-8",
  };

  const baseClasses = "bg-white rounded-lg shadow border border-gray-200";
  const hoverClasses = hover ? "hover:shadow-md transition-shadow duration-200" : "";

  return (
    <div className={cn(baseClasses, paddingClasses[padding], hoverClasses, className)}>
      {children}
    </div>
  );
}

interface ResponsiveStackProps {
  children: ReactNode;
  className?: string;
  direction?: 'vertical' | 'horizontal' | 'responsive';
  spacing?: number;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
}

export function ResponsiveStack({ 
  children, 
  className,
  direction = 'vertical',
  spacing = 4,
  align = 'stretch',
  justify = 'start'
}: ResponsiveStackProps) {
  const directionClasses = {
    vertical: "flex flex-col",
    horizontal: "flex flex-row",
    responsive: "flex flex-col sm:flex-row",
  };

  const alignClasses = {
    start: "items-start",
    center: "items-center", 
    end: "items-end",
    stretch: "items-stretch",
  };

  const justifyClasses = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
    between: "justify-between",
    around: "justify-around",
  };

  const spacingClass = direction === 'vertical' ? `space-y-${spacing}` : 
                     direction === 'horizontal' ? `space-x-${spacing}` :
                     `space-y-${spacing} sm:space-y-0 sm:space-x-${spacing}`;

  return (
    <div className={cn(
      directionClasses[direction],
      alignClasses[align],
      justifyClasses[justify],
      spacingClass,
      className
    )}>
      {children}
    </div>
  );
}

interface ResponsiveTextProps {
  children: ReactNode;
  className?: string;
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  color?: 'gray' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  responsive?: boolean;
}

export function ResponsiveText({ 
  children, 
  className,
  size = 'base',
  weight = 'normal',
  color = 'gray',
  responsive = false
}: ResponsiveTextProps) {
  const sizeClasses = responsive ? {
    xs: "text-xs sm:text-sm",
    sm: "text-sm sm:text-base", 
    base: "text-base sm:text-lg",
    lg: "text-lg sm:text-xl",
    xl: "text-xl sm:text-2xl",
    '2xl': "text-2xl sm:text-3xl",
    '3xl': "text-3xl sm:text-4xl",
    '4xl': "text-4xl sm:text-5xl",
  } : {
    xs: "text-xs",
    sm: "text-sm",
    base: "text-base",
    lg: "text-lg", 
    xl: "text-xl",
    '2xl': "text-2xl",
    '3xl': "text-3xl",
    '4xl': "text-4xl",
  };

  const weightClasses = {
    normal: "font-normal",
    medium: "font-medium",
    semibold: "font-semibold", 
    bold: "font-bold",
  };

  const colorClasses = {
    gray: "text-gray-900",
    primary: "text-orange-600",
    secondary: "text-red-600",
    success: "text-green-600",
    warning: "text-yellow-600",
    error: "text-red-600",
  };

  return (
    <span className={cn(
      sizeClasses[size],
      weightClasses[weight],
      colorClasses[color],
      className
    )}>
      {children}
    </span>
  );
}

// Mobile-first breakpoint utilities
export const breakpoints = {
  sm: '640px',
  md: '768px', 
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Responsive visibility utilities
export function ResponsiveShow({ 
  children, 
  breakpoint, 
  direction = 'up' 
}: { 
  children: ReactNode; 
  breakpoint: keyof typeof breakpoints;
  direction?: 'up' | 'down';
}) {
  const classes = direction === 'up' 
    ? `hidden ${breakpoint}:block`
    : `block ${breakpoint}:hidden`;
    
  return <div className={classes}>{children}</div>;
}

// Hook for responsive behavior
export function useResponsive() {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const isTablet = typeof window !== 'undefined' && window.innerWidth >= 768 && window.innerWidth < 1024;
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;

  return {
    isMobile,
    isTablet, 
    isDesktop,
    breakpoint: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'
  };
}
