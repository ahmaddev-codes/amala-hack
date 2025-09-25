/**
 * Firestore Health Check and Diagnostics API
 */

import { NextRequest, NextResponse } from 'next/server';
import { firebaseOperations } from '@/lib/firebase/database';

/**
 * GET /api/health/firestore
 * Health check endpoint for Firestore connectivity
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const detailed = url.searchParams.get('detailed') === 'true';

    // Basic health check
    const health = await firebaseOperations.checkHealth();

    if (!detailed) {
      return NextResponse.json({
        status: health.healthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
      });
    }

    // Detailed diagnostics
    const diagnosis = await firebaseOperations.diagnoseIssues();

    return NextResponse.json({
      status: health.healthy ? 'healthy' : 'unhealthy',
      health,
      diagnosis,
      timestamp: new Date().toISOString(),
      environment: {
        hasFirebaseConfig: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        hasGoogleMapsKey: !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
        hasGeminiKey: !!process.env.GOOGLE_GEMINI_API_KEY,
        nodeEnv: process.env.NODE_ENV,
      },
    });
  } catch (error: any) {
    console.error('Health check API error:', error);

    return NextResponse.json({
      status: 'error',
      error: error.message || 'Health check failed',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

/**
 * POST /api/health/firestore/test-connection
 * Test Firestore connection with a simple operation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { operation = 'read' } = body;

    let result;
    let duration;

    switch (operation) {
      case 'read': {
        const startTime = Date.now();
        try {
          const locations = await firebaseOperations.getLocations({ limit: 1 });
          duration = Date.now() - startTime;
          result = {
            success: true,
            operation: 'read',
            count: locations.length,
            duration: `${duration}ms`,
          };
        } catch (error: any) {
          duration = Date.now() - startTime;
          result = {
            success: false,
            operation: 'read',
            error: error.message,
            duration: `${duration}ms`,
          };
        }
        break;
      }

      case 'write': {
        const startTime = Date.now();
        try {
          // Create a test location that we'll immediately delete
          const testLocation = {
            name: 'Health Check Test Location',
            address: 'Test Address',
            coordinates: { lat: 0, lng: 0 },
            isOpenNow: false,
            serviceType: 'dine-in' as const,
            cuisine: ['test'],
            dietary: [],
            features: [],
            hours: {},
            status: 'pending' as const,
            submittedAt: new Date(),
            phone: '',
            website: '',
            description: '',
            priceInfo: '',
          };

          const created = await firebaseOperations.createLocation(testLocation);
          duration = Date.now() - startTime;

          // Clean up - reject the test location
          await firebaseOperations.updateLocationStatus(created.id, 'rejected');

          result = {
            success: true,
            operation: 'write',
            locationId: created.id,
            duration: `${duration}ms`,
          };
        } catch (error: any) {
          duration = Date.now() - startTime;
          result = {
            success: false,
            operation: 'write',
            error: error.message,
            duration: `${duration}ms`,
          };
        }
        break;
      }

      default:
        return NextResponse.json({
          error: 'Invalid operation. Use "read" or "write"',
        }, { status: 400 });
    }

    return NextResponse.json({
      test: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Connection test API error:', error);

    return NextResponse.json({
      error: error.message || 'Connection test failed',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
