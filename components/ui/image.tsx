'use client';

import React, { useState } from 'react';
import NextImage, { ImageProps } from 'next/image';
import { cn } from '@/lib/utils';

interface SafeImageProps extends Omit<ImageProps, 'src' | 'alt'> {
  src: string;
  alt: string;
  className?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
}

/**
 * A safer version of Next.js Image component that handles loading errors
 * and provides fallback UI for broken images.
 */
export function SafeImage({
  src,
  alt,
  className,
  fill = false,
  width,
  height,
  sizes,
  priority = false,
  quality = 75,
  style,
  objectFit = 'cover',
  onLoadingComplete,
  ...props
}: SafeImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  
  // Combined style with objectFit if provided
  const combinedStyle = {
    ...style,
    objectFit,
  };

  // Handle loading complete
  const handleLoadingComplete = (img: HTMLImageElement) => {
    setIsLoading(false);
    if (onLoadingComplete) {
      onLoadingComplete(img);
    }
  };

  // Handle error
  const handleError = () => {
    setIsLoading(false);
    setError(true);
  };

  // If there's an error, render placeholder
  if (error) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center bg-gray-100",
          fill ? "w-full h-full inset-0 absolute" : "",
          className
        )}
        style={{
          width: !fill ? (width || 100) : undefined,
          height: !fill ? (height || 100) : undefined,
        }}
      >
        <svg 
          className="w-1/3 h-1/3 text-gray-400" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
          />
        </svg>
      </div>
    );
  }

  // Render loading state if needed
  if (isLoading) {
    return (
      <>
        <div 
          className={cn(
            "animate-pulse bg-gray-200",
            fill ? "w-full h-full inset-0 absolute" : "",
            className
          )}
          style={{
            width: !fill ? (width || 100) : undefined,
            height: !fill ? (height || 100) : undefined,
          }}
        />
        <NextImage
          src={src}
          alt={alt}
          className={cn(isLoading ? "invisible absolute" : "", className)}
          fill={fill}
          width={!fill && width ? width : undefined}
          height={!fill && height ? height : undefined}
          sizes={sizes}
          priority={priority}
          quality={quality}
          style={combinedStyle}
          onLoadingComplete={handleLoadingComplete}
          onError={handleError}
          {...props}
        />
      </>
    );
  }

  // Render the actual image
  return (
    <NextImage
      src={src}
      alt={alt}
      className={className}
      fill={fill}
      width={!fill && width ? width : undefined}
      height={!fill && height ? height : undefined}
      sizes={sizes}
      priority={priority}
      quality={quality}
      style={combinedStyle}
      onLoadingComplete={handleLoadingComplete}
      onError={handleError}
      {...props}
    />
  );
} 