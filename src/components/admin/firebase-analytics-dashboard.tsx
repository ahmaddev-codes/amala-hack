"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { FirebaseAnalyticsDataService } from "@/lib/analytics/firebase-analytics-data";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts";
import {
  UsersIcon,
  EyeIcon,
  CursorArrowRaysIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

interface AnalyticsMetrics {
  activeUsers: number;
  totalUsers: number;
  newUsers: number;
  sessions: number;
  pageViews: number;
  averageSessionDuration: number;
  bounceRate: number;
  conversionRate: number;
}

interface TimeSeriesData {
  date: string;
  activeUsers: number;
  sessions: number;
  pageViews: number;
  newUsers: number;
}

interface TopPage {
  pagePath: string;
  pageTitle: string;
  views: number;
  uniquePageViews: number;
}

interface UserDemographics {
  country: string;
  users: number;
  percentage: number;
  [key: string]: any; // Index signature for Recharts compatibility
}

interface EventData {
  eventName: string;
  eventCount: number;
  uniqueUsers: number;
}

function FirebaseAnalyticsDashboard() {
  const { getIdToken } = useAuth();
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [demographics, setDemographics] = useState<UserDemographics[]>([]);
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState(30);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get auth token for API calls
      const authToken = await getIdToken();
      // Convert null to undefined for TypeScript compatibility
      const token = authToken ?? undefined;

      // Load all analytics data in parallel
      const [metricsData, timeSeriesResult, topPagesData, demographicsData, eventsData] = await Promise.allSettled([
        FirebaseAnalyticsDataService.getRealtimeMetrics(token),
        FirebaseAnalyticsDataService.getTimeSeriesData(timeRange, token),
        FirebaseAnalyticsDataService.getTopPages(token),
        FirebaseAnalyticsDataService.getUserDemographics(token),
        FirebaseAnalyticsDataService.getEventData(token),
      ]);

      // Process results
      if (metricsData.status === 'fulfilled') {
        setMetrics(metricsData.value);
      }
      if (timeSeriesResult.status === 'fulfilled') {
        setTimeSeriesData(timeSeriesResult.value);
      }
      if (topPagesData.status === 'fulfilled') {
        setTopPages(topPagesData.value);
      }
      if (demographicsData.status === 'fulfilled') {
        setDemographics(demographicsData.value);
      }
      if (eventsData.status === 'fulfilled') {
        setEvents(eventsData.value);
      }

    } catch (err) {
      console.error('Analytics data loading error:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // Chart colors
  const colors = {
    primary: '#f97316', // Orange
    secondary: '#22c55e', // Green
    accent: '#3b82f6', // Blue
    warning: '#eab308', // Yellow
    danger: '#ef4444', // Red
  };

  const pieColors = [colors.primary, colors.secondary, colors.accent, colors.warning, colors.danger];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="text-red-400 mr-3">
            <ChartBarIcon className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-red-800 font-medium">Analytics Error</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        </div>
        <button
          onClick={loadAnalyticsData}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Firebase Analytics Dashboard</h2>
          <p className="text-gray-600 mt-1">Real-time user behavior and platform insights</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-2 bg-white"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            onClick={loadAnalyticsData}
            className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <UsersIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(metrics.activeUsers)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <EyeIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Page Views</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(metrics.pageViews)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CursorArrowRaysIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(metrics.sessions)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <ArrowTrendingUpIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                <p className="text-2xl font-bold text-gray-900">{formatPercentage(metrics.conversionRate)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Time Series Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Activity Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString('en-GB')}
              />
              <Area type="monotone" dataKey="activeUsers" stackId="1" stroke={colors.primary} fill={colors.primary} fillOpacity={0.6} />
              <Area type="monotone" dataKey="newUsers" stackId="1" stroke={colors.secondary} fill={colors.secondary} fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Pages */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Pages</h3>
          <div className="space-y-3">
            {topPages.slice(0, 5).map((page) => (
              <div key={page.pagePath} className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{page.pageTitle}</p>
                  <p className="text-xs text-gray-500 truncate">{page.pagePath}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{formatNumber(page.views)}</p>
                  <p className="text-xs text-gray-500">{formatNumber(page.uniquePageViews)} unique</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* User Demographics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Demographics</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={demographics}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ country, percentage }) => `${country} ${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="users"
              >
                {demographics.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Events */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Events</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={events.slice(0, 5)} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="eventName" type="category" width={120} />
              <Tooltip />
              <Bar dataKey="eventCount" fill={colors.primary} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Additional Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Session Duration</p>
                <p className="text-xl font-bold text-gray-900">{formatDuration(metrics.averageSessionDuration)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ArrowTrendingUpIcon className="h-8 w-8 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Bounce Rate</p>
                <p className="text-xl font-bold text-gray-900">{formatPercentage(metrics.bounceRate)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <UsersIcon className="h-8 w-8 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">New Users</p>
                <p className="text-xl font-bold text-gray-900">{formatNumber(metrics.newUsers)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FirebaseAnalyticsDashboard;
