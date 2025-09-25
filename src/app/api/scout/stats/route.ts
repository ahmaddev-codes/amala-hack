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
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get user's submissions and reviews
    const [userSubmissions, userReviews] = await Promise.all([
      adminFirebaseOperations.getUserSubmissions(authResult.user.email || ''),
      adminFirebaseOperations.getUserReviews(authResult.user.email || ''),
    ]);

    // Filter by date range
    const filteredSubmissions = userSubmissions.filter((submission: any) => 
      submission.createdAt && new Date(submission.createdAt) >= startDate
    );

    const weeklySubmissions = userSubmissions.filter((submission: any) => 
      submission.createdAt && new Date(submission.createdAt) >= oneWeekAgo
    );

    // Calculate stats
    const totalSubmissions = filteredSubmissions.length;
    const approvedSubmissions = filteredSubmissions.filter((s: any) => s.status === 'approved').length;
    const pendingSubmissions = filteredSubmissions.filter((s: any) => s.status === 'pending').length;
    const rejectedSubmissions = filteredSubmissions.filter((s: any) => s.status === 'rejected').length;
    
    const approvalRate = totalSubmissions > 0 ? (approvedSubmissions / totalSubmissions) * 100 : 0;
    
    // Calculate scout level based on approved submissions and approval rate
    const scoutLevel = calculateScoutLevel(approvedSubmissions, approvalRate);
    const scoutPoints = calculateScoutPoints(approvedSubmissions, approvalRate, userReviews.length);

    // Calculate average rating from approved submissions
    const ratingsSum = filteredSubmissions
      .filter((s: any) => s.status === 'approved' && s.rating)
      .reduce((sum: number, s: any) => sum + (s.rating || 0), 0);
    const ratingsCount = filteredSubmissions.filter((s: any) => s.status === 'approved' && s.rating).length;
    const averageRating = ratingsCount > 0 ? ratingsSum / ratingsCount : 0;

    // Count total photos from submissions
    const totalPhotos = filteredSubmissions.reduce((sum: number, s: any) => 
      sum + (s.images?.length || 0), 0
    );

    const stats = {
      totalSubmissions,
      approvedSubmissions,
      pendingSubmissions,
      rejectedSubmissions,
      approvalRate,
      scoutLevel,
      scoutPoints,
      weeklySubmissions: weeklySubmissions.length,
      monthlySubmissions: totalSubmissions,
      averageRating,
      totalPhotos,
      totalReviews: userReviews.length,
    };

    return NextResponse.json({
      success: true,
      stats,
    });

  } catch (error: any) {
    console.error("Error fetching scout stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats", details: error.message },
      { status: 500 }
    );
  }
}

function calculateScoutLevel(approvedSubmissions: number, approvalRate: number): string {
  const score = approvedSubmissions * (approvalRate / 100);
  
  if (score >= 100) return 'Master Scout';
  if (score >= 50) return 'Expert Scout';
  if (score >= 20) return 'Advanced Scout';
  if (score >= 5) return 'Experienced Scout';
  return 'Beginner Scout';
}

function calculateScoutPoints(approvedSubmissions: number, approvalRate: number, reviewCount: number): number {
  let points = 0;
  
  // Points for approved submissions
  points += approvedSubmissions * 10;
  
  // Bonus points for high approval rate
  if (approvalRate >= 90) points += approvedSubmissions * 5;
  else if (approvalRate >= 75) points += approvedSubmissions * 3;
  else if (approvalRate >= 50) points += approvedSubmissions * 1;
  
  // Points for reviews
  points += reviewCount * 2;
  
  return points;
}
