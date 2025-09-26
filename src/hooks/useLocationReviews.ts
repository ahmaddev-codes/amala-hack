import { useState, useEffect } from 'react';
import { Review } from '@/types/location';

interface LocationReviewData {
  reviews: Review[];
  reviewCount: number;
  averageRating: number;
  loading: boolean;
  error: string | null;
}

export function useLocationReviews(locationId: string): LocationReviewData {
  const [data, setData] = useState<LocationReviewData>({
    reviews: [],
    reviewCount: 0,
    averageRating: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!locationId) {
      setData({
        reviews: [],
        reviewCount: 0,
        averageRating: 0,
        loading: false,
        error: null,
      });
      return;
    }

    const fetchReviews = async () => {
      try {
        setData(prev => ({ ...prev, loading: true, error: null }));
        
        const response = await fetch(`/api/reviews?location_id=${locationId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch reviews: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          const reviews = result.reviews || [];
          const reviewCount = reviews.length;
          
          // Calculate average rating from actual reviews
          const averageRating = reviewCount > 0 
            ? reviews.reduce((sum: number, review: Review) => sum + review.rating, 0) / reviewCount
            : 0;
          
          setData({
            reviews,
            reviewCount,
            averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
            loading: false,
            error: null,
          });
        } else {
          throw new Error(result.error || 'Failed to fetch reviews');
        }
      } catch (error) {
        console.error(`Error fetching reviews for location ${locationId}:`, error);
        setData({
          reviews: [],
          reviewCount: 0,
          averageRating: 0,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    fetchReviews();
  }, [locationId]);

  return data;
}

// Hook for fetching reviews for multiple locations efficiently
export function useMultipleLocationReviews(locationIds: string[]) {
  const [data, setData] = useState<Record<string, LocationReviewData>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (locationIds.length === 0) {
      setData({});
      setLoading(false);
      return;
    }

    const fetchAllReviews = async () => {
      setLoading(true);
      const results: Record<string, LocationReviewData> = {};

      // Fetch reviews for all locations in parallel
      const promises = locationIds.map(async (locationId) => {
        try {
          const response = await fetch(`/api/reviews?location_id=${locationId}`);
          
          if (response.ok) {
            const result = await response.json();
            
            if (result.success) {
              const reviews = result.reviews || [];
              const reviewCount = reviews.length;
              const averageRating = reviewCount > 0 
                ? reviews.reduce((sum: number, review: Review) => sum + review.rating, 0) / reviewCount
                : 0;
              
              results[locationId] = {
                reviews,
                reviewCount,
                averageRating: Math.round(averageRating * 10) / 10,
                loading: false,
                error: null,
              };
            } else {
              results[locationId] = {
                reviews: [],
                reviewCount: 0,
                averageRating: 0,
                loading: false,
                error: result.error || 'Failed to fetch reviews',
              };
            }
          } else {
            results[locationId] = {
              reviews: [],
              reviewCount: 0,
              averageRating: 0,
              loading: false,
              error: `HTTP ${response.status}`,
            };
          }
        } catch (error) {
          results[locationId] = {
            reviews: [],
            reviewCount: 0,
            averageRating: 0,
            loading: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      });

      await Promise.all(promises);
      setData(results);
      setLoading(false);
    };

    fetchAllReviews();
  }, [locationIds]);

  return { data, loading };
}
