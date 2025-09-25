// Offline-first authentication strategies
import { auth } from '@/lib/firebase/config';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  User
} from 'firebase/auth';
import { NetworkChecker } from '@/lib/utils/network-checker';

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
  networkIssue?: boolean;
}

export class OfflineAuthService {
  /**
   * Enhanced email/password sign in with network error handling
   */
  static async signInWithEmail(email: string, password: string): Promise<AuthResult> {
    try {
      // Check network connectivity first
      const isConnected = NetworkChecker.isConnected();
      if (!isConnected) {
        return {
          success: false,
          error: "No internet connection. Please check your network and try again.",
          networkIssue: true
        };
      }

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Authentication timeout'));
        }, 10000);
      });

      // Attempt sign in with timeout
      const userCredential = await Promise.race([
        signInWithEmailAndPassword(auth, email, password),
        timeoutPromise
      ]);

      return {
        success: true,
        user: userCredential.user
      };

    } catch (error: any) {
      // Handle specific error types
      let errorMessage = error.message;
      let networkIssue = false;

      if (error.message.includes('timeout') || 
          error.message.includes('Failed to fetch') ||
          error.code === 'auth/network-request-failed') {
        errorMessage = "Network connection issue. Please check your internet connection and try again.";
        networkIssue = true;
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = "No account found with this email address.";
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = "Incorrect password. Please try again.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Invalid email address format.";
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = "This account has been disabled. Please contact support.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many failed attempts. Please try again later.";
      }

      return {
        success: false,
        error: errorMessage,
        networkIssue
      };
    }
  }

  /**
   * Enhanced email/password sign up with network error handling
   */
  static async signUpWithEmail(email: string, password: string, name: string): Promise<AuthResult> {
    try {
      // Check network connectivity first
      const isConnected = NetworkChecker.isConnected();
      if (!isConnected) {
        return {
          success: false,
          error: "No internet connection. Please check your network and try again.",
          networkIssue: true
        };
      }

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Authentication timeout'));
        }, 15000);
      });

      // Attempt sign up with timeout
      const userCredential = await Promise.race([
        createUserWithEmailAndPassword(auth, email, password),
        timeoutPromise
      ]);

      // Update display name if provided
      if (name && userCredential.user) {
        try {
          await Promise.race([
            updateProfile(userCredential.user, { displayName: name }),
            new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error('Profile update timeout')), 5000);
            })
          ]);
        } catch (profileError) {
          console.warn('Profile update failed:', profileError);
          // Don't fail the entire sign up for profile update issues
        }
      }

      return {
        success: true,
        user: userCredential.user
      };

    } catch (error: any) {
      // Handle specific error types
      let errorMessage = error.message;
      let networkIssue = false;

      if (error.message.includes('timeout') || 
          error.message.includes('Failed to fetch') ||
          error.code === 'auth/network-request-failed') {
        errorMessage = "Network connection issue. Please check your internet connection and try again.";
        networkIssue = true;
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = "An account with this email already exists. Please sign in instead.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password is too weak. Please use at least 6 characters.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Invalid email address format.";
      }

      return {
        success: false,
        error: errorMessage,
        networkIssue
      };
    }
  }

  /**
   * Password reset with network error handling
   */
  static async resetPassword(email: string): Promise<AuthResult> {
    try {
      // Check network connectivity first
      const isConnected = NetworkChecker.isConnected();
      if (!isConnected) {
        return {
          success: false,
          error: "No internet connection. Please check your network and try again.",
          networkIssue: true
        };
      }

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Password reset timeout'));
        }, 10000);
      });

      // Attempt password reset with timeout
      await Promise.race([
        sendPasswordResetEmail(auth, email),
        timeoutPromise
      ]);

      return {
        success: true
      };

    } catch (error: any) {
      let errorMessage = error.message;
      let networkIssue = false;

      if (error.message.includes('timeout') || 
          error.message.includes('Failed to fetch') ||
          error.code === 'auth/network-request-failed') {
        errorMessage = "Network connection issue. Please check your internet connection and try again.";
        networkIssue = true;
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = "No account found with this email address.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Invalid email address format.";
      }

      return {
        success: false,
        error: errorMessage,
        networkIssue
      };
    }
  }

  /**
   * Check if Google Auth is available (not blocked by network)
   */
  static async isGoogleAuthAvailable(): Promise<boolean> {
    try {
      const connectivity = await NetworkChecker.testFirebaseConnectivity();
      return connectivity.auth;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get authentication recommendations based on network status
   */
  static async getAuthRecommendations(): Promise<{
    preferredMethod: 'email' | 'google' | 'both';
    message: string;
    showGoogleButton: boolean;
  }> {
    const isConnected = NetworkChecker.isConnected();
    
    if (!isConnected) {
      return {
        preferredMethod: 'email',
        message: "You're offline. Please check your internet connection to sign in.",
        showGoogleButton: false
      };
    }

    const googleAvailable = await this.isGoogleAuthAvailable();
    
    if (googleAvailable) {
      return {
        preferredMethod: 'both',
        message: "All authentication methods are available.",
        showGoogleButton: true
      };
    } else {
      return {
        preferredMethod: 'email',
        message: "Google Sign-In is currently unavailable. Please use email/password authentication.",
        showGoogleButton: false
      };
    }
  }
}

// Export convenience functions
export const {
  signInWithEmail,
  signUpWithEmail,
  resetPassword,
  isGoogleAuthAvailable,
  getAuthRecommendations
} = OfflineAuthService;
