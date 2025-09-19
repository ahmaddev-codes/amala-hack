"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useState, useEffect } from "react";
import { AmalaLocation, Review } from "@/types/location";
import { ModerationPanel } from "@/components/moderation-panel";

export default function ModeratorPage() {
  return (
    <ProtectedRoute requiredRoles={["mod", "admin"]}>
      <ModeratorDashboard />
    </ProtectedRoute>
  );
}

function ModeratorDashboard() {
  const { user, canAdmin, getIdToken } = useAuth();
  const { success, error: showError } = useToast();
  const [activeTab, setActiveTab] = useState("pending");
  const [pendingLocations, setPendingLocations] = useState<AmalaLocation[]>([]);
  const [pendingReviews, setPendingReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    pendingReviews: 0,
    pendingLocations: 0,
    flaggedContent: 0,
    todayActions: 0
  });

  const fetchPendingData = async () => {
    setLoading(true);
    try {
      // Fetch pending locations
      const locationsResponse = await fetch('/api/locations?status=pending');
      if (locationsResponse.ok) {
        const locationsData = await locationsResponse.json();
        setPendingLocations(locationsData.data || []);
        setStats(prev => ({ ...prev, pendingLocations: locationsData.data?.length || 0 }));
      }

      // Fetch pending reviews  
      const reviewsResponse = await fetch('/api/reviews?status=pending');
      if (reviewsResponse.ok) {
        const reviewsData = await reviewsResponse.json();
        setPendingReviews(reviewsData.data || []);
        setStats(prev => ({ ...prev, pendingReviews: reviewsData.data?.length || 0 }));
      }
    } catch (error) {
      console.error('Failed to fetch pending data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">
                🛡️ Moderation Center
              </h1>
              <span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded-full">
                Moderator
              </span>
              {canAdmin() && (
                <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                  Admin
                </span>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">
                Welcome, {user?.name || user?.email}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Pending Reviews</h3>
            <p className="text-3xl font-bold text-orange-600">{stats.pendingReviews}</p>
            <p className="text-sm text-gray-500">
              {stats.pendingReviews === 0 ? 'All caught up!' : 'Awaiting moderation'}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Pending Locations</h3>
            <p className="text-3xl font-bold text-blue-600">{stats.pendingLocations}</p>
            <p className="text-sm text-gray-500">
              {stats.pendingLocations === 0 ? 'No pending submissions' : 'From scouts'}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Flagged Content</h3>
            <p className="text-3xl font-bold text-red-600">{stats.flaggedContent}</p>
            <p className="text-sm text-gray-500">
              {stats.flaggedContent === 0 ? 'No reports' : 'Reported by users'}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Today's Actions</h3>
            <p className="text-3xl font-bold text-green-600">{stats.todayActions}</p>
            <p className="text-sm text-gray-500">
              {stats.todayActions === 0 ? 'No actions yet' : 'Approved/Rejected'}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { key: "pending", label: "Pending Reviews", count: stats.pendingReviews },
                { key: "locations", label: "New Locations", count: stats.pendingLocations },
                { key: "flagged", label: "Flagged Content", count: stats.flaggedContent },
                { key: "history", label: "History", count: null },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? "border-orange-500 text-orange-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab.label}
                  {tab.count && (
                    <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "pending" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-4">
                  Pending Review Moderation
                </h3>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                    <p className="text-gray-600 mt-2">Loading pending reviews...</p>
                  </div>
                ) : pendingReviews.length === 0 ? (
                  <div className="bg-gray-50 p-8 rounded-lg text-center">
                    <div className="text-4xl mb-4">\u2705</div>
                    <h4 className="font-semibold text-lg mb-2">All caught up!</h4>
                    <p className="text-gray-600">
                      No pending reviews to moderate at the moment.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingReviews.map((review) => (
                      <div key={review.id} className="bg-white p-6 rounded-lg border">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex items-center">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <span key={star} className={`text-lg ${
                                    star <= review.rating ? 'text-yellow-400' : 'text-gray-300'
                                  }`}>
                                    \u2605
                                  </span>
                                ))}
                              </div>
                              <span className="text-sm text-gray-500">
                                by {review.author}
                              </span>
                              <span className="text-xs text-gray-400">
                                {new Date(review.date_posted).toLocaleDateString()}
                              </span>
                            </div>
                            {review.text && (
                              <p className="text-gray-700 mb-3">{review.text}</p>
                            )}
                            <p className="text-xs text-gray-500">
                              Location ID: {review.location_id}
                            </p>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={async () => {
                                try {
                                  const idToken = await getIdToken();
                                  const response = await fetch('/api/reviews/moderate', {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'Authorization': `Bearer ${idToken}`
                                    },
                                    body: JSON.stringify({
                                      reviewId: review.id,
                                      action: 'approve'
                                    })
                                  });
                                  if (response.ok) {
                                    success('Review approved!', 'Approved');
                                    fetchPendingData();
                                  } else {
                                    throw new Error('Failed to approve review');
                                  }
                                } catch (error: any) {
                                  showError(error.message, 'Approval Failed');
                                }
                              }}
                              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                            >
                              \u2713 Approve
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  const idToken = await getIdToken();
                                  const response = await fetch('/api/reviews/moderate', {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'Authorization': `Bearer ${idToken}`
                                    },
                                    body: JSON.stringify({
                                      reviewId: review.id,
                                      action: 'reject'
                                    })
                                  });
                                  if (response.ok) {
                                    success('Review rejected', 'Rejected');
                                    fetchPendingData();
                                  } else {
                                    throw new Error('Failed to reject review');
                                  }
                                } catch (error: any) {
                                  showError(error.message, 'Rejection Failed');
                                }
                              }}
                              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                            >
                              \u2717 Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "locations" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-4">
                  New Location Submissions
                </h3>
                <ModerationPanel
                  isOpen={true}
                  onClose={() => {}}
                  onApprove={async (locationId: string) => {
                    try {
                      const idToken = await getIdToken();
                      const response = await fetch('/api/moderation', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${idToken}`
                        },
                        body: JSON.stringify({
                          action: 'approve',
                          locationId
                        })
                      });
                      if (response.ok) {
                        success('Location approved successfully!', 'Approved');
                        fetchPendingData();
                      } else {
                        throw new Error('Failed to approve location');
                      }
                    } catch (error: any) {
                      showError(error.message, 'Approval Failed');
                    }
                  }}
                  onReject={async (locationId: string) => {
                    try {
                      const idToken = await getIdToken();
                      const response = await fetch('/api/moderation', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${idToken}`
                        },
                        body: JSON.stringify({
                          action: 'reject',
                          locationId
                        })
                      });
                      if (response.ok) {
                        success('Location rejected', 'Rejected');
                        fetchPendingData();
                      } else {
                        throw new Error('Failed to reject location');
                      }
                    } catch (error: any) {
                      showError(error.message, 'Rejection Failed');
                    }
                  }}
                  onBulkAction={async (locationIds: string[], action: "approve" | "reject") => {
                    try {
                      const idToken = await getIdToken();
                      const response = await fetch('/api/moderation', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${idToken}`
                        },
                        body: JSON.stringify({
                          action,
                          locationIds
                        })
                      });
                      if (response.ok) {
                        success(`Bulk ${action} completed!`, 'Bulk Action');
                        fetchPendingData();
                      } else {
                        throw new Error(`Failed to ${action} locations`);
                      }
                    } catch (error: any) {
                      showError(error.message, 'Bulk Action Failed');
                    }
                  }}
                  onPendingCountChange={(count: number) => {
                    setStats(prev => ({ ...prev, pendingLocations: count }));
                  }}
                />
              </div>
            )}

            {activeTab === "flagged" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-4">Flagged Content</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-600">
                    Flagged content review interface will be implemented here.
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Features: Review reports, take action on violations, user
                    warnings
                  </p>
                </div>
              </div>
            )}

            {activeTab === "history" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-4">
                  Moderation History
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-600">
                    Moderation history and audit log will be implemented here.
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Features: View past actions, filter by moderator, export
                    reports
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
              <div className="text-lg font-semibold text-orange-600">
                📝 Review Queue
              </div>
              <div className="text-sm text-gray-500">
                Process pending reviews
              </div>
            </button>
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
              <div className="text-lg font-semibold text-blue-600">
                📍 Location Verification
              </div>
              <div className="text-sm text-gray-500">
                Verify new submissions
              </div>
            </button>
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
              <div className="text-lg font-semibold text-red-600">
                🚨 Priority Reports
              </div>
              <div className="text-sm text-gray-500">Handle urgent flags</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
