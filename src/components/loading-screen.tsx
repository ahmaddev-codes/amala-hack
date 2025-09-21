"use client";

import React from "react";
import { BrandLogo } from "./ui/brand-logo";

interface LoadingScreenProps {
  message?: string;
  submessage?: string;
  showLogo?: boolean;
}

export function LoadingScreen({
  message = "Amala Discovery",
  submessage = "Loading your culinary adventure...",
  showLogo = true
}: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-6">
        {/* Amala Logo/Icon */}
        {showLogo && (
          <div className="mb-2">
            <div className="w-20 h-20 mx-auto flex items-center justify-center">
              <div className="animate-scale-pulse">
                <BrandLogo variant="icon" size="lg" />
              </div>
            </div>
          </div>
        )}


        {/* Loading Text */}
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {message}
        </h2>
        <p className="text-gray-600 mb-4">
          {submessage}
        </p>

        {/* Progress Dots */}
        <div className="flex justify-center space-x-2">
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
}

// Compact loading spinner for inline use
export function LoadingSpinner({ size = "md", color = "orange" }: { size?: "sm" | "md" | "lg", color?: "orange" | "primary" | "gray" }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8"
  };

  const colorClasses = {
    orange: "border-orange-500",
    primary: "border-primary",
    gray: "border-gray-500"
  };

  return (
    <div className={`inline-block animate-spin rounded-full border-2 border-solid border-r-transparent ${sizeClasses[size]} ${colorClasses[color]}`}></div>
  );
}
