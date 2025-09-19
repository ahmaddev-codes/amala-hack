"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useState, useEffect } from "react";
import { AmalaLocation } from "@/types/location";

export default function ScoutPage() {
  return (
    <ProtectedRoute requiredRoles={["scout", "admin"]}>
      <ScoutDashboard />
    </ProtectedRoute>
  );
}

function ScoutDashboard() {
  const { user, canAdmin, getIdToken } = useAuth();
  const { success, error: showError } = useToast();
  const [activeTab, setActiveTab] = useState("discovery");
  const [mySubmissions, setMySubmissions] = useState<AmalaLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    discovered: 0,
    approved: 0,
    pending: 0,
    level: 1
  });

  // Fetch user's submissions
  useEffect(() => {
    const fetchMySubmissions = async () => {
      if (!user?.email) return;

      setLoading(true);
      try {
        const response = await fetch('/api/locations?includeAll=true');
        if (response.ok) {
          const data = await response.json();
          // Filter locations submitted by this user
          const userSubmissions = data.data.filter((loc: AmalaLocation) =>
            loc.submittedBy === user.email
          );
          setMySubmissions(userSubmissions);

          // Update stats
          const approved = userSubmissions.filter((loc: AmalaLocation) => loc.status === 'approved').length;
          const pending = userSubmissions.filter((loc: AmalaLocation) => loc.status === 'pending').length;
          setStats({
            discovered: userSubmissions.length,
            approved,
            pending,
            level: Math.floor(approved / 5) + 1 // Level up every 5 approved submissions
          });
        }
      } catch (error) {
        console.error('Failed to fetch submissions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMySubmissions();
  }, [user?.email]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">
                🔍 Scout Dashboard
              </h1>
              <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                Scout
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
            <h3 className="text-lg font-semibold mb-2">Locations Discovered</h3>
            <p className="text-3xl font-bold text-green-600">{stats.discovered}</p>
            <p className="text-sm text-gray-500">
              {stats.discovered === 0 ? 'Start discovering!' : 'Total submissions'}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Approved Submissions</h3>
            <p className="text-3xl font-bold text-blue-600">{stats.approved}</p>
            <p className="text-sm text-gray-500">
              Success rate: {stats.discovered > 0 ? Math.round((stats.approved / stats.discovered) * 100) : 0}%
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Pending Review</h3>
            <p className="text-3xl font-bold text-orange-600">{stats.pending}</p>
            <p className="text-sm text-gray-500">
              {stats.pending === 0 ? 'All caught up!' : 'Awaiting moderation'}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Scout Level</h3>
            <p className="text-3xl font-bold text-purple-600">{stats.level}</p>
            <p className="text-sm text-gray-500">
              {stats.level === 1 ? 'Beginner Scout' : 
               stats.level < 5 ? 'Active Scout' :
               stats.level < 10 ? 'Expert Scout' : 'Master Scout'}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                {
                  key: "discovery",
                  label: "Autonomous Discovery",
                  count: null,
                },
                { key: "submissions", label: "My Submissions", count: stats.discovered },
                { key: "tools", label: "Scouting Tools", count: null },
                { key: "leaderboard", label: "Scout Ranking", count: null },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? "border-green-500 text-green-600"
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
            {activeTab === "discovery" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    Autonomous Location Discovery
                  </h3>
                  <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                    🚀 Start Discovery
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border">
                    <h4 className="font-semibold text-lg mb-3">
                      🤖 AI-Powered Search
                    </h4>
                    <p className="text-gray-600 mb-4">
                      Use advanced AI to discover new Amala locations from
                      social media, reviews, and web content.
                    </p>
                    <button className="bg-white text-green-600 px-4 py-2 rounded-lg border border-green-200 hover:bg-green-50">
                      Configure AI Search
                    </button>
                  </div>

                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg border">
                    <h4 className="font-semibold text-lg mb-3">
                      🗺️ Geographic Expansion
                    </h4>
                    <p className="text-gray-600 mb-4">
                      Target specific regions or cities for comprehensive Amala
                      location mapping.
                    </p>
                    <button className="bg-white text-purple-600 px-4 py-2 rounded-lg border border-purple-200 hover:bg-purple-50">
                      Select Regions
                    </button>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">
                    Recent Discovery Results
                  </h4>
                  <p className="text-sm text-gray-600">
                    No recent discovery sessions. Start your first discovery to see results here.
                  </p>
                </div>
              </div>
            )}

            {activeTab === "submissions" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    My Location Submissions
                  </h3>
                  <button
                    onClick={() => window.location.href = '/'}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    + Submit New Location
                  </button>
                </div>
                
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                    <p className="text-gray-600 mt-2">Loading submissions...</p>
                  </div>
                ) : mySubmissions.length === 0 ? (
                  <div className="bg-gray-50 p-8 rounded-lg text-center">
                    <div className="text-4xl mb-4">🗺️</div>
                    <h4 className="font-semibold text-lg mb-2">No submissions yet</h4>
                    <p className="text-gray-600 mb-4">
                      Start discovering Amala locations to see your submissions here.
                    </p>
                    <button
                      onClick={() => window.location.href = '/'}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
                    >
                      Submit Your First Location
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {mySubmissions.map((location) => (
                      <div key={location.id} className="bg-white p-4 rounded-lg border">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg">{location.name}</h4>
                            <p className="text-gray-600">{location.address}</p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                location.status === 'approved' ? 'bg-green-100 text-green-700' :
                                location.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {location.status === 'approved' ? '✅ Approved' :
                                 location.status === 'rejected' ? '❌ Rejected' :
                                 '⏳ Pending Review'}
                              </span>
                              <span className="text-xs text-gray-500">
                                Submitted {new Date(location.submittedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "tools" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-4">Scouting Tools</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">📱 Mobile App</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Quick submission tool for on-the-go location discovery
                    </p>
                    <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm">
                      Download
                    </button>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">
                      🔍 Verification Checklist
                    </h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Guidelines for quality location submissions
                    </p>
                    <button className="bg-green-600 text-white px-3 py-1 rounded text-sm">
                      View Guide
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "leaderboard" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-4">
                  Scout Ranking & Leaderboard
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-600">
                    Scout ranking system and leaderboard will be implemented
                    here.
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Features: Points system, achievements, monthly challenges
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
              <div className="text-lg font-semibold text-green-600">
                🎯 Submit Location
              </div>
              <div className="text-sm text-gray-500">Add a new Amala spot</div>
            </button>
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
              <div className="text-lg font-semibold text-blue-600">
                🔍 Start AI Discovery
              </div>
              <div className="text-sm text-gray-500">Run autonomous search</div>
            </button>
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
              <div className="text-lg font-semibold text-purple-600">
                📊 View Analytics
              </div>
              <div className="text-sm text-gray-500">Track performance</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
