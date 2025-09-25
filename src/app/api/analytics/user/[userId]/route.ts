import { NextRequest, NextResponse } from "next/server";
import { verifyBearerToken } from "@/lib/auth";
import { adminFirebaseOperations } from "@/lib/firebase/admin-database";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
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

    // Await params in Next.js 15
    const { userId } = await params;

    // Get user analytics from various sources
    const [
      userSubmissions,
      userReviews,
      moderationHistory,
    ] = await Promise.all([
      adminFirebaseOperations.getUserSubmissions(userId),
      adminFirebaseOperations.getUserReviews(userId),
      adminFirebaseOperations.getUserModerationHistory(userId),
    ]);

    // Calculate analytics
    const totalSubmissions = userSubmissions.length;
    const approvedSubmissions = userSubmissions.filter((s: any) => s.status === 'approved').length;
    const rejectedSubmissions = userSubmissions.filter((s: any) => s.status === 'rejected').length;
    const pendingSubmissions = userSubmissions.filter((s: any) => s.status === 'pending').length;

    const totalReviews = userReviews.length;
    const approvedReviews = userReviews.filter((r: any) => r.status === 'approved').length;

    const approvalRate = totalSubmissions > 0 
      ? (approvedSubmissions / totalSubmissions) * 100 
      : 0;

    const analytics = {
      submissions: totalSubmissions,
      approvedSubmissions,
      rejectedSubmissions,
      pendingSubmissions,
      reviews: totalReviews,
      approvedReviews,
      approvalRate,
      moderationActions: moderationHistory.length,
      joinDate: userSubmissions[0]?.createdAt || new Date(),
      lastActivity: Math.max(
        userSubmissions[0]?.createdAt?.getTime() || 0,
        userReviews[0]?.createdAt?.getTime() || 0
      ),
    };

    return NextResponse.json(analytics);

  } catch (error: any) {
    console.error("Error fetching user analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch user analytics", details: error.message },
      { status: 500 }
    );
  }
}
