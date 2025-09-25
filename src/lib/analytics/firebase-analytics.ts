// Firebase Analytics Service - Real user behavior tracking
import { analytics, isAnalyticsReady } from '@/lib/firebase/config';
import { 
  logEvent, 
  setUserId, 
  setUserProperties as firebaseSetUserProperties,
  setCurrentScreen,
  isSupported
} from 'firebase/analytics';

export interface AnalyticsEvent {
  name: string;
  parameters?: Record<string, any>;
}

export interface UserProperties {
  user_role?: string;
  user_type?: string;
  signup_method?: string;
  preferred_cuisine?: string;
  location_country?: string;
  location_city?: string;
  [key: string]: string | number | boolean | undefined;
}

export class FirebaseAnalyticsService {
  private static isInitialized = false;
  private static isAnalyticsSupported = false;

  /**
   * Initialize Firebase Analytics
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Check if analytics is supported (not in SSR, ad blockers, etc.)
      this.isAnalyticsSupported = await isSupported();
      
      if (this.isAnalyticsSupported && analytics) {
        console.log('✅ Firebase Analytics initialized successfully');
        this.isInitialized = true;
        
        // Set initial device and geographic properties
        await this.setDeviceProperties();
        await this.setGeographicProperties();
      } else {
        console.warn('⚠️ Firebase Analytics not supported in this environment');
      }
    } catch (error) {
      console.error('❌ Firebase Analytics initialization failed:', error);
    }
  }

  /**
   * Set device properties for analytics
   */
  private static async setDeviceProperties(): Promise<void> {
    if (!this.isAvailable() || typeof window === 'undefined') return;

    try {
      const deviceInfo = {
        device_type: this.getDeviceType(),
        browser: this.getBrowserInfo(),
        screen_resolution: `${window.screen.width}x${window.screen.height}`,
        viewport_size: `${window.innerWidth}x${window.innerHeight}`,
        platform: navigator.platform,
        language: navigator.language,
      };

      this.setUserProperties(deviceInfo);
    } catch (error) {
      console.error('Error setting device properties:', error);
    }
  }

  /**
   * Set geographic properties using browser geolocation
   */
  private static async setGeographicProperties(): Promise<void> {
    if (!this.isAvailable() || typeof window === 'undefined') return;

    try {
      // Try to get timezone-based location
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const country = this.getCountryFromTimezone(timezone);
      
      this.setUserProperties({
        timezone: timezone,
        country: country,
      });

      // Optionally request geolocation (with user permission)
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            this.setUserProperties({
              has_location_permission: 'granted',
              location_accuracy: position.coords.accuracy.toString(),
            });
          },
          () => {
            this.setUserProperties({
              has_location_permission: 'denied',
            });
          },
          { timeout: 5000 }
        );
      }
    } catch (error) {
      console.error('Error setting geographic properties:', error);
    }
  }

  /**
   * Get device type based on screen size and user agent
   */
  private static getDeviceType(): string {
    if (typeof window === 'undefined') return 'unknown';
    
    const width = window.innerWidth;
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('mobile') || width < 768) return 'mobile';
    if (userAgent.includes('tablet') || (width >= 768 && width < 1024)) return 'tablet';
    return 'desktop';
  }

  /**
   * Get browser information
   */
  private static getBrowserInfo(): string {
    if (typeof window === 'undefined') return 'unknown';
    
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('chrome')) return 'chrome';
    if (userAgent.includes('firefox')) return 'firefox';
    if (userAgent.includes('safari')) return 'safari';
    if (userAgent.includes('edge')) return 'edge';
    return 'other';
  }

  /**
   * Get country from timezone (basic mapping)
   */
  private static getCountryFromTimezone(timezone: string): string {
    const timezoneToCountry: Record<string, string> = {
      'America/New_York': 'United States',
      'America/Los_Angeles': 'United States',
      'America/Chicago': 'United States',
      'America/Denver': 'United States',
      'America/Toronto': 'Canada',
      'America/Vancouver': 'Canada',
      'Europe/London': 'United Kingdom',
      'Europe/Paris': 'France',
      'Europe/Berlin': 'Germany',
      'Europe/Rome': 'Italy',
      'Europe/Madrid': 'Spain',
      'Asia/Tokyo': 'Japan',
      'Asia/Shanghai': 'China',
      'Asia/Kolkata': 'India',
      'Australia/Sydney': 'Australia',
      'Australia/Melbourne': 'Australia',
    };

    return timezoneToCountry[timezone] || 'Unknown';
  }

  /**
   * Check if analytics is available
   */
  static isAvailable(): boolean {
    return isAnalyticsReady() && this.isAnalyticsSupported && analytics !== null;
  }

  /**
   * Set user ID for tracking
   */
  static setUser(userId: string): void {
    if (!this.isAvailable()) return;

    try {
      setUserId(analytics!, userId);
      console.log('📊 Analytics user ID set:', userId);
    } catch (error) {
      console.error('Analytics setUser error:', error);
    }
  }

  /**
   * Set user properties for segmentation
   */
  static setUserProperties(properties: UserProperties): void {
    if (!this.isAvailable()) return;

    try {
      firebaseSetUserProperties(analytics!, properties);
      console.log('📊 Analytics user properties set:', properties);
    } catch (error) {
      console.error('Analytics setUserProperties error:', error);
    }
  }

  /**
   * Track page views with enhanced analytics
   */
  static trackPageView(pageName: string, pageTitle?: string): void {
    if (!this.isAvailable()) return;

    try {
      setCurrentScreen(analytics!, pageName);
      logEvent(analytics!, 'page_view', {
        page_title: pageTitle || pageName,
        page_location: window.location.href,
        page_path: window.location.pathname,
        page_referrer: document.referrer || 'direct',
        device_type: this.getDeviceType(),
        browser: this.getBrowserInfo(),
        viewport_size: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'unknown',
        timestamp: new Date().toISOString(),
      });
      console.log('📊 Page view tracked:', pageName);
    } catch (error) {
      console.error('Analytics trackPageView error:', error);
    }
  }

  /**
   * Track custom events
   */
  static trackEvent(eventName: string, parameters?: Record<string, any>): void {
    if (!this.isAvailable()) return;

    try {
      logEvent(analytics!, eventName, parameters);
      console.log('📊 Event tracked:', eventName, parameters);
    } catch (error) {
      console.error('Analytics trackEvent error:', error);
    }
  }

  // === AMALA-SPECIFIC EVENTS ===

  /**
   * Track location submission
   */
  static trackLocationSubmission(method: 'manual' | 'ai_intake' | 'discovery', locationData?: any): void {
    this.trackEvent('location_submitted', {
      submission_method: method,
      location_name: locationData?.name,
      location_country: locationData?.country,
      location_city: locationData?.city,
      has_images: locationData?.images?.length > 0,
      cuisine_type: locationData?.cuisine?.[0],
    });
  }

  /**
   * Track review submission
   */
  static trackReviewSubmission(locationId: string, rating: number, hasImages: boolean): void {
    this.trackEvent('review_submitted', {
      location_id: locationId,
      rating: rating,
      has_images: hasImages,
      review_type: hasImages ? 'with_photos' : 'text_only',
    });
  }

  /**
   * Track photo upload
   */
  static trackPhotoUpload(locationId: string, photoCount: number): void {
    this.trackEvent('photo_uploaded', {
      location_id: locationId,
      photo_count: photoCount,
    });
  }

  /**
   * Track search activity
   */
  static trackSearch(query: string, resultCount: number, filters?: any): void {
    this.trackEvent('search', {
      search_term: query,
      result_count: resultCount,
      has_filters: filters && Object.keys(filters).length > 0,
      filter_types: filters ? Object.keys(filters) : [],
    });
  }

  /**
   * Track location view
   */
  static trackLocationView(locationId: string, locationName: string, viewSource: 'map' | 'list' | 'search'): void {
    this.trackEvent('location_viewed', {
      location_id: locationId,
      location_name: locationName,
      view_source: viewSource,
    });
  }

  /**
   * Track user authentication
   */
  static trackSignUp(method: 'email' | 'google'): void {
    this.trackEvent('sign_up', {
      method: method,
    });
  }

  static trackLogin(method: 'email' | 'google'): void {
    this.trackEvent('login', {
      method: method,
    });
  }

  /**
   * Track moderation actions
   */
  static trackModerationAction(action: 'approve' | 'reject', contentType: 'location' | 'review', contentId: string): void {
    this.trackEvent('moderation_action', {
      action: action,
      content_type: contentType,
      content_id: contentId,
    });
  }

  /**
   * Track discovery operations
   */
  static trackDiscoveryOperation(region: string, resultCount: number, duration: number): void {
    this.trackEvent('discovery_completed', {
      region: region,
      locations_found: resultCount,
      duration_seconds: Math.round(duration / 1000),
    });
  }

  /**
   * Track user engagement
   */
  static trackEngagement(action: string, details?: Record<string, any>): void {
    this.trackEvent('user_engagement', {
      engagement_type: action,
      ...details,
    });
  }

  // === E-COMMERCE STYLE EVENTS (for location discovery) ===

  /**
   * Track when user "selects" a location (like adding to cart)
   */
  static trackLocationSelect(locationId: string, locationName: string, source: string): void {
    this.trackEvent('select_item', {
      item_id: locationId,
      item_name: locationName,
      item_category: 'restaurant',
      source: source,
    });
  }

  /**
   * Track conversion events (successful location visits, reviews, etc.)
   */
  static trackConversion(conversionType: 'location_visit' | 'review_complete' | 'photo_share', value?: number): void {
    this.trackEvent('conversion', {
      conversion_type: conversionType,
      value: value || 1,
    });
  }
}

// Export convenience functions
export const {
  initialize,
  isAvailable,
  setUser,
  setUserProperties,
  trackPageView,
  trackEvent,
  trackLocationSubmission,
  trackReviewSubmission,
  trackPhotoUpload,
  trackSearch,
  trackLocationView,
  trackSignUp,
  trackLogin,
  trackModerationAction,
  trackDiscoveryOperation,
  trackEngagement,
  trackLocationSelect,
  trackConversion,
} = FirebaseAnalyticsService;
