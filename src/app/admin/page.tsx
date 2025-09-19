"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useState, useEffect } from "react";

export default function AdminPage() {
  return (
    <ProtectedRoute requiredRoles={["admin"]}>
      <AdminDashboard />
    </ProtectedRoute>
  );
}

function AdminDashboard() {
  const { user, getIdToken } = useAuth();
  const { success, error: showError } = useToast();
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeLocations: 0,
    systemHealth: '100%',
    pendingReviews: 0
  });
  const [loading, setLoading] = useState(true);

  // Fetch real dashboard statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/analytics/metrics?days=30');
        if (response.ok) {
          const data = await response.json();
          // Update stats with real data
          setStats({
            totalUsers: 0, // Will be updated when we have user analytics
            activeLocations: Object.values(data.data?.submissionsPerDay || {}).reduce((a: number, b: any) => a + b, 0),
            systemHealth: '100%',
            pendingReviews: 0 // Will be updated when we have pending count
          });
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
    try {
      // Get the current user's ID token
      const idToken = await getIdToken();
      if (!idToken) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Request failed: ${response.status} ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Authenticated request failed:', error);
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">
                👑 Admin Dashboard
              </h1>
              <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                Administrator
              </span>
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
        {/* System Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Total Users</h3>
            <p className="text-3xl font-bold text-blue-600">
              {loading ? '...' : stats.totalUsers.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">Registered users</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Active Locations</h3>
            <p className="text-3xl font-bold text-green-600">
              {loading ? '...' : stats.activeLocations.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">Approved & live</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">System Health</h3>
            <p className="text-3xl font-bold text-green-600">{stats.systemHealth}</p>
            <p className="text-sm text-gray-500">Operational status</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Pending Reviews</h3>
            <p className="text-3xl font-bold text-orange-600">
              {loading ? '...' : stats.pendingReviews.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">Awaiting moderation</p>
          </div>
        </div>

        {/* Admin Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold mb-3">👥 User Management</h2>
            <p className="text-gray-600 mb-4">
              Manage users, assign roles, and monitor user activity across the
              platform.
            </p>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 w-full">
              Manage Users
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold mb-3">
              📊 Analytics & Reports
            </h2>
            <p className="text-gray-600 mb-4">
              View comprehensive analytics, generate reports, and monitor
              platform metrics.
            </p>
            <button
              onClick={() => (window.location.href = "/admin/metrics")}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 w-full"
            >
              View Analytics
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold mb-3">🤖 Autonomous Discovery</h2>
            <p className="text-gray-600 mb-4">
              Trigger autonomous discovery to find new Amala locations from multiple sources worldwide.
            </p>
            <button 
              onClick={async () => {
                if (isDiscovering) return;
                setIsDiscovering(true);
                try {
                  const result = await makeAuthenticatedRequest('/api/discovery', {
                    method: 'POST',
                    body: JSON.stringify({})
                  });
                  success(result.message || 'Global discovery completed!', 'Discovery Complete');
                } catch (error: any) {
                  showError(`Discovery failed: ${error.message}`, 'Discovery Failed');
                } finally {
                  setIsDiscovering(false);
                }
              }}
              disabled={isDiscovering}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 w-full mb-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDiscovering ? 'Running...' : 'Run Global Discovery'}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={async () => {
                  if (isDiscovering) return;
                  setIsDiscovering(true);
                  try {
                    const result = await makeAuthenticatedRequest('/api/discovery', {
                      method: 'POST',
                      body: JSON.stringify({ region: 'Americas' })
                    });
                    success(result.message || 'Americas discovery completed!', 'Americas Discovery Complete');
                  } catch (error: any) {
                    showError(`Discovery failed: ${error.message}`, 'Americas Discovery Failed');
                  } finally {
                    setIsDiscovering(false);
                  }
                }}
                disabled={isDiscovering}
                className="bg-blue-500 text-white px-2 py-1 rounded text-sm hover:bg-blue-600 disabled:opacity-50"
              >
                Americas
              </button>
              <button 
                onClick={async () => {
                  if (isDiscovering) return;
                  setIsDiscovering(true);
                  try {
                    const result = await makeAuthenticatedRequest('/api/discovery', {
                      method: 'POST',
                      body: JSON.stringify({ region: 'Europe' })
                    });
                    success(result.message || 'Europe discovery completed!', 'Europe Discovery Complete');
                  } catch (error: any) {
                    showError(`Discovery failed: ${error.message}`, 'Europe Discovery Failed');
                  } finally {
                    setIsDiscovering(false);
                  }
                }}
                disabled={isDiscovering}
                className="bg-green-500 text-white px-2 py-1 rounded text-sm hover:bg-green-600 disabled:opacity-50"
              >
                Europe
              </button>
              <button 
                onClick={async () => {
                  if (isDiscovering) return;
                  setIsDiscovering(true);
                  try {
                    const result = await makeAuthenticatedRequest('/api/discovery', {
                      method: 'POST',
                      body: JSON.stringify({ region: 'Africa' })
                    });
                    success(result.message || 'Africa discovery completed!', 'Africa Discovery Complete');
                  } catch (error: any) {
                    showError(`Discovery failed: ${error.message}`, 'Africa Discovery Failed');
                  } finally {
                    setIsDiscovering(false);
                  }
                }}
                disabled={isDiscovering}
                className="bg-orange-500 text-white px-2 py-1 rounded text-sm hover:bg-orange-600 disabled:opacity-50"
              >
                Africa
              </button>
              <button 
                onClick={async () => {
                  if (isDiscovering) return;
                  setIsDiscovering(true);
                  try {
                    const result = await makeAuthenticatedRequest('/api/discovery', {
                      method: 'POST',
                      body: JSON.stringify({ region: 'Asia-Pacific' })
                    });
                    success(result.message || 'Asia-Pacific discovery completed!', 'Asia-Pacific Discovery Complete');
                  } catch (error: any) {
                    showError(`Discovery failed: ${error.message}`, 'Asia-Pacific Discovery Failed');
                  } finally {
                    setIsDiscovering(false);
                  }
                }}
                disabled={isDiscovering}
                className="bg-purple-500 text-white px-2 py-1 rounded text-sm hover:bg-purple-600 disabled:opacity-50"
              >
                Asia-Pacific
              </button>
            </div>
          </div>
        </div>

        {/* Role Management */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">
            🎭 Role-Based Access Control
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">Admin</div>
              <div className="text-sm text-red-700">Full Access</div>
              <div className="text-xs text-gray-500">System administration</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">Mod</div>
              <div className="text-sm text-orange-700">Moderation</div>
              <div className="text-xs text-gray-500">Content approval</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">Scout</div>
              <div className="text-sm text-green-700">Discovery</div>
              <div className="text-xs text-gray-500">Location scouting</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">User</div>
              <div className="text-sm text-blue-700">Standard</div>
              <div className="text-xs text-gray-500">Basic access</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            ⚡ Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => window.location.href = '/admin/metrics'}
              className="p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">📊</span>
                <div>
                  <div className="font-medium">View Detailed Analytics</div>
                  <div className="text-sm text-gray-500">Charts and metrics dashboard</div>
                </div>
              </div>
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🗺️</span>
                <div>
                  <div className="font-medium">View Live Map</div>
                  <div className="text-sm text-gray-500">See all approved locations</div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
