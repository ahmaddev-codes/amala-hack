"use client";

import Image from "next/image";
import { useState, useRef, useCallback, memo } from "react";

interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  placeholder?: string;
}

export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = "",
  placeholder = "/placeholder-image.svg"
}: OptimizedImageProps) {
  const [imageSrc, setImageSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const currentSrcRef = useRef(src);

  const handleError = useCallback(() => {
    console.log("Image failed to load:", imageSrc);
    if (!hasError) {
      setHasError(true);
      setImageSrc(placeholder);
    }
  }, [imageSrc, hasError, placeholder]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setIsLoaded(true);
    setHasError(false);
  }, []);

  // Only reset loading state if src actually changed
  if (currentSrcRef.current !== src) {
    currentSrcRef.current = src;
    setImageSrc(src);
    setIsLoading(true);
    setIsLoaded(false);
    setHasError(false);
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg" />
      )}
      <Image
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoading ? "opacity-0" : "opacity-100"
        }`}
        loading="lazy"
        onError={handleError}
        onLoad={handleLoad}
        unoptimized
        // Prevent unnecessary re-renders by using priority only for above-fold images
        priority={false}
      />
    </div>
  );
});
