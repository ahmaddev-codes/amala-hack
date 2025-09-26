/**
 * Geolocation utilities for getting user's current location
 */

export interface UserLocation {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface GeolocationOptions {
  timeout?: number;
  enableHighAccuracy?: boolean;
  maximumAge?: number;
}

/**
 * Get user's current location with promise-based API
 */
export async function getCurrentLocation(
  options: GeolocationOptions = {}
): Promise<UserLocation> {
  const {
    timeout = 10000,
    enableHighAccuracy = false,
    maximumAge = 300000, // 5 minutes
  } = options;

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        let errorMessage = 'Unknown geolocation error';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        
        reject(new Error(errorMessage));
      },
      {
        timeout,
        enableHighAccuracy,
        maximumAge,
      }
    );
  });
}

/**
 * Check if geolocation is available
 */
export function isGeolocationAvailable(): boolean {
  return 'geolocation' in navigator;
}

/**
 * Get user location with fallback to default location
 */
export async function getUserLocationWithFallback(
  fallbackLocation: UserLocation = { lat: 20, lng: 0 },
  options: GeolocationOptions = {}
): Promise<{ location: UserLocation; fromGeolocation: boolean }> {
  try {
    const location = await getCurrentLocation(options);
    console.log('📍 Got user location:', location);
    return { location, fromGeolocation: true };
  } catch (error) {
    console.log('📍 Using fallback location:', error);
    return { location: fallbackLocation, fromGeolocation: false };
  }
}

/**
 * Store user location in session storage for quick access
 */
export function storeUserLocation(location: UserLocation): void {
  try {
    sessionStorage.setItem('userLocation', JSON.stringify({
      ...location,
      timestamp: Date.now(),
    }));
  } catch (error) {
    console.warn('Failed to store user location:', error);
  }
}

/**
 * Get stored user location from session storage
 */
export function getStoredUserLocation(maxAge: number = 300000): UserLocation | null {
  try {
    const stored = sessionStorage.getItem('userLocation');
    if (!stored) return null;

    const data = JSON.parse(stored);
    const age = Date.now() - data.timestamp;
    
    if (age > maxAge) {
      sessionStorage.removeItem('userLocation');
      return null;
    }

    return {
      lat: data.lat,
      lng: data.lng,
      accuracy: data.accuracy,
    };
  } catch (error) {
    console.warn('Failed to get stored user location:', error);
    return null;
  }
}
