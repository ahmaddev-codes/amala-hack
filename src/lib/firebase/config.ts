import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  // storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, // Removed - Using Cloudinary instead
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Validate required config
const requiredConfig = ['apiKey', 'authDomain', 'projectId'];
for (const key of requiredConfig) {
  if (!firebaseConfig[key as keyof typeof firebaseConfig]) {
    console.error(`❌ Missing Firebase config: ${key}`);
  }
}

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize services with enhanced configuration
export const auth = getAuth(app);

// Configure Firestore with timeout and retry settings
export const db = getFirestore(app);


// Non-blocking Analytics initialization with network error handling
let analytics: any = null;
let analyticsInitialized = false;

if (typeof window !== "undefined") {
  // Initialize analytics asynchronously with timeout and error handling
  const initializeAnalytics = async () => {
    try {
      // Set a timeout for analytics initialization
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Analytics initialization timeout')), 10000);
      });

      const initPromise = isSupported().then(async (supported) => {
        if (supported) {
          analytics = getAnalytics(app);
          analyticsInitialized = true;
          console.log("✅ Firebase Analytics initialized successfully");
          return analytics;
        } else {
          console.warn("⚠️ Firebase Analytics not supported in this environment");
          return null;
        }
      });

      await Promise.race([initPromise, timeoutPromise]);
    } catch (error: any) {
      console.warn("⚠️ Firebase Analytics initialization failed (likely network issue):", error.message);
      analytics = null;
      analyticsInitialized = false;
      
      // Don't retry automatically to avoid spam
      if (error.message.includes('Failed to fetch') || error.message.includes('timeout')) {
        console.warn("🌐 Network connectivity issue detected. Analytics will be disabled for this session.");
      }
    }
  };

  // Delay initialization to prevent blocking
  setTimeout(initializeAnalytics, 500);
}

// Export a function to check if analytics is ready
export const isAnalyticsReady = () => analyticsInitialized && analytics !== null;

export { analytics };

export default app;
