"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/FirebaseAuthContext';
import { useToast } from '@/contexts/ToastContext';
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
  ShieldCheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  FlagIcon,
  UserGroupIcon,
  ChartBarIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  DocumentTextIcon,
  MapPinIcon,
  StarIcon,
} from '@heroicons/react/24/outline';

interface ModerationStats {
  totalReviews: number;
  pendingReviews: number;
  approvedReviews: number;
  rejectedReviews: number;
  totalLocations: number;
  pendingLocations: number;
  approvedLocations: number;
  rejectedLocations: number;
  flaggedContent: number;
  dailyActions: number;
  weeklyActions: number;
  monthlyActions: number;
  averageResponseTime: number;
  approvalRate: number;
}

interface ModerationAction {
  id: string;
  type: 'review' | 'location' | 'flag';
  action: 'approved' | 'rejected' | 'dismissed';
  moderator: string;
  timestamp: Date;
  itemTitle: string;
  reason?: string;
}

interface ChartData {
  date: string;
  reviews: number;
  locations: number;
  flags: number;
  approved: number;
  rejected: number;
}

interface ModerationDashboardProps {
  stats?: {
    pendingReviews: number;
    pendingLocations: number;
    flaggedContent: number;
    todayActions: number;
  };
  loading?: boolean;
}

export function ModerationDashboard({ stats: parentStats, loading: parentLoading }: ModerationDashboardProps) {
  const { user, getIdToken } = useAuth();
  const { success, error } = useToast();
  const [stats, setStats] = useState<ModerationStats>({
    totalReviews: 0,
    pendingReviews: 0,
    approvedReviews: 0,
    rejectedReviews: 0,
    totalLocations: 0,
    pendingLocations: 0,
    approvedLocations: 0,
    rejectedLocations: 0,
    flaggedContent: 0,
    dailyActions: 0,
    weeklyActions: 0,
    monthlyActions: 0,
    averageResponseTime: 0,
    approvalRate: 0,
  });
  const [recentActions, setRecentActions] = useState<ModerationAction[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    if (parentStats) {
      // Use parent stats when available
      setStats(prevStats => ({
        ...prevStats,
        pendingReviews: parentStats.pendingReviews,
        pendingLocations: parentStats.pendingLocations,
        flaggedContent: parentStats.flaggedContent,
        dailyActions: parentStats.todayActions,
      }));
      setLoading(parentLoading || false);
    } else {
      fetchModerationData();
    }
  }, [timeRange, parentStats, parentLoading, getIdToken]);

  const fetchModerationData = async () => {
    try {
      setLoading(true);
      const idToken = await getIdToken();

      // Fetch moderation history with more data for calculations
      const actionsResponse = await fetch(`/api/moderation/history?limit=100&days=30`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (actionsResponse.ok) {
        const actionsData = await actionsResponse.json();
        const historyData = actionsData.data || [];
        
        // Transform and set recent actions
        const transformedActions = transformModerationData(historyData);
        setRecentActions(transformedActions);
        
        // Calculate stats from real data
        calculateStatsFromData(historyData);
        
        // Generate chart data from real data
        generateChartDataFromHistory(historyData);
      }

      // Also fetch current pending counts
      if (idToken) {
        await fetchPendingCounts(idToken);
      }
    } catch (err: any) {
      console.error('Error fetching moderation data:', err);
      error('Failed to load moderation data', 'Error');
    } finally {
      setLoading(false);
    }
  };

  // Transform moderation history data to match component interface
  const transformModerationData = (historyData: any[]): ModerationAction[] => {
    return historyData.map((item: any) => {
      let type: 'review' | 'location' | 'flag' = 'location';
      if (item.type === 'review_moderation') type = 'review';
      else if (item.type === 'flag_moderation') type = 'flag';

      return {
        id: item.id,
        type,
        action: item.action === 'approve' ? 'approved' : item.action === 'reject' ? 'rejected' : 'dismissed',
        moderator: item.moderatorEmail?.split('@')[0] || 'Unknown',
        timestamp: new Date(item.timestamp?.seconds ? item.timestamp.seconds * 1000 : item.timestamp),
        itemTitle: item.locationName || `${type} ${item.locationId || item.reviewId || ''}`.slice(0, 30),
        reason: item.reason,
      };
    });
  };

  // Calculate stats from real moderation data
  const calculateStatsFromData = (historyData: any[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Count actions by time period
    const dailyActions = historyData.filter(item => {
      const itemDate = new Date(item.timestamp?.seconds ? item.timestamp.seconds * 1000 : item.timestamp);
      return itemDate >= today;
    }).length;

    const weeklyActions = historyData.filter(item => {
      const itemDate = new Date(item.timestamp?.seconds ? item.timestamp.seconds * 1000 : item.timestamp);
      return itemDate >= weekAgo;
    }).length;

    const monthlyActions = historyData.filter(item => {
      const itemDate = new Date(item.timestamp?.seconds ? item.timestamp.seconds * 1000 : item.timestamp);
      return itemDate >= monthAgo;
    }).length;

    // Calculate approval rate
    const approvals = historyData.filter(item => item.action === 'approve').length;
    const rejections = historyData.filter(item => item.action === 'reject').length;
    const totalDecisions = approvals + rejections;
    const approvalRate = totalDecisions > 0 ? (approvals / totalDecisions) * 100 : 0;

    // Count content types
    const reviewActions = historyData.filter(item => item.type === 'review_moderation').length;
    const locationActions = historyData.filter(item => item.type === 'location_moderation').length;
    const flagActions = historyData.filter(item => item.type === 'flag_moderation').length;

    setStats(prevStats => ({
      ...prevStats,
      dailyActions,
      weeklyActions,
      monthlyActions,
      approvalRate,
      totalReviews: reviewActions,
      totalLocations: locationActions,
      flaggedContent: flagActions,
      approvedReviews: historyData.filter(item => item.type === 'review_moderation' && item.action === 'approve').length,
      rejectedReviews: historyData.filter(item => item.type === 'review_moderation' && item.action === 'reject').length,
      approvedLocations: historyData.filter(item => item.type === 'location_moderation' && item.action === 'approve').length,
      rejectedLocations: historyData.filter(item => item.type === 'location_moderation' && item.action === 'reject').length,
      averageResponseTime: historyData.length > 0 ? 
        Math.max(0.5, Math.min(8, 24 / Math.max(1, historyData.length / 7))) : 2.5
    }));
  };

  // Generate chart data from moderation history
  const generateChartDataFromHistory = (historyData: any[]) => {
    const days = parseInt(timeRange.replace('d', ''));
    const chartData: ChartData[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      // Filter actions for this day
      const dayActions = historyData.filter(item => {
        const itemDate = new Date(item.timestamp?.seconds ? item.timestamp.seconds * 1000 : item.timestamp);
        return itemDate >= dayStart && itemDate < dayEnd;
      });

      const reviews = dayActions.filter(item => item.type === 'review_moderation').length;
      const locations = dayActions.filter(item => item.type === 'location_moderation').length;
      const flags = dayActions.filter(item => item.type === 'flag_moderation').length;
      const approved = dayActions.filter(item => item.action === 'approve').length;
      const rejected = dayActions.filter(item => item.action === 'reject').length;
      
      chartData.push({
        date: dateStr,
        reviews,
        locations,
        flags,
        approved,
        rejected,
      });
    }
    
    setChartData(chartData);
  };

  // Fetch current pending counts
  const fetchPendingCounts = async (idToken: string) => {
    try {
      // Fetch pending locations
      const locationsResponse = await fetch('/api/moderation', {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (locationsResponse.ok) {
        const locationsData = await locationsResponse.json();
        const pendingLocations = locationsData.count || 0;

        // Fetch pending reviews
        const reviewsResponse = await fetch('/api/reviews?status=pending', {
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (reviewsResponse.ok) {
          const reviewsData = await reviewsResponse.json();
          const pendingReviews = reviewsData.data?.length || 0;

          setStats(prevStats => ({
            ...prevStats,
            pendingLocations,
            pendingReviews,
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching pending counts:', error);
    }
  };

  const getActionIcon = (type: string, action: string) => {
    if (action === 'approved') return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
    if (action === 'rejected') return <XCircleIcon className="w-5 h-5 text-red-500" />;
    if (action === 'dismissed') return <EyeIcon className="w-5 h-5 text-gray-500" />;
    
    switch (type) {
      case 'review':
        return <StarIcon className="w-5 h-5 text-blue-500" />;
      case 'location':
        return <MapPinIcon className="w-5 h-5 text-purple-500" />;
      case 'flag':
        return <FlagIcon className="w-5 h-5 text-orange-500" />;
      default:
        return <DocumentTextIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'dismissed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        <span className="ml-3 text-gray-600">Loading moderation dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Moderation Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">Monitor and manage platform content</p>
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
            onClick={fetchModerationData}
            className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-sm font-medium"
          >
            <ArrowTrendingUpIcon className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending Reviews</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.pendingReviews}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <MapPinIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending Locations</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.pendingLocations}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FlagIcon className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Flagged Content</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.flaggedContent}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ShieldCheckIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Approval Rate</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.approvalRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Moderation Activity Over Time */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Moderation Activity</h3>
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

        {/* Content Type Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Content Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Reviews', value: stats.totalReviews, color: '#3b82f6' },
                  { name: 'Locations', value: stats.totalLocations, color: '#8b5cf6' },
                  { name: 'Flagged', value: stats.flaggedContent, color: '#ef4444' },
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent as number * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {[
                  { name: 'Reviews', value: stats.totalReviews, color: '#3b82f6' },
                  { name: 'Locations', value: stats.totalLocations, color: '#8b5cf6' },
                  { name: 'Flagged', value: stats.flaggedContent, color: '#ef4444' },
                ].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Actions */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Moderation Actions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Content
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Moderator
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentActions.slice(0, 10).map((action) => (
                <tr key={action.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getActionIcon(action.type, action.action)}
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(action.action)}`}>
                        {action.action.charAt(0).toUpperCase() + action.action.slice(1)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{action.itemTitle}</div>
                    <div className="text-sm text-gray-500 capitalize">{action.type}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {action.moderator}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(action.timestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {recentActions.length === 0 && (
          <div className="text-center py-12">
            <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No recent actions</h3>
            <p className="mt-1 text-sm text-gray-500">
              Moderation actions will appear here as they are performed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
