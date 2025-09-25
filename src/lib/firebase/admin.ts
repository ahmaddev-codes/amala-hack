import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK
if (!getApps().length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  if (!privateKey || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PROJECT_ID) {
    console.warn('Firebase Admin SDK not initialized - missing environment variables:');
    console.warn('- FIREBASE_PRIVATE_KEY:', privateKey ? 'present' : 'missing');
    console.warn('- FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? 'present' : 'missing');
    console.warn('- FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? 'present' : 'missing');
  } else {
    try {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
      console.log('✅ Firebase Admin SDK initialized successfully');
    } catch (error) {
      console.error('❌ Firebase Admin SDK initialization failed:', error);
    }
  }
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();

// Helper function to verify Firebase is properly initialized
export function isFirebaseAdminInitialized(): boolean {
  return getApps().length > 0;
}