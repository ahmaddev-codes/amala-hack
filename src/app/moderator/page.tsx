"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useState, useEffect, useCallback } from "react";
import { AmalaLocation, Review } from "@/types/location";
import { EnhancedDiscoveryPanel } from "@/components/discovery/discovery-panel";
import { FlaggedContentPanel } from "@/components/moderation/flagged-content-panel";
import { ModerationHistory } from "@/components/moderation/moderation-history";
import { memoryCache, CacheKeys } from "@/lib/cache/memory-cache";
import { 
  ChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CpuChipIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  StarIcon,
  CheckIcon,
  XMarkIcon,
  EyeIcon
} from "@heroicons/react/24/outline";
import { 
  ChartBarIcon as ChartBarSolid,
  ClockIcon as ClockSolid,
  ExclamationTriangleIcon as ExclamationTriangleSolid,
  CpuChipIcon as CpuChipSolid,
  DocumentTextIcon as DocumentTextSolid
} from "@heroicons/react/24/solid";

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
  const [activeTab, setActiveTab] = useState("overview");
  const [pendingLocations, setPendingLocations] = useState<AmalaLocation[]>([]);
  const [pendingReviews, setPendingReviews] = useState<Review[]>([]);
  const [flaggedContent, setFlaggedContent] = useState<any[]>([]);
  const [moderationHistory, setModerationHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    pendingReviews: 0,
    pendingLocations: 0,
    flaggedContent: 0,
    todayActions: 0
  });

  // PERFORMANCE OPTIMIZED: Data fetching with caching and parallel requests
  const fetchPendingData = useCallback(async (forceRefresh = false) => {
    if (loading) return; // Prevent multiple simultaneous requests
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedStats = memoryCache.get(CacheKeys.moderatorStats());
      if (cachedStats && typeof cachedStats === 'object' && 
          'pendingReviews' in cachedStats && 
          'pendingLocations' in cachedStats && 
          'flaggedContent' in cachedStats && 
          'todayActions' in cachedStats) {
        
        // Type-safe extraction of cached data
        const typedStats = {
          pendingReviews: typeof (cachedStats as any).pendingReviews === 'number' ? (cachedStats as any).pendingReviews : 0,
          pendingLocations: typeof (cachedStats as any).pendingLocations === 'number' ? (cachedStats as any).pendingLocations : 0,
          flaggedContent: typeof (cachedStats as any).flaggedContent === 'number' ? (cachedStats as any).flaggedContent : 0,
          todayActions: typeof (cachedStats as any).todayActions === 'number' ? (cachedStats as any).todayActions : 0
        };
        
        console.log('⚡ Using cached moderator stats');
        setStats(typedStats);
        return;
      }
    }
    
    setLoading(true);
    try {
      const idToken = await getIdToken();
      const headers = {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      };

      // PERFORMANCE: Parallel API calls with individual caching
      const [locationsResponse, reviewsResponse, flaggedResponse, historyResponse] = await Promise.allSettled([
        fetch('/api/locations?status=pending'),
        fetch('/api/reviews?status=pending', { headers }),
        fetch('/api/flagged?status=pending', { headers }),
        fetch('/api/moderation/history?days=30&limit=50', { headers })
      ]);

      // PERFORMANCE: Process all responses and build stats object
      let locationsData: any = null;
      let reviewsData: any = null;
      let flaggedData: any = null;
      let todayActions = 0;

      // Process locations
      if (locationsResponse.status === 'fulfilled' && locationsResponse.value.ok) {
        locationsData = await locationsResponse.value.json();
        setPendingLocations(locationsData.data || []);
      }

      // Process reviews
      if (reviewsResponse.status === 'fulfilled' && reviewsResponse.value.ok) {
        reviewsData = await reviewsResponse.value.json();
        setPendingReviews(reviewsData.data || []);
      }

      // Process flagged content
      if (flaggedResponse.status === 'fulfilled' && flaggedResponse.value.ok) {
        flaggedData = await flaggedResponse.value.json();
        setFlaggedContent(flaggedData.data || []);
      }

      // Process moderation history
      if (historyResponse.status === 'fulfilled' && historyResponse.value.ok) {
        const historyData = await historyResponse.value.json();
        setModerationHistory(historyData.data || []);
        
        // Calculate today's actions
        const today = new Date().toDateString();
        todayActions = historyData.data?.filter((action: any) => 
          new Date(action.timestamp).toDateString() === today
        ).length || 0;
      }

      // Build and cache stats
      const newStats = {
        pendingReviews: reviewsData?.data?.length || 0,
        pendingLocations: locationsData?.data?.length || 0,
        flaggedContent: flaggedData?.data?.length || 0,
        todayActions
      };
      
      setStats(newStats);
      
      // PERFORMANCE: Cache the stats for 3 minutes
      memoryCache.set(CacheKeys.moderatorStats(), newStats, 3 * 60 * 1000);

      success('Data refreshed successfully', 'Success');
    } catch (error) {
      console.error('Failed to fetch pending data:', error);
      showError('Failed to load moderation data', 'Error');
    } finally {
      setLoading(false);
    }
  }, [loading, getIdToken, success, showError]);

  useEffect(() => {
    fetchPendingData();
  }, []);

  const sidebarItems = [
    { id: "overview", label: "Overview", icon: ChartBarIcon, iconSolid: ChartBarSolid },
    { id: "pending", label: "Pending Content", icon: ClockIcon, iconSolid: ClockSolid, count: stats.pendingReviews + stats.pendingLocations },
    { id: "flagged", label: "Flagged Content", icon: ExclamationTriangleIcon, iconSolid: ExclamationTriangleSolid, count: stats.flaggedContent },
    { id: "discovery", label: "Discovery", icon: CpuChipIcon, iconSolid: CpuChipSolid },
    { id: "history", label: "History", icon: DocumentTextIcon, iconSolid: DocumentTextSolid }
  ];

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg flex flex-col">
        <div className="p-6 border-b flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <ExclamationTriangleIcon className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Moderation Center</h2>
              <p className="text-sm text-gray-500">{user?.name || user?.email}</p>
            </div>
          </div>
          {canAdmin() && (
            <div className="mt-2">
              <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                Admin Access
              </span>
            </div>
          )}
        </div>
        
        <nav className="mt-6 flex-1 overflow-y-auto">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-6 py-3 text-left hover:bg-gray-50 transition-colors ${
                activeTab === item.id
                  ? "bg-orange-50 border-r-2 border-orange-500 text-orange-700"
                  : "text-gray-700"
              }`}
            >
              <div className="flex items-center">
                <item.icon className={`w-5 h-5 mr-3 ${activeTab === item.id ? 'text-orange-600' : 'text-gray-500'}`} />
                <span className="font-medium">{item.label}</span>
              </div>
              {item.count && item.count > 0 && (
                <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </nav>
        
        <div className="p-6 flex-shrink-0">
          <button
            onClick={() => window.location.href = '/'}
            className="w-full flex items-center px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <EyeIcon className="w-4 h-4 mr-2" />
            Back to Map
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-8">
          {/* Tab Content */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">Moderation Overview</h1>
                <div className="text-sm text-gray-500">
                  Last updated: {new Date().toLocaleTimeString()}
                </div>
              </div>

              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                  <h3 className="text-lg font-semibold mb-2">Today&apos;s Actions</h3>
                  <p className="text-3xl font-bold text-green-600">{stats.todayActions}</p>
                  <p className="text-sm text-gray-500">
                    {stats.todayActions === 0 ? 'No actions yet' : 'Approved/Rejected'}
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => setActiveTab('pending')}
                    className="p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <ClockIcon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">Review Pending Content</div>
                        <div className="text-sm text-gray-500">{stats.pendingReviews + stats.pendingLocations} items waiting</div>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('flagged')}
                    className="p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                        <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <div className="font-medium">Handle Flagged Content</div>
                        <div className="text-sm text-gray-500">{stats.flaggedContent} reports pending</div>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('discovery')}
                    className="p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                        <CpuChipIcon className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <div className="font-medium">Run Discovery</div>
                        <div className="text-sm text-gray-500">Find new locations</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Pending Content Tab */}
          {activeTab === "pending" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">Pending Content</h1>
                <button
                  onClick={() => fetchPendingData(true)}
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
                  <p className="text-gray-600 mt-4">Loading pending content...</p>
                </div>
              ) : (pendingReviews.length === 0 && pendingLocations.length === 0) ? (
                <div className="bg-gradient-to-br from-green-50 to-blue-50 p-12 rounded-xl text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckIcon className="w-8 h-8 text-green-600" />
                  </div>
                  <h4 className="font-bold text-xl mb-3 text-gray-800">All caught up!</h4>
                  <p className="text-gray-600 max-w-md mx-auto">
                    No pending reviews or locations to moderate at the moment. Great work keeping the platform clean!
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Pending Reviews */}
                  {pendingReviews.length > 0 && (
                    <div className="bg-white rounded-lg shadow p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <DocumentTextIcon className="w-6 h-6 text-gray-600" />
                        <h2 className="text-xl font-semibold">Pending Reviews ({pendingReviews.length})</h2>
                      </div>
                      <div className="space-y-4">
                        {pendingReviews.map((review) => (
                          <div key={review.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="flex items-center">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <StarIcon key={star} className={`w-4 h-4 ${
                                        star <= review.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'
                                      }`} />
                                    ))}
                                  </div>
                                  <span className="text-sm font-medium text-gray-700">
                                    by {review.author}
                                  </span>
                                </div>
                                {review.text && (
                                  <p className="text-gray-700 mb-2">{review.text}</p>
                                )}
                                <p className="text-xs text-gray-500">
                                  Location: {review.location_id}
                                </p>
                              </div>
                              <div className="flex gap-2 ml-4">
                                <button
                                  onClick={async () => {
                                    try {
                                      const idToken = await getIdToken();
                                      const response = await fetch('/api/reviews', {
                                        method: 'PATCH',
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
                                        fetchPendingData(true);
                                      } else {
                                        const errorData = await response.json();
                                        throw new Error(errorData.error || 'Failed to approve review');
                                      }
                                    } catch (error: any) {
                                      console.error('Review approval error:', error);
                                      showError(error.message, 'Approval Failed');
                                    }
                                  }}
                                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                                >
                                  <CheckIcon className="w-4 h-4 inline mr-1" />
                                  Approve
                                </button>
                                <button
                                  onClick={async () => {
                                    try {
                                      const idToken = await getIdToken();
                                      const response = await fetch('/api/reviews', {
                                        method: 'PATCH',
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
                                        fetchPendingData(true);
                                      } else {
                                        const errorData = await response.json();
                                        throw new Error(errorData.error || 'Failed to reject review');
                                      }
                                    } catch (error: any) {
                                      console.error('Review rejection error:', error);
                                      showError(error.message, 'Rejection Failed');
                                    }
                                  }}
                                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                                >
                                  <XMarkIcon className="w-4 h-4 inline mr-1" />
                                  Reject
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pending Locations */}
                  {pendingLocations.length > 0 && (
                    <div className="bg-white rounded-lg shadow p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <EyeIcon className="w-6 h-6 text-gray-600" />
                        <h2 className="text-xl font-semibold">Pending Locations ({pendingLocations.length})</h2>
                      </div>
                      <div className="space-y-4">
                        {pendingLocations.map((location) => (
                          <div key={location.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-bold text-lg mb-2">{location.name}</h3>
                                <p className="text-gray-600 mb-2">{location.address}</p>
                                {location.description && (
                                  <p className="text-gray-700 mb-2">{location.description}</p>
                                )}
                                <div className="flex gap-2 text-xs">
                                  <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                    {location.discoverySource}
                                  </span>
                                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                                    {location.serviceType}
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-2 ml-4">
                                <button
                                  onClick={async () => {
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
                                          locationId: location.id
                                        })
                                      });
                                      if (response.ok) {
                                        success('Location approved!', 'Approved');
                                        fetchPendingData(true);
                                      } else {
                                        const errorData = await response.json();
                                        throw new Error(errorData.error || 'Failed to approve location');
                                      }
                                    } catch (error: any) {
                                      console.error('Location approval error:', error);
                                      showError(error.message, 'Approval Failed');
                                    }
                                  }}
                                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                                >
                                  <CheckIcon className="w-4 h-4 inline mr-1" />
                                  Approve
                                </button>
                                <button
                                  onClick={async () => {
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
                                          locationId: location.id
                                        })
                                      });
                                      if (response.ok) {
                                        success('Location rejected', 'Rejected');
                                        fetchPendingData(true);
                                      } else {
                                        const errorData = await response.json();
                                        throw new Error(errorData.error || 'Failed to reject location');
                                      }
                                    } catch (error: any) {
                                      console.error('Location rejection error:', error);
                                      showError(error.message, 'Rejection Failed');
                                    }
                                  }}
                                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                                >
                                  <XMarkIcon className="w-4 h-4 inline mr-1" />
                                  Reject
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Flagged Content Tab */}
          {activeTab === "flagged" && (
            <FlaggedContentPanel />
          )}

          {/* History Tab */}
          {activeTab === "history" && (
            <ModerationHistory />
          )}

          {/* Discovery Tab */}
          {activeTab === "discovery" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">Autonomous Discovery</h1>
                <div className="text-sm text-gray-500">
                  AI-powered location discovery system
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
                <EnhancedDiscoveryPanel 
                  onDiscoveryComplete={(result) => {
                    success(`Discovery completed! Found ${result.totalDiscovered} locations, saved ${result.savedToDatabase} new ones.`, 'Discovery Complete');
                    fetchPendingData(true);
                  }}
                />
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
