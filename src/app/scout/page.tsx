"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useState, useEffect } from "react";
import { AmalaLocation } from "@/types/location";
import { EnhancedDiscoveryPanel } from "@/components/discovery/discovery-panel";
import { ScoutPerformanceWidget } from "@/components/dashboard/analytics-widgets";
import { EnhancedScoutTools } from "@/components/scout/scout-tools";
import { BrandLogo } from "@/components/ui/brand-logo";
import { 
  ChartBarIcon,
  MapPinIcon,
  CpuChipIcon,
  ChartPieIcon,
  WrenchScrewdriverIcon,
  MagnifyingGlassIcon,
  MapIcon,
  PlusIcon,
  ArrowPathIcon
} from "@heroicons/react/24/outline";
import { 
  ChartBarIcon as ChartBarSolid,
  MapPinIcon as MapPinSolid,
  CpuChipIcon as CpuChipSolid,
  ChartPieIcon as ChartPieSolid,
  WrenchScrewdriverIcon as WrenchScrewdriverSolid
} from "@heroicons/react/24/solid";

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
  const [activeTab, setActiveTab] = useState("overview");
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

  const sidebarItems = [
    { id: "overview", label: "Overview", icon: ChartBarIcon, iconSolid: ChartBarSolid },
    { id: "submissions", label: "My Submissions", icon: MapPinIcon, iconSolid: MapPinSolid, count: stats.discovered },
    { id: "discovery", label: "Discovery Tools", icon: CpuChipIcon, iconSolid: CpuChipSolid },
    { id: "analytics", label: "Performance", icon: ChartPieIcon, iconSolid: ChartPieSolid },
    { id: "tools", label: "Scout Tools", icon: WrenchScrewdriverIcon, iconSolid: WrenchScrewdriverSolid }
  ];

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg flex flex-col">
        <div className="p-6 border-b flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <MagnifyingGlassIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Scout Dashboard</h2>
              <p className="text-sm text-gray-500">{user?.name || user?.email}</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
              Level {stats.level} Scout
            </span>
            {canAdmin() && (
              <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                Admin
              </span>
            )}
          </div>
        </div>
        
        <nav className="mt-6 flex-1 overflow-y-auto">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-6 py-3 text-left hover:bg-gray-50 transition-colors ${
                activeTab === item.id
                  ? "bg-green-50 border-r-2 border-green-500 text-green-700"
                  : "text-gray-700"
              }`}
            >
              <div className="flex items-center">
                <item.icon className={`w-5 h-5 mr-3 ${activeTab === item.id ? 'text-green-600' : 'text-gray-500'}`} />
                <span className="font-medium">{item.label}</span>
              </div>
              {item.count && item.count > 0 && (
                <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
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
            <MapIcon className="w-4 h-4 mr-2" />
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
                <h1 className="text-3xl font-bold text-gray-900">Scout Overview</h1>
                <div className="text-sm text-gray-500">
                  Level {stats.level} • {stats.approved} approved locations
                </div>
              </div>

              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => window.location.href = '/'}
                    className="p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <MapPinIcon className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium">Submit Location</div>
                        <div className="text-sm text-gray-500">Add a new Amala spot</div>
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
                        <div className="font-medium">AI Discovery</div>
                        <div className="text-sm text-gray-500">Run autonomous search</div>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('submissions')}
                    className="p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <ChartBarIcon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">View Submissions</div>
                        <div className="text-sm text-gray-500">{stats.discovered} total locations</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Level Progress */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Scout Progress</h2>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Level {stats.level}</span>
                  <span className="text-sm text-gray-500">
                    {stats.approved} / {stats.level * 5} approved locations
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.min(100, (stats.approved % 5) * 20)}%` 
                    }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {5 - (stats.approved % 5)} more approved locations to reach Level {stats.level + 1}
                </p>
              </div>
            </div>
          )}

          {/* Submissions Tab */}
          {activeTab === "submissions" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">My Submissions</h1>
                <button
                  onClick={() => window.location.href = '/'}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  + Submit New Location
                </button>
              </div>
              
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                  <p className="text-gray-600 mt-4">Loading submissions...</p>
                </div>
              ) : mySubmissions.length === 0 ? (
                <div className="bg-gradient-to-br from-green-50 to-blue-50 p-12 rounded-xl text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapIcon className="w-8 h-8 text-green-600" />
                  </div>
                  <h4 className="font-bold text-xl mb-3 text-gray-800">No submissions yet</h4>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Start discovering Amala locations to see your submissions here. Every approved location helps build the global Amala community!
                  </p>
                  <button
                    onClick={() => window.location.href = '/'}
                    className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Submit Your First Location
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {mySubmissions.map((location) => (
                    <div key={location.id} className="bg-white p-6 rounded-lg shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-bold text-lg mb-2">{location.name}</h4>
                          <p className="text-gray-600 mb-3">{location.address}</p>
                          {location.description && (
                            <p className="text-gray-700 mb-3">{location.description}</p>
                          )}
                          <div className="flex items-center gap-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              location.status === 'approved' ? 'bg-green-100 text-green-700' :
                              location.status === 'rejected' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {location.status === 'approved' ? '✅ Approved' :
                               location.status === 'rejected' ? '❌ Rejected' :
                               '⏳ Pending Review'}
                            </span>
                            <span className="text-sm text-gray-500">
                              Submitted {new Date(location.submittedAt).toLocaleDateString()}
                            </span>
                            {location.discoverySource && (
                              <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">
                                {location.discoverySource}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Discovery Tab */}
          {activeTab === "discovery" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">Discovery Tools</h1>
                <div className="text-sm text-gray-500">
                  AI-powered location discovery
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border border-green-200">
                <EnhancedDiscoveryPanel 
                  onDiscoveryComplete={(result) => {
                    success(`Discovery completed! Found ${result.totalDiscovered} locations, saved ${result.savedToDatabase} new ones.`, 'Discovery Complete');
                  }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <span className="text-blue-600">🤖</span>
                    AI-Powered Search
                  </h4>
                  <p className="text-gray-600 mb-4">
                    Use advanced AI to discover new Amala locations from social media, reviews, and web content.
                  </p>
                  <div className="text-sm text-gray-500">
                    <p>• Social media scanning</p>
                    <p>• Review site analysis</p>
                    <p>• Web content discovery</p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <span className="text-purple-600">🗺️</span>
                    Geographic Expansion
                  </h4>
                  <p className="text-gray-600 mb-4">
                    Target specific regions or cities for comprehensive Amala location mapping.
                  </p>
                  <div className="text-sm text-gray-500">
                    <p>• Regional targeting</p>
                    <p>• City-specific searches</p>
                    <p>• Coverage analysis</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">Performance Analytics</h1>
                <div className="text-sm text-gray-500">
                  Track your scout progress
                </div>
              </div>

              <ScoutPerformanceWidget userEmail={user?.email} />
            </div>
          )}

          {/* Tools Tab */}
          {activeTab === "tools" && (
            <EnhancedScoutTools />
          )}

        </div>
      </div>
    </div>
  );
}
