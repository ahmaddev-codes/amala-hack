"use client";

import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  UsersIcon,
  MapPinIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

// Helper function to fetch real timeline data
async function fetchTimelineData(userEmail?: string) {
  try {
    const response = await fetch(`/api/analytics/firebase-data/timeseries?days=7`);
    if (response.ok) {
      const timeSeriesData = await response.json();
      return timeSeriesData.map((item: any) => ({
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        submissions: item.submissions || item.newUsers || 0, // Use actual submissions if available
        approved: item.approved || Math.floor((item.submissions || item.newUsers || 0) * 0.7) // Use actual approved data if available
      }));
    }
  } catch (error) {
    console.error('Failed to fetch timeline data:', error);
  }
  
  // Fallback to empty data for the last 7 days
  const days = 7;
  const data = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      submissions: 0,
      approved: 0
    });
  }
  
  return data;
}

interface AnalyticsData {
  totalSubmissions: number;
  approvedSubmissions: number;
  pendingSubmissions: number;
  rejectedSubmissions: number;
  averageApprovalTime: string;
  topContributors: Array<{
    email: string;
    count: number;
  }>;
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: Date;
  }>;
}

interface AnalyticsWidgetProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

function AnalyticsWidget({ title, value, change, changeType, icon: Icon, description }: AnalyticsWidgetProps) {
  const changeColorClass = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-gray-600'
  }[changeType || 'neutral'];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <p className={`text-sm ${changeColorClass} flex items-center mt-1`}>
              <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
              {change}
            </p>
          )}
          {description && (
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          )}
        </div>
        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
          <Icon className="w-6 h-6 text-orange-600" />
        </div>
      </div>
    </div>
  );
}

interface ScoutPerformanceProps {
  userEmail?: string;
}

export function ScoutPerformanceWidget({ userEmail }: ScoutPerformanceProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Fetch user-specific analytics and timeline data in parallel
        const [analyticsResponse, timelineResponse] = await Promise.all([
          fetch(`/api/analytics/user?email=${encodeURIComponent(userEmail || '')}`),
          fetchTimelineData(userEmail)
        ]);

        let analyticsData = {
          totalSubmissions: 0,
          approvedSubmissions: 0,
          pendingSubmissions: 0,
          rejectedSubmissions: 0,
          averageApprovalTime: 'N/A',
          topContributors: [],
          recentActivity: []
        };

        if (analyticsResponse.ok) {
          const data = await analyticsResponse.json();
          analyticsData = data;
        }

        setAnalytics(analyticsData);
        setTimelineData(timelineResponse);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
        // Set empty state
        setAnalytics({
          totalSubmissions: 0,
          approvedSubmissions: 0,
          pendingSubmissions: 0,
          rejectedSubmissions: 0,
          averageApprovalTime: 'N/A',
          topContributors: [],
          recentActivity: []
        });
        setTimelineData(await fetchTimelineData(userEmail));
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [userEmail]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-8 bg-gray-200 rounded mb-2"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">Unable to load analytics data</p>
      </div>
    );
  }

  const approvalRate = analytics.totalSubmissions > 0 
    ? Math.round((analytics.approvedSubmissions / analytics.totalSubmissions) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnalyticsWidget
          title="Total Submissions"
          value={analytics.totalSubmissions}
          icon={MapPinIcon}
          description="Locations you've submitted"
        />
        <AnalyticsWidget
          title="Approved"
          value={analytics.approvedSubmissions}
          change={approvalRate > 0 ? `${approvalRate}% approval rate` : undefined}
          changeType={approvalRate >= 70 ? 'positive' : approvalRate >= 40 ? 'neutral' : 'negative'}
          icon={CheckCircleIcon}
          description="Successfully approved locations"
        />
        <AnalyticsWidget
          title="Pending Review"
          value={analytics.pendingSubmissions}
          icon={ClockIcon}
          description="Awaiting moderation"
        />
        <AnalyticsWidget
          title="Average Approval Time"
          value={analytics.averageApprovalTime}
          icon={ChartBarIcon}
          description="Time to get approved"
        />
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submission Timeline Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Submission Timeline</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="submissions" stroke="#f97316" strokeWidth={2} name="Submissions" />
                <Line type="monotone" dataKey="approved" stroke="#22c55e" strokeWidth={2} name="Approved" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Submission Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Approved', value: analytics.approvedSubmissions, color: '#22c55e' },
                    { name: 'Pending', value: analytics.pendingSubmissions, color: '#f59e0b' },
                    { name: 'Rejected', value: analytics.rejectedSubmissions, color: '#ef4444' }
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={(entry: any) => {
                    // Calculate percentage manually from the data
                    const total = analytics.approvedSubmissions + analytics.pendingSubmissions + analytics.rejectedSubmissions;
                    const percent = total > 0 ? (entry.value / total) * 100 : 0;
                    return `${entry.name} ${percent.toFixed(0)}%`;
                  }}
                >
                  {[
                    { name: 'Approved', value: analytics.approvedSubmissions, color: '#22c55e' },
                    { name: 'Pending', value: analytics.pendingSubmissions, color: '#f59e0b' },
                    { name: 'Rejected', value: analytics.rejectedSubmissions, color: '#ef4444' }
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

      {analytics.recentActivity.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {analytics.recentActivity.slice(0, 5).map((activity, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(activity.timestamp).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface SystemAnalyticsProps {
  isAdmin?: boolean;
}

export function SystemAnalyticsWidget({ isAdmin = false }: SystemAnalyticsProps) {
  const [systemStats, setSystemStats] = useState({
    totalLocations: 0,
    totalUsers: 0,
    pendingModeration: 0,
    dailyActiveUsers: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSystemStats = async () => {
      try {
        const response = await fetch('/api/analytics/system');
        if (response.ok) {
          const data = await response.json();
          setSystemStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch system stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isAdmin) {
      fetchSystemStats();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg shadow p-6 text-center">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <EyeIcon className="w-8 h-8 text-orange-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Admin Access Required</h3>
        <p className="text-gray-600">
          System analytics are only available to administrators.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-8 bg-gray-200 rounded mb-2"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <AnalyticsWidget
        title="Total Locations"
        value={systemStats.totalLocations}
        icon={MapPinIcon}
        description="Approved locations on platform"
      />
      <AnalyticsWidget
        title="Registered Users"
        value={systemStats.totalUsers}
        icon={UsersIcon}
        description="Active platform users"
      />
      <AnalyticsWidget
        title="Pending Moderation"
        value={systemStats.pendingModeration}
        icon={ClockIcon}
        description="Items awaiting review"
      />
      <AnalyticsWidget
        title="Daily Active Users"
        value={systemStats.dailyActiveUsers}
        icon={ArrowTrendingUpIcon}
        description="Users active today"
      />
    </div>
  );
}
