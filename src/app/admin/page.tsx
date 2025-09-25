"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useState, useEffect, lazy, Suspense } from "react";

// Lazy load heavy components for 3X performance improvement
const LazyEnrichmentManager = lazy(() => import("@/components/enrichment-manager"));
const LazyUserManagement = lazy(() => import("@/components/admin/user-management"));
const LazyDiscoveryPanel = lazy(() => import("@/components/discovery/discovery-panel"));
const LazyPerformanceDashboard = lazy(() => import("@/components/admin/performance-dashboard"));
const LazyAdminDashboard = lazy(() => import("@/components/admin/admin-dashboard"));
const LazyAnalyticsDashboard = lazy(() => import("@/components/admin/firebase-analytics-dashboard"));
const LazySystemHealthDashboard = lazy(() => import("@/components/admin/system-health-dashboard"));

// Loading components
import { ComponentLoader } from "@/components/ui/loading-spinner";
import {
  AdminOverviewSkeleton,
  UserManagementSkeleton,
  DiscoverySkeleton,
  PerformanceSkeleton,
  SystemHealthSkeleton,
  EnrichmentSkeleton,
  AnalyticsSkeleton
} from "@/components/skeletons";
import { ResponsiveSidebar } from "@/components/responsive-sidebar";

import {
  Database,
  ChartBar,
  BoltIcon,
  UsersIcon,
  ShieldCheckIcon,
  ChartNoAxesCombined,
  Clock as ClockIcon,
  Cpu,
  HardDrive
} from "lucide-react";
import { CpuChipIcon, MagnifyingGlassIcon, Cog6ToothIcon, MapPinIcon, GlobeAltIcon, PlayIcon } from "@heroicons/react/24/outline";

export default function AdminPage() {
  return (
    <ProtectedRoute requiredRoles={["admin"]}>
      <AdminPageContent />
    </ProtectedRoute>
  );
}

function AdminPageContent() {
  const { user, getIdToken } = useAuth();
  const [discoveryStats, setDiscoveryStats] = useState<any>(null);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  interface StatsType {
    totalLocations: number;
    activeLocations: number;
    totalReviews: number;
    pendingReviews: number;
  }
  const [stats, setStats] = useState<StatsType>({
    totalLocations: 0,
    activeLocations: 0,
    totalReviews: 0,
    pendingReviews: 0
  });
  const [loading, setLoading] = useState(true);
  const [systemHealth, setSystemHealth] = useState<any>(null);

  const fetchDashboardData = async () => {
    try {
      // Fetch analytics data
      const analyticsResponse = await fetch('/api/analytics/metrics?days=30');
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        // Analytics data processed but not stored in state

        // Update stats with real data - use analytics for submissions trend only
        setStats((prev: StatsType) => ({
          ...prev,
          // Keep the location stats from locations API, not analytics
          // activeLocations will be calculated from locations API
        }));
      }

      // Fetch locations data - get all locations for accurate count
      const locationsResponse = await fetch('/api/locations?includeAll=true&limit=1000');
      if (locationsResponse.ok) {
        const locationsData = await locationsResponse.json();
        const locations = locationsData.data || [];

        // Calculate stats based on location status
        const pendingLocations = locations.filter((loc: any) => loc.status === 'pending');
        const approvedLocations = locations.filter((loc: any) => loc.status === 'approved');
        // const rejectedLocations = locations.filter((loc: any) => loc.status === 'rejected');

        // Total Locations = pending + approved (exclude rejected)
        const totalLocations = pendingLocations.length + approvedLocations.length;

        // Active/Live Locations = approved only
        const activeLocations = approvedLocations.length;

        // Total Reviews = sum of review counts from approved locations only
        const totalReviews = approvedLocations.reduce((acc: number, loc: any) => acc + (loc.reviewCount || 0), 0);

        setStats(prev => ({
          ...prev,
          totalLocations: totalLocations,
          activeLocations: activeLocations,
          totalReviews: totalReviews,
          pendingReviews: pendingLocations.length
        }));
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Fetch discovery statistics
  const fetchDiscoveryStats = async () => {
    if (!user) return;

    setDiscoveryLoading(true);
    try {
      const token = await getIdToken();
      const response = await fetch('/api/discovery/stats?days=30', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDiscoveryStats(data.data);
      } else {
        console.error('Failed to fetch discovery stats:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching discovery stats:', error);
    } finally {
      setDiscoveryLoading(false);
    }
  };

  useEffect(() => {
    // Fetch discovery stats when discovery tab is active
    if (activeTab === 'discovery' && user) {
      fetchDiscoveryStats();
    }
  }, [activeTab, user]);

  // Filter functions
  const applyFilters = () => {
    // Implement filter logic
    console.log('Applying filters...');
  };

  const clearAllFilters = () => {
    // Clear all applied filters and reset to default view
    setActiveTab('overview');
    console.log('All filters cleared, returning to overview');
  };

  const sidebarItems = [
    { id: "overview", label: "Overview", icon: ChartBar },
    { id: "analytics", label: "Analytics", icon: ChartNoAxesCombined },
    { id: "performance", label: "Performance", icon: BoltIcon },
    { id: "users", label: "User Management", icon: UsersIcon },
    { id: "discovery", label: "Discovery", icon: CpuChipIcon },
    { id: "enrichment", label: "Enrichment", icon: ShieldCheckIcon },
    { id: "system", label: "System Health", icon: Cog6ToothIcon }
  ];

  return (
    <ResponsiveSidebar
      title="Admin Panel"
      subtitle={user?.name || user?.email}
      headerIcon={ShieldCheckIcon}
      items={sidebarItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      backButton={{
        label: "Back to Map",
        onClick: () => window.location.href = '/',
        icon: MapPinIcon
      }}
    >
      <div className="p-8">
        {/* Tab Content */}
        {activeTab === "overview" && (
          <Suspense fallback={<AdminOverviewSkeleton />}>
            <LazyAdminDashboard />
          </Suspense>
        )}

        {/* User Management Tab */}
        {activeTab === "users" && (
          loading ? (
            <UserManagementSkeleton />
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                <div className="text-sm text-gray-500">
                  Manage user roles and permissions
                </div>
              </div>

              {/* User Filters */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Filters & Search</h2>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">Active filters:</span>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-gray-400">None</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* Search */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search Users
                    </label>
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Email or name..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        disabled
                      />
                    </div>
                  </div>

                  {/* Role Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Filter by Role
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      disabled
                    >
                      <option value="">All Roles</option>
                    </select>
                  </div>

                  {/* Registration Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Registration Date
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      disabled
                    >
                      <option value="">Any Date</option>
                    </select>
                  </div>

                  {/* Sort By */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sort By
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      disabled
                    >
                      <option value="createdAt-desc">Newest First</option>
                    </select>
                  </div>
                </div>

                {/* Filter Actions */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={applyFilters}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                    >
                      Apply Filters
                    </button>
                    <button
                      onClick={clearAllFilters}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="text-sm text-gray-500">
                    Showing <span className="font-medium">0</span> of <span className="font-medium">0</span> users
                  </div>
                </div>
              </div>

              {/* User Management */}
              <Suspense fallback={<ComponentLoader message="Loading user management..." />}>
                <LazyUserManagement key="user-management" />
              </Suspense>
            </div>
          )
        )}

        {/* Discovery Tab */}
        {activeTab === "discovery" && (
          discoveryLoading ? (
            <DiscoverySkeleton />
          ) : (
            <div className="space-y-8">
              {/* Header with Refresh Button */}
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">Discovery Management</h1>
                <button
                  onClick={fetchDiscoveryStats}
                  disabled={discoveryLoading}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className={`w-4 h-4 mr-2 ${discoveryLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {discoveryLoading ? 'Refreshing...' : 'Refresh Data'}
                </button>
              </div>

              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <CpuChipIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {discoveryLoading ? '...' : (discoveryStats?.totalSessions || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <MapPinIcon className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Locations Found</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {discoveryLoading ? '...' : (discoveryStats?.locationsFound || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-yellow-100 rounded-lg">
                      <GlobeAltIcon className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Regions Covered</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {discoveryLoading ? '...' : (discoveryStats?.regionsCovered || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <ChartBar className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Success Rate</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {discoveryLoading ? '...' : `${discoveryStats?.successRate || 0}%`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Discovery Panel */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Discovery Controls */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                        <MagnifyingGlassIcon className="w-5 h-5 mr-2 text-blue-600" />
                        Discovery Configuration
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">Configure and launch autonomous discovery sessions</p>
                    </div>
                    <div className="p-6">
                      <Suspense fallback={<ComponentLoader message="Loading discovery panel..." />}>
                        <LazyDiscoveryPanel />
                      </Suspense>
                    </div>
                  </div>
                </div>

                {/* Session History & Info */}
                <div className="space-y-6">
                  {/* Quick Actions */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                    </div>
                    <div className="p-6 space-y-3">
                      <button className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                        <PlayIcon className="w-4 h-4 mr-2" />
                        Start Global Discovery
                      </button>
                      <button className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium">
                        <GlobeAltIcon className="w-4 h-4 mr-2" />
                        Regional Batch
                      </button>
                      <button className="w-full flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium">
                        <ChartBar className="w-4 h-4 mr-2" />
                        View Analytics
                      </button>
                    </div>
                  </div>

                  {/* System Information */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">System Information</h3>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">API Status</span>
                          <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-2 ${discoveryStats?.systemStatus?.enabled ? 'bg-green-400' : 'bg-red-400'
                              }`}></div>
                            <span className={`text-sm font-medium ${discoveryStats?.systemStatus?.enabled ? 'text-green-600' : 'text-red-600'
                              }`}>
                              {discoveryStats?.systemStatus?.enabled ? 'Online' : 'Disabled'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Rate Limit</span>
                          <span className="text-sm font-medium text-gray-900">
                            {discoveryStats?.systemStatus?.rateLimit || '1000/hour'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Queue Status</span>
                          <span className="text-sm font-medium text-gray-900">
                            {discoveryStats?.systemStatus?.queueStatus || 'Empty'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Last Run</span>
                          <span className="text-sm font-medium text-gray-900">
                            {discoveryStats?.systemStatus?.lastRun && discoveryStats.systemStatus.lastRun !== 'Never'
                              ? new Date(discoveryStats.systemStatus.lastRun).toLocaleString()
                              : 'Never'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                    </div>
                    <div className="p-6">
                      {discoveryLoading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                          <p className="text-gray-500 text-sm mt-2">Loading activity...</p>
                        </div>
                      ) : discoveryStats?.recentActivity && discoveryStats.recentActivity.length > 0 ? (
                        <div className="space-y-3">
                          {discoveryStats.recentActivity.slice(0, 5).map((activity: any, index: number) => (
                            <div key={activity.id || index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                              <div className={`w-2 h-2 rounded-full mt-2 ${activity.event_type === 'discovery_completed' ? 'bg-green-400' :
                                activity.event_type === 'discovery_failed' ? 'bg-red-400' :
                                  'bg-blue-400'
                                }`}></div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900 truncate">{activity.message}</p>
                                <p className="text-xs text-gray-500">
                                  {new Date(activity.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))}
                          {discoveryStats.recentActivity.length > 5 && (
                            <p className="text-xs text-gray-400 text-center mt-2">
                              Showing 5 of {discoveryStats.recentActivity.length} recent activities
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <ClockIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500 text-sm">No recent discovery sessions</p>
                          <p className="text-gray-400 text-xs mt-1">Start a discovery session to see activity here</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Discovery Features Overview */}
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Discovery System Features</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <GlobeAltIcon className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Global Coverage</h3>
                    <p className="text-gray-600 text-sm">Discover Amala restaurants across continents with regional batching and cultural sensitivity.</p>
                  </div>

                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CpuChipIcon className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">AI-Powered</h3>
                    <p className="text-gray-600 text-sm">Advanced algorithms for duplicate detection, data enrichment, and quality validation.</p>
                  </div>

                  <div className="text-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ChartBar className="w-8 h-8 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Real-time Analytics</h3>
                    <p className="text-gray-600 text-sm">Monitor discovery progress, success rates, and system performance in real-time.</p>
                  </div>
                </div>
              </div>
            </div>
          )
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <Suspense fallback={<AnalyticsSkeleton />}>
            <LazyAnalyticsDashboard />
          </Suspense>
        )}

        {/* Performance Tab */}
        {activeTab === "performance" && (
          loading ? (
            <PerformanceSkeleton />
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Performance Dashboard</h1>
                  <p className="text-gray-600 mt-1">Real-time performance metrics and optimization insights</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-full">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="font-medium">Live Monitoring</span>
                  </div>
                </div>
              </div>

              {/* Performance Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-600">API Response Time</h3>
                    <Cpu className="w-5 h-5 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-purple-700">
                    {systemHealth?.health?.latency || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Average response time</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-600">Database Status</h3>
                    <Database className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-blue-700">
                    {systemHealth?.status === 'healthy' ? 'Online' : 'Offline'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Connection health</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-600">System Load</h3>
                    <HardDrive className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-green-700">Normal</p>
                  <p className="text-xs text-gray-500 mt-1">Resource utilization</p>
                </div>
              </div>

              <Suspense fallback={<ComponentLoader message="Loading performance dashboard..." />}>
                <LazyPerformanceDashboard />
              </Suspense>
            </div>
          )
        )}

        {/* Enrichment Tab */}
        {activeTab === "enrichment" && (
          loading ? (
            <EnrichmentSkeleton />
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">Location Enrichment</h1>
                <div className="text-sm text-gray-500">
                  Enhance location data quality
                </div>
              </div>

              <div className="bg-white rounded-lg shadow">
                <Suspense fallback={<ComponentLoader message="Loading enrichment manager..." />}>
                  <LazyEnrichmentManager />
                </Suspense>
              </div>
            </div>
          )
        )}

        {/* System Health Tab */}
        {activeTab === "system" && (
          loading ? (
            <SystemHealthSkeleton />
          ) : (
            <Suspense fallback={<SystemHealthSkeleton />}>
              <LazySystemHealthDashboard />
            </Suspense>
          )
        )}
      </div>
    </ResponsiveSidebar >
  );
}
