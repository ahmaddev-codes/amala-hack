// React hook for Firebase Analytics integration
import { useEffect, useCallback } from 'react';
import { FirebaseAnalyticsService } from '@/lib/analytics/firebase-analytics';
import { useAuth } from '@/contexts/FirebaseAuthContext';
import { LocationFilter } from '@/types/location';

// Type definitions for better type safety
interface LocationData {
  name?: string;
  country?: string;
  city?: string;
  images?: string[];
  cuisine?: string[];
}

// Use LocationFilter type for search filters to ensure consistency
type SearchFilters = LocationFilter;

export function useAnalytics() {
  const { user, firebaseUser } = useAuth();

  // Initialize analytics on mount
  useEffect(() => {
    FirebaseAnalyticsService.initialize();
  }, []);

  // Set user properties when user changes
  useEffect(() => {
    if (user && FirebaseAnalyticsService.isAvailable()) {
      // Set user ID
      FirebaseAnalyticsService.setUser(user.id);

      // Set user properties for segmentation
      FirebaseAnalyticsService.setUserProperties({
        user_role: user.roles?.[0] || 'user',
        user_type: user.roles?.includes('admin') ? 'admin' : 
                   user.roles?.includes('mod') ? 'moderator' :
                   user.roles?.includes('scout') ? 'scout' : 'user',
        signup_method: firebaseUser?.providerData?.[0]?.providerId === 'google.com' ? 'google' : 'email',
      });
    }
  }, [user, firebaseUser]);

  // Analytics tracking functions
  const analytics = {
    // Page tracking
    trackPageView: useCallback((pageName: string, pageTitle?: string) => {
      FirebaseAnalyticsService.trackPageView(pageName, pageTitle);
    }, []),

    // Location events
    trackLocationSubmission: useCallback((method: 'manual' | 'ai_intake' | 'discovery', locationData?: LocationData) => {
      FirebaseAnalyticsService.trackLocationSubmission(method, locationData);
    }, []),

    trackLocationView: useCallback((locationId: string, locationName: string, viewSource: 'map' | 'list' | 'search') => {
      FirebaseAnalyticsService.trackLocationView(locationId, locationName, viewSource);
    }, []),

    trackLocationSelect: useCallback((locationId: string, locationName: string, source: string) => {
      FirebaseAnalyticsService.trackLocationSelect(locationId, locationName, source);
    }, []),

    // Review events
    trackReviewSubmission: useCallback((locationId: string, rating: number, hasImages: boolean) => {
      FirebaseAnalyticsService.trackReviewSubmission(locationId, rating, hasImages);
    }, []),

    // Photo events
    trackPhotoUpload: useCallback((locationId: string, photoCount: number) => {
      FirebaseAnalyticsService.trackPhotoUpload(locationId, photoCount);
    }, []),

    // Search events
    trackSearch: useCallback((query: string, resultCount: number, filters?: SearchFilters) => {
      FirebaseAnalyticsService.trackSearch(query, resultCount, filters);
    }, []),

    // Authentication events
    trackSignUp: useCallback((method: 'email' | 'google') => {
      FirebaseAnalyticsService.trackSignUp(method);
    }, []),

    trackLogin: useCallback((method: 'email' | 'google') => {
      FirebaseAnalyticsService.trackLogin(method);
    }, []),

    // Moderation events
    trackModerationAction: useCallback((action: 'approve' | 'reject', contentType: 'location' | 'review', contentId: string) => {
      FirebaseAnalyticsService.trackModerationAction(action, contentType, contentId);
    }, []),

    // Discovery events
    trackDiscoveryOperation: useCallback((region: string, resultCount: number, duration: number) => {
      FirebaseAnalyticsService.trackDiscoveryOperation(region, resultCount, duration);
    }, []),

    // Engagement events
    trackEngagement: useCallback((action: string, details?: Record<string, any>) => {
      FirebaseAnalyticsService.trackEngagement(action, details);
    }, []),

    // Conversion events
    trackConversion: useCallback((conversionType: 'location_visit' | 'review_complete' | 'photo_share', value?: number) => {
      FirebaseAnalyticsService.trackConversion(conversionType, value);
    }, []),

    // Custom events
    trackEvent: useCallback((eventName: string, parameters?: Record<string, any>) => {
      FirebaseAnalyticsService.trackEvent(eventName, parameters);
    }, []),
  };

  return analytics;
}

// Hook for automatic page view tracking
export function usePageTracking() {
  const analytics = useAnalytics();

  useEffect(() => {
    // Track initial page view (only on client side)
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      const pageName = getPageNameFromPath(currentPath);
      analytics.trackPageView(pageName);
    }

    // Note: Next.js 13+ App Router doesn't have router events
    // We'll track page views manually in each page component
    
  }, [analytics]);
}

// Helper function to get readable page names
function getPageNameFromPath(path: string): string {
  const pathMap: Record<string, string> = {
    '/': 'Home - Map View',
    '/login': 'Login Page',
    '/admin': 'Admin Dashboard',
    '/admin/metrics': 'Admin Analytics',
    '/moderator': 'Moderator Dashboard',
    '/scout': 'Scout Dashboard',
  };

  return pathMap[path] || `Page: ${path}`;
}
