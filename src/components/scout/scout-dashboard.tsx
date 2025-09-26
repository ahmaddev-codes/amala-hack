"use client";

import { useState, useEffect, lazy, Suspense } from 'react';
import { useAuth } from '@/contexts/FirebaseAuthContext';
import { useToast } from '@/contexts/ToastContext';

// Lazy load discovery panel
const LazyDiscoveryPanel = lazy(() => import("@/components/discovery/discovery-panel"));
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  MapPinIcon,
  StarIcon,
  TrophyIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  PlusIcon,
  ChartBarIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  FireIcon,
  GlobeAltIcon,
  CameraIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  AdjustmentsHorizontalIcon,
  CpuChipIcon,
  MagnifyingGlassIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import {
  StarIcon as StarSolid,
  TrophyIcon as TrophySolid,
  FireIcon as FireSolid,
} from '@heroicons/react/24/solid';
import { ScoutDashboardSkeleton } from "@/components/skeletons";
import { ResponsiveSidebar } from "@/components/responsive-sidebar";
import { ComponentLoader } from "@/components/ui/loading-spinner";

interface ScoutStats {
  totalSubmissions: number;
  approvedSubmissions: number;
  pendingSubmissions: number;
  rejectedSubmissions: number;
  approvalRate: number;
  scoutLevel: string;
  scoutPoints: number;
  weeklySubmissions: number;
  monthlySubmissions: number;
  averageRating: number;
  totalPhotos: number;
  totalReviews: number;
}

interface SubmissionData {
  id: string;
  name: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Date;
  location: string;
  address: string;
  city: string;
  country: string;
  fullAddress: string;
  rating?: number;
  photos: number;
}

interface ChartData {
  date: string;
  submissions: number;
  approved: number;
  pending: number;
  rejected: number;
}

export function ScoutDashboard() {
  const { user, getIdToken } = useAuth();
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<ScoutStats>({
    totalSubmissions: 0,
    approvedSubmissions: 0,
    pendingSubmissions: 0,
    rejectedSubmissions: 0,
    approvalRate: 0,
    scoutLevel: 'Beginner Scout',
    scoutPoints: 0,
    weeklySubmissions: 0,
    monthlySubmissions: 0,
    averageRating: 0,
    totalPhotos: 0,
    totalReviews: 0,
  });
  const [submissions, setSubmissions] = useState<SubmissionData[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sortedSubmissions, setSortedSubmissions] = useState<SubmissionData[]>([]);
  const [discoveryStats, setDiscoveryStats] = useState<any>(null);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);

  useEffect(() => {
    fetchScoutData();
  }, [timeRange]);

  useEffect(() => {
    setSortedSubmissions(sortSubmissions(submissions, sortOrder));
  }, [submissions, sortOrder]);

  useEffect(() => {
    // Fetch discovery stats when discovery tab is active
    if (activeTab === 'discovery' && user) {
      fetchDiscoveryStats();
    }
  }, [activeTab, user]);

  const fetchScoutData = async () => {
    try {
      setLoading(true);
      const idToken = await getIdToken();

      const [submissionsResponse, statsResponse] = await Promise.all([
        fetch(`/api/scout/submissions?timeRange=${timeRange}`, {
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`/api/scout/stats?timeRange=${timeRange}`, {
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
        }),
      ]);

      if (submissionsResponse.ok) {
        const submissionsData = await submissionsResponse.json();
        const submissionsArray = submissionsData.submissions || [];
        setSubmissions(submissionsArray);
        generateChartData(submissionsArray);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats || stats);
      }
    } catch (err: any) {
      console.error('Error fetching scout data:', err);
      error('Failed to load scout data', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const generateChartData = (submissionsData: SubmissionData[]) => {
    const days = parseInt(timeRange.replace('d', ''));
    const chartData: ChartData[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const daySubmissions = submissionsData.filter(s =>
        new Date(s.submittedAt).toISOString().split('T')[0] === dateStr
      );

      chartData.push({
        date: dateStr,
        submissions: daySubmissions.length,
        approved: daySubmissions.filter(s => s.status === 'approved').length,
        pending: daySubmissions.filter(s => s.status === 'pending').length,
        rejected: daySubmissions.filter(s => s.status === 'rejected').length,
      });
    }

    setChartData(chartData);
  };

  const sortSubmissions = (submissionsArray: SubmissionData[], order: 'asc' | 'desc') => {
    return [...submissionsArray].sort((a, b) => {
      const dateA = new Date(a.submittedAt).getTime();
      const dateB = new Date(b.submittedAt).getTime();
      return order === 'asc' ? dateA - dateB : dateB - dateA;
    });
  };

  const handleSortChange = (newOrder: 'asc' | 'desc') => {
    setSortOrder(newOrder);
  };

  const fetchDiscoveryStats = async () => {
    try {
      setDiscoveryLoading(true);
      const idToken = await getIdToken();

      const response = await fetch('/api/discovery/stats', {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDiscoveryStats(data);
      } else {
        console.error('Failed to fetch discovery stats:', response.statusText);
      }
    } catch (err: any) {
      console.error('Error fetching discovery stats:', err);
      error('Failed to load discovery stats', 'Error');
    } finally {
      setDiscoveryLoading(false);
    }
  };

  const getScoutLevelIcon = (level: string) => {
    if (level.includes('Master')) return <TrophySolid className="w-6 h-6 text-yellow-500" />;
    if (level.includes('Expert')) return <StarSolid className="w-6 h-6 text-purple-500" />;
    if (level.includes('Advanced')) return <FireSolid className="w-6 h-6 text-orange-500" />;
    return <MapPinIcon className="w-6 h-6 text-blue-500" />;
  };

  const getScoutLevelColor = (level: string) => {
    if (level.includes('Master')) return 'from-yellow-400 to-yellow-600';
    if (level.includes('Expert')) return 'from-purple-400 to-purple-600';
    if (level.includes('Advanced')) return 'from-orange-400 to-orange-600';
    return 'from-blue-400 to-blue-600';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatDate = (date: Date | string | number | null | undefined) => {
    try {
      // Handle null, undefined, or empty values
      if (date === null || date === undefined || date === '') {
        return 'No date';
      }

      const dateObj = date instanceof Date ? date : new Date(date);

      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {
        console.warn('Invalid date value received:', date);
        return 'Invalid date';
      }

      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(dateObj);
    } catch (error) {
      console.error('Date formatting error:', error, 'Input:', date);
      return 'Invalid date';
    }
  };

  const sidebarItems = [
    { id: "overview", label: "Overview", icon: ChartBarIcon },
    { id: "submissions", label: "My Submissions", icon: MapPinIcon, count: stats.totalSubmissions },
    { id: "discovery", label: "Discovery", icon: CpuChipIcon },
    { id: "analytics", label: "Analytics", icon: ArrowTrendingUpIcon },
    { id: "achievements", label: "Achievements", icon: TrophyIcon }
  ];

  if (loading) {
    return <ScoutDashboardSkeleton />;
  }

  return (
    <ResponsiveSidebar
      title="Scout Dashboard"
      subtitle={user?.name || user?.email}
      headerIcon={MapPinIcon}
      items={sidebarItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      backButton={{
        label: "Back to Map",
        onClick: () => window.location.href = '/',
        icon: EyeIcon
      }}
    >
      <div className="p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {activeTab === 'overview' && 'Scout Overview'}
              {activeTab === 'submissions' && 'My Submissions'}
              {activeTab === 'discovery' && 'Autonomous Discovery'}
              {activeTab === 'analytics' && 'Performance Analytics'}
              {activeTab === 'achievements' && 'Achievements'}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {activeTab === 'discovery'
                ? 'Use AI-powered tools to discover new Amala locations'
                : 'Track your location discovery progress'
              }
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
            <button
              onClick={() => window.location.href = '/'}
              className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-sm font-medium"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Location
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Scout Level Card */}
            <div className={`bg-gradient-to-r ${getScoutLevelColor(stats.scoutLevel)} rounded-lg p-6 text-white`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {getScoutLevelIcon(stats.scoutLevel)}
                  <div>
                    <h2 className="text-xl font-bold">{stats.scoutLevel}</h2>
                    <p className="text-white/80">{stats.scoutPoints} Scout Points</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{stats.approvalRate.toFixed(1)}%</div>
                  <div className="text-white/80 text-sm">Approval Rate</div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <MapPinIcon className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Submissions</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.totalSubmissions}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircleIcon className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Approved</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.approvedSubmissions}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ClockIcon className="h-8 w-8 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Pending</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.pendingSubmissions}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <StarIcon className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Avg Rating</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.averageRating.toFixed(1)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Submissions Over Time */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Submissions Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(value) => new Date(value).toLocaleDateString('en-GB')}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="approved"
                      stackId="1"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.6}
                      name="Approved"
                    />
                    <Area
                      type="monotone"
                      dataKey="pending"
                      stackId="1"
                      stroke="#f59e0b"
                      fill="#f59e0b"
                      fillOpacity={0.6}
                      name="Pending"
                    />
                    <Area
                      type="monotone"
                      dataKey="rejected"
                      stackId="1"
                      stroke="#ef4444"
                      fill="#ef4444"
                      fillOpacity={0.6}
                      name="Rejected"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Status Distribution */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Status Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Approved', value: stats.approvedSubmissions, color: '#10b981' },
                        { name: 'Pending', value: stats.pendingSubmissions, color: '#f59e0b' },
                        { name: 'Rejected', value: stats.rejectedSubmissions, color: '#ef4444' },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[
                        { name: 'Approved', value: stats.approvedSubmissions, color: '#10b981' },
                        { name: 'Pending', value: stats.pendingSubmissions, color: '#f59e0b' },
                        { name: 'Rejected', value: stats.rejectedSubmissions, color: '#ef4444' },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'submissions' && (
          <div className="space-y-6">
            {/* Recent Submissions */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Recent Submissions</h3>
                  <div className="mt-3 sm:mt-0 flex items-center space-x-2">
                    <AdjustmentsHorizontalIcon className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Sort by date:</span>
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => handleSortChange('desc')}
                        className={`flex items-center px-3 py-1 rounded-md text-xs font-medium transition-colors ${sortOrder === 'desc'
                          ? 'bg-orange-600 text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                          }`}
                      >
                        <ChevronDownIcon className="w-3 h-3 mr-1" />
                        Newest
                      </button>
                      <button
                        onClick={() => handleSortChange('asc')}
                        className={`flex items-center px-3 py-1 rounded-md text-xs font-medium transition-colors ${sortOrder === 'asc'
                          ? 'bg-orange-600 text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                          }`}
                      >
                        <ChevronUpIcon className="w-3 h-3 mr-1" />
                        Oldest
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submitted
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedSubmissions.slice(0, 10).map((submission) => (
                      <tr key={submission.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-start">
                            <MapPinIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-gray-900 truncate">{submission.name}</div>
                              <div className="text-sm text-gray-500 mt-1">
                                <div className="truncate" title={submission.fullAddress}>
                                  {submission.fullAddress}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getStatusIcon(submission.status)}
                            <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(submission.status)}`}>
                              {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(submission.submittedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center space-x-4">
                            {submission.rating && (
                              <div className="flex items-center">
                                <StarIcon className="h-4 w-4 text-yellow-400 mr-1" />
                                <span>{submission.rating.toFixed(1)}</span>
                              </div>
                            )}
                            {submission.photos > 0 && (
                              <div className="flex items-center">
                                <CameraIcon className="h-4 w-4 text-gray-400 mr-1" />
                                <span>{submission.photos}</span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {sortedSubmissions.length === 0 && (
                <div className="text-center py-12">
                  <MapPinIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No submissions yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Start discovering amazing locations to see your progress here.
                  </p>
                  <div className="mt-6">
                    <button
                      onClick={() => window.location.href = '/'}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Submit Your First Location
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'discovery' && (
          <div className="space-y-8">
            {/* Header with Refresh Button */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Autonomous Discovery</h2>
                <p className="text-sm text-gray-600 mt-1">Discover new Amala locations using AI-powered search</p>
              </div>
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
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
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
                      {discoveryLoading ? '...' : (discoveryStats?.totalLocationsFound || 0)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <CheckCircleIcon className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Success Rate</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {discoveryLoading ? '...' : `${(discoveryStats?.successRate || 0).toFixed(1)}%`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <GlobeAltIcon className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Regions Covered</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {discoveryLoading ? '...' : (discoveryStats?.regionsCovered || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Discovery Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
              {/* Discovery Configuration */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center">
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

              {/* Quick Actions & Info */}
              <div className="space-y-6">
                {/* Quick Actions */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                  </div>
                  <div className="p-6 space-y-3">
                    <button className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                      <PlayIcon className="w-4 h-4 mr-2" />
                      Start Discovery
                    </button>
                    <button className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium">
                      <GlobeAltIcon className="w-4 h-4 mr-2" />
                      Regional Search
                    </button>
                    <button className="w-full flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium">
                      <ChartBarIcon className="w-4 h-4 mr-2" />
                      View Results
                    </button>
                  </div>
                </div>

                {/* Discovery Tips */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Scout Tips</h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 rounded-full bg-blue-400 mt-2"></div>
                        <div>
                          <p className="text-sm text-gray-900 font-medium">Target specific regions</p>
                          <p className="text-xs text-gray-500">Focus on areas with high Amala concentration</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 rounded-full bg-green-400 mt-2"></div>
                        <div>
                          <p className="text-sm text-gray-900 font-medium">Use varied search terms</p>
                          <p className="text-xs text-gray-500">Try different keywords for better coverage</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 rounded-full bg-purple-400 mt-2"></div>
                        <div>
                          <p className="text-sm text-gray-900 font-medium">Monitor success rates</p>
                          <p className="text-xs text-gray-500">Track which strategies work best</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Submissions Over Time */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Submissions Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(value) => new Date(value).toLocaleDateString('en-GB')}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="approved"
                      stackId="1"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.6}
                      name="Approved"
                    />
                    <Area
                      type="monotone"
                      dataKey="pending"
                      stackId="1"
                      stroke="#f59e0b"
                      fill="#f59e0b"
                      fillOpacity={0.6}
                      name="Pending"
                    />
                    <Area
                      type="monotone"
                      dataKey="rejected"
                      stackId="1"
                      stroke="#ef4444"
                      fill="#ef4444"
                      fillOpacity={0.6}
                      name="Rejected"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Status Distribution */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Status Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Approved', value: stats.approvedSubmissions, color: '#10b981' },
                        { name: 'Pending', value: stats.pendingSubmissions, color: '#f59e0b' },
                        { name: 'Rejected', value: stats.rejectedSubmissions, color: '#ef4444' },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[
                        { name: 'Approved', value: stats.approvedSubmissions, color: '#10b981' },
                        { name: 'Pending', value: stats.pendingSubmissions, color: '#f59e0b' },
                        { name: 'Rejected', value: stats.rejectedSubmissions, color: '#ef4444' },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Scout Achievements</h3>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-center mb-2">
                    <TrophyIcon className="w-6 h-6 text-yellow-600 mr-2" />
                    <h4 className="font-semibold text-yellow-800">First Discovery</h4>
                  </div>
                  <p className="text-sm text-yellow-700">
                    {stats.totalSubmissions > 0 ? 'Completed!' : 'Submit your first location'}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center mb-2">
                    <StarIcon className="w-6 h-6 text-green-600 mr-2" />
                    <h4 className="font-semibold text-green-800">Quality Scout</h4>
                  </div>
                  <p className="text-sm text-green-700">
                    {stats.approvalRate >= 80 ? 'Completed!' : `Achieve 80% approval rate (${stats.approvalRate.toFixed(1)}%)`}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center mb-2">
                    <FireIcon className="w-6 h-6 text-purple-600 mr-2" />
                    <h4 className="font-semibold text-purple-800">Prolific Explorer</h4>
                  </div>
                  <p className="text-sm text-purple-700">
                    {stats.totalSubmissions >= 10 ? 'Completed!' : `Submit 10 locations (${stats.totalSubmissions}/10)`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ResponsiveSidebar>
  );
}
