/**
 * Enhanced Firestore utilities with retry logic and better error handling
 */

import { FirebaseError } from "firebase/app";

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
};

// Common Firebase error codes that should trigger retries
const RETRY_ERROR_CODES = [
  'unavailable',
  'deadline-exceeded',
  'resource-exhausted',
  'internal',
  'aborted',
];

/**
 * Check if an error should trigger a retry
 */
export function shouldRetry(error: any): boolean {
  if (error instanceof FirebaseError) {
    return RETRY_ERROR_CODES.includes(error.code);
  }

  // Network errors, timeout errors
  if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
    return true;
  }

  return false;
}

/**
 * Calculate retry delay with exponential backoff and jitter
 */
export function calculateRetryDelay(attempt: number): number {
  const delay = Math.min(
    RETRY_CONFIG.baseDelay * Math.pow(2, attempt),
    RETRY_CONFIG.maxDelay
  );

  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.1 * delay;
  return delay + jitter;
}

/**
 * Sleep for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a Firestore operation with retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string = 'Firestore operation',
  maxRetries: number = RETRY_CONFIG.maxRetries
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 ${operationName} (attempt ${attempt + 1}/${maxRetries + 1})`);
      const result = await operation();

      if (attempt > 0) {
        console.log(`✅ ${operationName} succeeded after ${attempt + 1} attempts`);
      }

      return result;
    } catch (error) {
      lastError = error;
      console.warn(`❌ ${operationName} failed (attempt ${attempt + 1}):`, error);

      // If this is the last attempt or error shouldn't be retried
      if (attempt === maxRetries || !shouldRetry(error)) {
        console.error(`💥 ${operationName} failed permanently after ${attempt + 1} attempts:`, error);
        throw error;
      }

      // Wait before retrying
      const delay = calculateRetryDelay(attempt);
      console.log(`⏳ Retrying ${operationName} in ${Math.round(delay)}ms...`);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Enhanced error logging with context
 */
export function logFirestoreError(
  operation: string,
  error: any,
  context?: Record<string, any>
): void {
  const errorInfo = {
    operation,
    error: {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    },
    context,
    timestamp: new Date().toISOString(),
  };

  console.error('🔥 Firestore Error:', errorInfo);

  // Also log to analytics if available
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'firestore_error', {
      event_category: 'firebase',
      event_label: operation,
      value: error?.code,
    });
  }
}

/**
 * Health check for Firestore connection
 */
export async function checkFirestoreHealth(): Promise<{
  healthy: boolean;
  latency?: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    // Try to access a collection that should exist
    const { collection, query, where, limit, getDocs } = await import('firebase/firestore');
    const { db } = await import('@/lib/firebase/config');
    const testCollection = collection(db, 'locations');
    const testQ = query(testCollection, where('status', '==', 'approved'), limit(1));
    const testQuery = await getDocs(testQ);

    const latency = Date.now() - startTime;

    return {
      healthy: true,
      latency,
    };
  } catch (error: any) {
    return {
      healthy: false,
      error: error?.message || 'Unknown error',
      latency: Date.now() - startTime,
    };
  }
}

/**
 * Diagnose common Firestore connectivity issues
 */
export async function diagnoseFirestoreIssues(): Promise<{
  issues: string[];
  recommendations: string[];
}> {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check network connectivity
  try {
    const response = await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      mode: 'no-cors',
    });
  } catch {
    issues.push('Network connectivity issue detected');
    recommendations.push('Check your internet connection');
  }

  // Check Firebase configuration
  const requiredEnvVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      issues.push(`Missing environment variable: ${envVar}`);
      recommendations.push(`Set ${envVar} in your environment variables`);
    }
  }

  // Check Firestore health
  const health = await checkFirestoreHealth();
  if (!health.healthy) {
    issues.push(`Firestore connectivity issue: ${health.error}`);
    recommendations.push('Check Firebase project settings and security rules');
    recommendations.push('Verify Firestore database is enabled in your Firebase project');
  }

  return { issues, recommendations };
}
