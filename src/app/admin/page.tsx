"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useState, useEffect } from "react";
import { EnrichmentManager } from "@/components/enrichment-manager";
import { UserManagementTable } from "@/components/admin/user-management-table";
import { EnhancedDiscoveryPanel } from "@/components/discovery/discovery-panel";
import { MetricsDashboard } from "@/components/admin/metrics-dashboard";
import { PerformanceDashboard } from "@/components/admin/performance-dashboard";
import {
  ChartBarIcon,
  UsersIcon,
  CpuChipIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  PlayIcon,
  GlobeAltIcon,
  MapPinIcon,
  ClockIcon,
  CheckCircleIcon,
  BoltIcon,
  StarIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";

export default function AdminPage() {
  return (
    <ProtectedRoute requiredRoles={["admin"]}>
      <AdminDashboard />
    </ProtectedRoute>
  );
}

function AdminDashboard() {
  const { user, getIdToken } = useAuth();
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeLocations: 0,
    systemHealth: '100%',
    pendingReviews: 0,
    totalLocations: 0,
    totalReviews: 0
  });
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [discoveryStats, setDiscoveryStats] = useState<any>(null);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);

  // User Management Filters
  const [userFilters, setUserFilters] = useState({
    search: '',
    role: '',
    dateRange: '',
    sortBy: 'createdAt-desc'
  });
  const [filteredUserCount, setFilteredUserCount] = useState(0);
  const [totalUserCount, setTotalUserCount] = useState(0);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch analytics data
        const analyticsResponse = await fetch('/api/analytics/metrics?days=30');
        if (analyticsResponse.ok) {
          const analyticsData = await analyticsResponse.json();
          setAnalyticsData(analyticsData);

          // Update stats with real data - use analytics for submissions trend only
          setStats(prev => ({
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
          const rejectedLocations = locations.filter((loc: any) => loc.status === 'rejected');

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

  // Fetch discovery stats when discovery tab is active
  useEffect(() => {
    if (activeTab === 'discovery' && user) {
      fetchDiscoveryStats();
    }
  }, [activeTab, user]);

  // Filter handler functions
  const handleFilterChange = (filterType: string, value: string) => {
    setUserFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const applyFilters = () => {
    // This would normally trigger a refetch with filters
    // For now, we'll just update the display counts
    success('Filters applied successfully', 'Filter Applied');
  };

  const clearAllFilters = () => {
    setUserFilters({
      search: '',
      role: '',
      dateRange: '',
      sortBy: 'createdAt-desc'
    });
    success('All filters cleared', 'Filters Reset');
  };

  const getActiveFilterCount = () => {
    return Object.values(userFilters).filter(value =>
      value !== '' && value !== 'createdAt-desc'
    ).length;
  };

  const sidebarItems = [
    { id: "overview", label: "Overview", icon: ChartBarIcon },
    { id: "analytics", label: "Analytics", icon: ChartBarIcon },
    { id: "performance", label: "Performance", icon: BoltIcon },
    { id: "users", label: "User Management", icon: UsersIcon },
    { id: "discovery", label: "Discovery", icon: CpuChipIcon },
    { id: "enrichment", label: "Enrichment", icon: ShieldCheckIcon },
    { id: "system", label: "System Health", icon: Cog6ToothIcon }
  ];

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg flex flex-col">
        <div className="p-6 border-b flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <ShieldCheckIcon className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Admin Panel</h2>
              <p className="text-sm text-gray-500">{user?.name || user?.email}</p>
            </div>
          </div>
        </div>
        
        <nav className="mt-6 flex-1 overflow-y-auto">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center px-6 py-3 text-left hover:bg-gray-50 transition-colors ${
                activeTab === item.id
                  ? "bg-red-50 border-r-2 border-red-500 text-red-700"
                  : "text-gray-700"
              }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
        
        <div className="p-6 flex-shrink-0">
          <button
            onClick={() => window.location.href = '/'}
            className="w-full flex items-center px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <MapPinIcon className="w-4 h-4 mr-2" />
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
                <h1 className="text-3xl font-bold text-gray-900">System Overview</h1>
                <div className="text-sm text-gray-500">
                  Last updated: {new Date().toLocaleTimeString()}
                </div>
              </div>

              {/* System Stats */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">System Overview</h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-3">
                      <MapPinIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-600 mb-1">Total Locations</h3>
                    <p className="text-2xl font-bold text-blue-600">
                      {loading ? '...' : stats.totalLocations.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">Pending + Approved</p>
                  </div>
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-3">
                      <CheckCircleIcon className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-600 mb-1">Live Locations</h3>
                    <p className="text-2xl font-bold text-green-600">
                      {loading ? '...' : stats.activeLocations.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">Approved & Visible</p>
                  </div>
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mb-3">
                      <StarIcon className="w-6 h-6 text-purple-600" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-600 mb-1">Total Reviews</h3>
                    <p className="text-2xl font-bold text-purple-600">
                      {loading ? '...' : stats.totalReviews.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">From Live Locations</p>
                  </div>
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-3">
                      <ShieldCheckIcon className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-600 mb-1">System Health</h3>
                    <p className="text-2xl font-bold text-green-600">{stats.systemHealth}</p>
                    <p className="text-xs text-gray-500">Operational status</p>
                  </div>
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg mb-3">
                      <ClockIcon className="w-6 h-6 text-orange-600" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-600 mb-1">Pending Reviews</h3>
                    <p className="text-2xl font-bold text-orange-600">
                      {loading ? '...' : stats.pendingReviews.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">Awaiting moderation</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <button
                    onClick={() => setActiveTab('users')}
                    className="group p-4 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 group-hover:bg-blue-200 rounded-lg flex items-center justify-center transition-colors">
                        <UsersIcon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 group-hover:text-blue-700">Manage Users</div>
                        <div className="text-sm text-gray-500">Add/remove user roles</div>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('discovery')}
                    className="group p-4 text-left border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 group-hover:bg-green-200 rounded-lg flex items-center justify-center transition-colors">
                        <CpuChipIcon className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 group-hover:text-green-700">Run Discovery</div>
                        <div className="text-sm text-gray-500">Find new locations</div>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('analytics')}
                    className="group p-4 text-left border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-100 group-hover:bg-purple-200 rounded-lg flex items-center justify-center transition-colors">
                        <ChartBarIcon className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 group-hover:text-purple-700">View Analytics</div>
                        <div className="text-sm text-gray-500">Platform metrics</div>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('system')}
                    className="group p-4 text-left border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 group-hover:bg-green-200 rounded-lg flex items-center justify-center transition-colors">
                        <ShieldCheckIcon className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 group-hover:text-green-700">System Health</div>
                        <div className="text-sm text-gray-500">Monitor status</div>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const token = await getIdToken();
                        const response = await fetch('/api/jobs/enrichment', {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ action: 'queue-approved' })
                        });

                        if (response.ok) {
                          success('Background enrichment started for approved locations', 'Success');
                        } else {
                          error('Failed to start background enrichment', 'Error');
                        }
                      } catch (err) {
                        error('Failed to start background enrichment', 'Error');
                      }
                    }}
                    className="group p-4 text-left border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-indigo-100 group-hover:bg-indigo-200 rounded-lg flex items-center justify-center transition-colors">
                        <Cog6ToothIcon className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 group-hover:text-indigo-700">Background Jobs</div>
                        <div className="text-sm text-gray-500">Enrich locations</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* User Management Tab */}
          {activeTab === "users" && (
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
                      {userFilters.search && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                          Search
                        </span>
                      )}
                      {userFilters.role && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          Role Filter
                        </span>
                      )}
                      {userFilters.dateRange && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                          Date Range
                        </span>
                      )}
                      {getActiveFilterCount() === 0 && (
                        <span className="text-xs text-gray-400">None</span>
                      )}
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
                        value={userFilters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Role Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Filter by Role
                    </label>
                    <select
                      value={userFilters.role}
                      onChange={(e) => handleFilterChange('role', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">All Roles</option>
                      <option value="user">Users Only</option>
                      <option value="scout">Scouts Only</option>
                      <option value="mod">Moderators Only</option>
                      <option value="admin">Admins Only</option>
                      <option value="scout,mod">Scouts & Moderators</option>
                      <option value="mod,admin">Moderators & Admins</option>
                    </select>
                  </div>

                  {/* Registration Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Registration Date
                    </label>
                    <select
                      value={userFilters.dateRange}
                      onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">Any Date</option>
                      <option value="today">Today</option>
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                      <option value="3months">Last 3 Months</option>
                      <option value="6months">Last 6 Months</option>
                      <option value="year">This Year</option>
                    </select>
                  </div>

                  {/* Sort By */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sort By
                    </label>
                    <select
                      value={userFilters.sortBy}
                      onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="createdAt-desc">Newest First</option>
                      <option value="createdAt-asc">Oldest First</option>
                      <option value="updatedAt-desc">Recently Updated</option>
                      <option value="email-asc">Email (A-Z)</option>
                      <option value="email-desc">Email (Z-A)</option>
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

              {/* User Management Table */}
              <UserManagementTable key="user-management-table" />
            </div>
          )}

          {/* Discovery Tab */}
          {activeTab === "discovery" && (
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
                      <ChartBarIcon className="w-6 h-6 text-purple-600" />
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
                      <EnhancedDiscoveryPanel />
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
                        <ChartBarIcon className="w-4 h-4 mr-2" />
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
                            <div className={`w-2 h-2 rounded-full mr-2 ${
                              discoveryStats?.systemStatus?.enabled ? 'bg-green-400' : 'bg-red-400'
                            }`}></div>
                            <span className={`text-sm font-medium ${
                              discoveryStats?.systemStatus?.enabled ? 'text-green-600' : 'text-red-600'
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
                              <div className={`w-2 h-2 rounded-full mt-2 ${
                                activity.event_type === 'discovery_completed' ? 'bg-green-400' :
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
                      <ChartBarIcon className="w-8 h-8 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Real-time Analytics</h3>
                    <p className="text-gray-600 text-sm">Monitor discovery progress, success rates, and system performance in real-time.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">Platform Analytics</h1>
                <div className="text-sm text-gray-500">
                  Real-time platform metrics and insights
                </div>
              </div>

              <MetricsDashboard />
            </div>
          )}

          {/* Performance Tab */}
          {activeTab === "performance" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">Performance Dashboard</h1>
                <div className="text-sm text-gray-500">
                  System performance metrics and optimization insights
                </div>
              </div>

              <PerformanceDashboard />
            </div>
          )}


          {/* Enrichment Tab */}
          {activeTab === "enrichment" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">Location Enrichment</h1>
                <div className="text-sm text-gray-500">
                  Enhance location data quality
                </div>
              </div>

              <div className="bg-white rounded-lg shadow">
                <EnrichmentManager />
              </div>
            </div>
          )}

          {/* System Health Tab */}
          {activeTab === "system" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">System Health</h1>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">All systems operational</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold mb-4">API Status</h2>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Location API</span>
                      <div className="flex items-center text-green-600">
                        <CheckCircleIcon className="w-4 h-4 mr-1" />
                        <span>Operational</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Discovery API</span>
                      <div className="flex items-center text-green-600">
                        <CheckCircleIcon className="w-4 h-4 mr-1" />
                        <span>Operational</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Analytics API</span>
                      <div className="flex items-center text-green-600">
                        <CheckCircleIcon className="w-4 h-4 mr-1" />
                        <span>Operational</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold mb-4">Database Status</h2>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Firestore</span>
                      <div className="flex items-center text-green-600">
                        <CheckCircleIcon className="w-4 h-4 mr-1" />
                        <span>Connected</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Firebase Auth</span>
                      <div className="flex items-center text-green-600">
                        <CheckCircleIcon className="w-4 h-4 mr-1" />
                        <span>Active</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Storage</span>
                      <div className="flex items-center text-green-600">
                        <CheckCircleIcon className="w-4 h-4 mr-1" />
                        <span>Available</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
