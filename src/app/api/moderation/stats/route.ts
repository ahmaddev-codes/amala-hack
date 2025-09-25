import { NextRequest, NextResponse } from "next/server";
import { verifyBearerToken, requireRole } from "@/lib/auth";
import { adminFirebaseOperations } from "@/lib/firebase/admin-database";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("timeRange") || "30d";
    
    // Verify authentication and role
    const authResult = await verifyBearerToken(request.headers.get("authorization") || undefined);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const roleCheck = requireRole(authResult.user!, ["mod", "admin"]);
    if (!roleCheck.success) {
      return NextResponse.json({ error: roleCheck.error }, { status: 403 });
    }

    // Calculate date range
    const now = new Date();
    const daysBack = parseInt(timeRange.replace('d', ''));
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Fetch all necessary data in parallel
    const [
      allReviews,
      allLocations,
      flaggedContent,
      moderationHistory,
    ] = await Promise.all([
      adminFirebaseOperations.getAllReviews(),
      adminFirebaseOperations.getAllLocations(),
      adminFirebaseOperations.getFlaggedContent('pending'),
      adminFirebaseOperations.getModerationHistory({
        days: daysBack,
        limit: 1000
      }),
    ]);

    // Filter data by date range
    const recentReviews = allReviews.filter((review: any) => 
      review.date_posted && new Date(review.date_posted) >= startDate
    );
    const recentLocations = allLocations.filter((location: any) => 
      location.submittedAt && new Date(location.submittedAt) >= startDate
    );

    // Calculate stats
    const stats = {
      totalReviews: recentReviews.length,
      pendingReviews: recentReviews.filter((r: any) => r.status === 'pending').length,
      approvedReviews: recentReviews.filter((r: any) => r.status === 'approved').length,
      rejectedReviews: recentReviews.filter((r: any) => r.status === 'rejected').length,
      
      totalLocations: recentLocations.length,
      pendingLocations: recentLocations.filter((l: any) => l.status === 'pending').length,
      approvedLocations: recentLocations.filter((l: any) => l.status === 'approved').length,
      rejectedLocations: recentLocations.filter((l: any) => l.status === 'rejected').length,
      
      flaggedContent: flaggedContent.length,
      
      dailyActions: moderationHistory.filter((h: any) => 
        h.timestamp && new Date(h.timestamp) >= oneDayAgo
      ).length,
      weeklyActions: moderationHistory.filter((h: any) => 
        h.timestamp && new Date(h.timestamp) >= oneWeekAgo
      ).length,
      monthlyActions: moderationHistory.length,
      
      averageResponseTime: calculateAverageResponseTime(moderationHistory),
      approvalRate: calculateApprovalRate(recentReviews, recentLocations),
    };

    // Generate chart data
    const chartData = generateChartData(daysBack, recentReviews, recentLocations, moderationHistory);

    return NextResponse.json({
      success: true,
      stats,
      chartData,
    });

  } catch (error: any) {
    console.error("❌ Error fetching moderation stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch moderation stats", details: error.message },
      { status: 500 }
    );
  }
}

function calculateAverageResponseTime(moderationHistory: any[]): number {
  if (moderationHistory.length === 0) return 0;
  
  // Calculate average time between submission and moderation
  // This is a simplified calculation - in production you'd want more sophisticated tracking
  const responseTimes = moderationHistory
    .filter((h: any) => h.responseTime)
    .map((h: any) => h.responseTime);
  
  if (responseTimes.length === 0) return 0;
  
  const totalTime = responseTimes.reduce((sum: number, time: number) => sum + time, 0);
  return Math.round(totalTime / responseTimes.length / (1000 * 60 * 60)); // Convert to hours
}

function calculateApprovalRate(reviews: any[], locations: any[]): number {
  const totalItems = reviews.length + locations.length;
  if (totalItems === 0) return 0;
  
  const approvedItems = reviews.filter((r: any) => r.status === 'approved').length +
                       locations.filter((l: any) => l.status === 'approved').length;
  
  return (approvedItems / totalItems) * 100;
}

function generateChartData(days: number, reviews: any[], locations: any[], moderationHistory: any[]): any[] {
  const chartData = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayReviews = reviews.filter((r: any) => 
      new Date(r.date_posted).toISOString().split('T')[0] === dateStr
    );
    
    const dayLocations = locations.filter((l: any) => 
      new Date(l.submittedAt).toISOString().split('T')[0] === dateStr
    );
    
    const dayActions = moderationHistory.filter((h: any) => 
      new Date(h.timestamp).toISOString().split('T')[0] === dateStr
    );
    
    chartData.push({
      date: dateStr,
      reviews: dayReviews.length,
      locations: dayLocations.length,
      flags: dayActions.filter((a: any) => a.action === 'flag').length,
      approved: dayActions.filter((a: any) => a.action === 'approved').length,
      rejected: dayActions.filter((a: any) => a.action === 'rejected').length,
    });
  }
  
  return chartData;
}
