import { NextRequest, NextResponse } from "next/server";
import { firebaseOperations } from "@/lib/firebase/database";

function toDays(n: number) { return new Date(Date.now() - n * 24 * 60 * 60 * 1000); }

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = Number(searchParams.get("days")) || 7;
    const since = toDays(days);

    // Get all locations to calculate metrics
    const allLocations = await firebaseOperations.getAllLocations();
    
    // Filter locations by date range
    const recentLocations = allLocations.filter(loc => {
      const submittedAt = loc.submittedAt;
      if (!submittedAt) return false;
      const submittedDate = submittedAt instanceof Date ? submittedAt : new Date(submittedAt);
      return submittedDate >= since;
    });

    // Calculate submissions per day - ensure consistent date generation
    const submissionsPerDay: Record<string, number> = {};
    
    // Initialize all days in the range with 0 to ensure consistency
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().slice(0, 10);
      submissionsPerDay[dateKey] = 0;
    }
    
    // Add actual submissions
    recentLocations.forEach(loc => {
      const submittedAt = loc.submittedAt;
      if (submittedAt) {
        const submittedDate = submittedAt instanceof Date ? submittedAt : new Date(submittedAt);
        // Ensure we're using the current year
        if (submittedDate.getFullYear() === new Date().getFullYear()) {
          const dateKey = submittedDate.toISOString().slice(0, 10);
          if (submissionsPerDay.hasOwnProperty(dateKey)) {
            submissionsPerDay[dateKey] = (submissionsPerDay[dateKey] || 0) + 1;
          }
        }
      }
    });

    // Calculate verification rate
    const moderatedLocations = allLocations.filter(loc => {
      const moderatedAt = loc.moderatedAt;
      if (!moderatedAt) return false;
      const moderatedDate = moderatedAt instanceof Date ? moderatedAt : new Date(moderatedAt);
      return moderatedDate >= since;
    });
    
    const approved = moderatedLocations.filter(loc => loc.status === 'approved').length;
    const rejected = moderatedLocations.filter(loc => loc.status === 'rejected').length;
    const verificationRate = (approved + rejected) > 0 ? approved / (approved + rejected) : null;

    // Calculate average time to approval
    const approvedInWindow = moderatedLocations.filter(loc => loc.status === 'approved');
    let totalHours = 0;
    let validApprovals = 0;
    
    approvedInWindow.forEach(loc => {
      const submitted = loc.submittedAt;
      const moderated = loc.moderatedAt;
      if (submitted && moderated) {
        const submittedDate = submitted instanceof Date ? submitted : new Date(submitted);
        const moderatedDate = moderated instanceof Date ? moderated : new Date(moderated);
        totalHours += (moderatedDate.getTime() - submittedDate.getTime()) / (1000 * 60 * 60);
        validApprovals++;
      }
    });
    
    const avgTimeToApprovalHours = validApprovals > 0 ? totalHours / validApprovals : null;

    // Calculate approved locations and reviews for analytics (not totals)
    const approvedLocations = allLocations.filter(loc => loc.status === 'approved');
    const approvedReviews = approvedLocations.reduce((acc, loc) => acc + (loc.reviewCount || 0), 0);

    // Simple event counts (we'll expand this later)
    const eventCounts: Record<string, number> = {
      'location_submitted': recentLocations.length,
      'location_approved': approved,
      'location_rejected': rejected,
      'pending_review': allLocations.filter(loc => loc.status === 'pending').length
    };

    // Calculate dedup rate (placeholder for now)
    const dedupRate = null; // Will implement when we have duplicate detection events

    return NextResponse.json({
      success: true,
      data: {
        windowDays: days,
        submissionsPerDay,
        verificationRate,
        avgTimeToApprovalHours,
        dedupRate,
        eventCounts,
        approvedLocations, // Approved locations count for analytics
        approvedReviews    // Reviews from approved locations for analytics
      }
    });
  } catch (error) {
    console.error('Metrics error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
