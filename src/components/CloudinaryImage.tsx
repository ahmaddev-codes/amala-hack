"use client";

import React from 'react';
import Image from 'next/image';

interface CloudinaryImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
}

export function CloudinaryImage({
  src,
  alt,
  width = 400,
  height = 300,
  className = "",
  fill = false,
  sizes,
  priority = false,
}: CloudinaryImageProps) {
  // Check if it's a Cloudinary URL
  const isCloudinaryUrl = src.includes('cloudinary.com') || src.includes('res.cloudinary.com');
  
  // If it's a Cloudinary URL, we can use it directly as it's already optimized
  // If it's not, we'll use it as-is (for backward compatibility)
  const optimizedSrc = isCloudinaryUrl ? src : src;

  if (fill) {
    return (
      <Image
        src={optimizedSrc}
        alt={alt}
        fill
        className={className}
        sizes={sizes}
        priority={priority}
        style={{ objectFit: 'cover' }}
      />
    );
  }

  return (
    <Image
      src={optimizedSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      sizes={sizes}
      priority={priority}
      style={{ objectFit: 'cover' }}
    />
  );
}

// Helper function to get optimized Cloudinary URL with custom transformations
export function getCloudinaryUrl(
  publicId: string, 
  options: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string;
    format?: string;
  } = {}
) {
  const {
    width = 400,
    height = 300,
    crop = 'fill',
    quality = 'auto:good',
    format = 'auto'
  } = options;

  // Extract cloud name from environment or use a default
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  
  if (!cloudName) {
    console.warn('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME not set');
    return publicId; // Return original if no cloud name
  }

  return `https://res.cloudinary.com/${cloudName}/image/upload/w_${width},h_${height},c_${crop},q_${quality},f_${format}/${publicId}`;
}
