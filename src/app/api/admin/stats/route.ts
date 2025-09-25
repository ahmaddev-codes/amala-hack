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

    const roleCheck = requireRole(authResult.user!, ["admin"]);
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
      allUsers,
      allLocations,
      allReviews,
      analyticsEvents,
    ] = await Promise.all([
      adminFirebaseOperations.getAllUsers(),
      adminFirebaseOperations.getAllLocations(),
      adminFirebaseOperations.getAllReviews(),
      adminFirebaseOperations.getAnalyticsEvents(daysBack),
    ]);

    // Filter data by date range
    const recentUsers = allUsers.filter((user: any) => 
      user.metadata?.creationTime && new Date(user.metadata.creationTime) >= startDate
    );
    const recentLocations = allLocations.filter((location: any) => 
      location.submittedAt && new Date(location.submittedAt) >= startDate
    );
    const recentReviews = allReviews.filter((review: any) => 
      review.date_posted && new Date(review.date_posted) >= startDate
    );

    // Calculate stats
    const approvedLocations = allLocations.filter((l: any) => l.status === 'approved');
    const pendingLocations = allLocations.filter((l: any) => l.status === 'pending');
    const approvedReviews = allReviews.filter((r: any) => r.status === 'approved');
    
    const totalRating = approvedReviews.reduce((sum: number, review: any) => sum + (review.rating || 0), 0);
    const averageRating = approvedReviews.length > 0 ? totalRating / approvedReviews.length : 0;

    const newUsersToday = allUsers.filter((user: any) => 
      user.metadata?.creationTime && new Date(user.metadata.creationTime) >= oneDayAgo
    ).length;

    const weeklyUsers = allUsers.filter((user: any) => 
      user.metadata?.creationTime && new Date(user.metadata.creationTime) >= oneWeekAgo
    ).length;

    const previousWeekUsers = allUsers.filter((user: any) => {
      const creationTime = user.metadata?.creationTime;
      if (!creationTime) return false;
      const date = new Date(creationTime);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      return date >= twoWeeksAgo && date < oneWeekAgo;
    }).length;

    const weeklyGrowth = previousWeekUsers > 0 ? 
      ((weeklyUsers - previousWeekUsers) / previousWeekUsers) * 100 : 0;

    const conversionRate = allUsers.length > 0 ? 
      (approvedLocations.length / allUsers.length) * 100 : 0;

    const stats = {
      totalUsers: allUsers.length,
      activeUsers: weeklyUsers,
      newUsersToday,
      totalLocations: allLocations.length,
      approvedLocations: approvedLocations.length,
      pendingLocations: pendingLocations.length,
      totalReviews: allReviews.length,
      averageRating,
      moderationQueue: pendingLocations.length + allReviews.filter((r: any) => r.status === 'pending').length,
      systemHealth: calculateSystemHealth(allLocations, allReviews, analyticsEvents),
      dailySubmissions: recentLocations.filter((l: any) => 
        new Date(l.submittedAt) >= oneDayAgo
      ).length,
      weeklyGrowth,
      conversionRate,
    };

    // Generate chart data
    const chartData = generateChartData(daysBack, allUsers, allLocations, allReviews);

    return NextResponse.json({
      success: true,
      stats,
      chartData,
    });

  } catch (error: any) {
    console.error("❌ Error fetching admin stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin stats", details: error.message },
      { status: 500 }
    );
  }
}

function calculateSystemHealth(locations: any[], reviews: any[], events: any[]): number {
  let health = 100;
  
  // Reduce health based on pending items
  const pendingLocations = locations.filter(l => l.status === 'pending').length;
  const pendingReviews = reviews.filter(r => r.status === 'pending').length;
  const totalPending = pendingLocations + pendingReviews;
  
  if (totalPending > 50) health -= 20;
  else if (totalPending > 20) health -= 10;
  else if (totalPending > 10) health -= 5;
  
  // Check for recent errors in events
  const recentErrors = events.filter((e: any) => 
    e.type === 'error' && 
    new Date(e.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
  ).length;
  
  if (recentErrors > 10) health -= 15;
  else if (recentErrors > 5) health -= 10;
  
  return Math.max(health, 0);
}

function generateChartData(days: number, users: any[], locations: any[], reviews: any[]): any[] {
  const chartData = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayUsers = users.filter((u: any) => 
      u.metadata?.creationTime && 
      new Date(u.metadata.creationTime).toISOString().split('T')[0] === dateStr
    );
    
    const dayLocations = locations.filter((l: any) => {
      if (!l.submittedAt) return false;
      
      try {
        let date;
        if (l.submittedAt.toDate) {
          // Firestore Timestamp
          date = l.submittedAt.toDate();
        } else {
          date = new Date(l.submittedAt);
        }
        
        // Check if date is valid
        if (isNaN(date.getTime())) return false;
        
        return date.toISOString().split('T')[0] === dateStr;
      } catch (error) {
        return false;
      }
    });
    
    const dayReviews = reviews.filter((r: any) => {
      if (!r.date_posted) return false;
      
      try {
        let date;
        if (r.date_posted.toDate) {
          // Firestore Timestamp
          date = r.date_posted.toDate();
        } else {
          date = new Date(r.date_posted);
        }
        
        // Check if date is valid
        if (isNaN(date.getTime())) return false;
        
        return date.toISOString().split('T')[0] === dateStr;
      } catch (error) {
        return false;
      }
    });
    
    chartData.push({
      date: dateStr,
      users: dayUsers.length,
      locations: dayLocations.length,
      reviews: dayReviews.length,
      approvals: dayLocations.filter((l: any) => l.status === 'approved').length +
                dayReviews.filter((r: any) => r.status === 'approved').length,
      rejections: dayLocations.filter((l: any) => l.status === 'rejected').length +
                 dayReviews.filter((r: any) => r.status === 'rejected').length,
    });
  }
  
  return chartData;
}
