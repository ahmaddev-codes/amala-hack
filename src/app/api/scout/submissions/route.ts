import { NextRequest, NextResponse } from "next/server";
import { verifyBearerToken } from "@/lib/auth";
import { adminFirebaseOperations } from "@/lib/firebase/admin-database";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("timeRange") || "30d";
    
    // Get authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      );
    }

    // Verify authentication
    const authResult = await verifyBearerToken(authHeader);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Calculate date range
    const now = new Date();
    const daysBack = parseInt(timeRange.replace('d', ''));
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

    // Get user's submissions
    const userSubmissions = await adminFirebaseOperations.getUserSubmissions(authResult.user.email || '');
    
    // Filter by date range
    const filteredSubmissions = userSubmissions.filter((submission: any) => 
      submission.createdAt && new Date(submission.createdAt) >= startDate
    );

    // Transform data for frontend
    const submissions = filteredSubmissions.map((submission: any) => ({
      id: submission.id,
      name: submission.name || 'Unnamed Location',
      status: submission.status || 'pending',
      submittedAt: submission.createdAt,
      address: submission.address || 'Address not available',
      city: submission.city || 'Unknown',
      country: submission.country || 'Unknown',
      location: `${submission.city || 'Unknown'}, ${submission.country || 'Unknown'}`,
      fullAddress: submission.address ? 
        `${submission.address}${submission.city ? ', ' + submission.city : ''}${submission.country ? ', ' + submission.country : ''}` :
        `${submission.city || 'Unknown'}, ${submission.country || 'Unknown'}`,
      rating: submission.rating || null,
      photos: submission.images?.length || 0,
    }));

    return NextResponse.json({
      success: true,
      submissions,
      count: submissions.length,
    });

  } catch (error: any) {
    console.error("Error fetching scout submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions", details: error.message },
      { status: 500 }
    );
  }
}
