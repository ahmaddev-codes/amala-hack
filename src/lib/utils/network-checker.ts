// Network connectivity checker for Firebase services
export class NetworkChecker {
  private static isOnline = navigator.onLine;
  private static listeners: ((online: boolean) => void)[] = [];

  static {
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.notifyListeners(true);
      });
      
      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.notifyListeners(false);
      });
    }
  }

  /**
   * Check if the browser reports being online
   */
  static isConnected(): boolean {
    return this.isOnline;
  }

  /**
   * Test actual connectivity to Firebase services
   */
  static async testFirebaseConnectivity(): Promise<{
    analytics: boolean;
    auth: boolean;
    firestore: boolean;
    overall: boolean;
  }> {
    const results = {
      analytics: false,
      auth: false,
      firestore: false,
      overall: false
    };

    // Test Google Analytics connectivity
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      await fetch('https://www.googletagmanager.com/gtag/js?id=test', {
        method: 'HEAD',
        signal: controller.signal,
        mode: 'no-cors'
      });
      
      clearTimeout(timeoutId);
      results.analytics = true;
    } catch (error) {
      console.warn('Analytics connectivity test failed:', error);
    }

    // Test Google Auth API connectivity
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      await fetch('https://apis.google.com/js/api.js', {
        method: 'HEAD',
        signal: controller.signal,
        mode: 'no-cors'
      });
      
      clearTimeout(timeoutId);
      results.auth = true;
    } catch (error) {
      console.warn('Auth API connectivity test failed:', error);
    }

    // Test Firestore connectivity (basic)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      await fetch('https://firestore.googleapis.com/', {
        method: 'HEAD',
        signal: controller.signal,
        mode: 'no-cors'
      });
      
      clearTimeout(timeoutId);
      results.firestore = true;
    } catch (error) {
      console.warn('Firestore connectivity test failed:', error);
    }

    results.overall = results.analytics || results.auth || results.firestore;
    return results;
  }

  /**
   * Get user-friendly network status message
   */
  static async getNetworkStatus(): Promise<{
    connected: boolean;
    message: string;
    suggestions: string[];
  }> {
    const isOnline = this.isConnected();
    
    if (!isOnline) {
      return {
        connected: false,
        message: "No internet connection detected",
        suggestions: [
          "Check your internet connection",
          "Try refreshing the page",
          "Contact your network administrator if on a corporate network"
        ]
      };
    }

    const connectivity = await this.testFirebaseConnectivity();
    
    if (connectivity.overall) {
      return {
        connected: true,
        message: "Network connection is working",
        suggestions: []
      };
    }

    return {
      connected: false,
      message: "Internet connection detected, but Firebase services are blocked",
      suggestions: [
        "You may be behind a firewall or proxy",
        "Try disabling VPN if you're using one",
        "Contact your network administrator",
        "Try using a different network (mobile hotspot)",
        "Some features may work with email/password authentication only"
      ]
    };
  }

  /**
   * Add listener for network status changes
   */
  static addListener(callback: (online: boolean) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private static notifyListeners(online: boolean): void {
    this.listeners.forEach(callback => {
      try {
        callback(online);
      } catch (error) {
        console.error('Network listener error:', error);
      }
    });
  }

  /**
   * Wait for network to come back online
   */
  static waitForConnection(timeoutMs: number = 30000): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.isConnected()) {
        resolve(true);
        return;
      }

      const timeout = setTimeout(() => {
        unsubscribe();
        resolve(false);
      }, timeoutMs);

      const unsubscribe = this.addListener((online) => {
        if (online) {
          clearTimeout(timeout);
          unsubscribe();
          resolve(true);
        }
      });
    });
  }
}

// Export convenience functions
export const {
  isConnected,
  testFirebaseConnectivity,
  getNetworkStatus,
  addListener: addNetworkListener,
  waitForConnection
} = NetworkChecker;
