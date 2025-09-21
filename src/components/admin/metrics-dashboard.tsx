"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import {
  LineChart,
  Line,
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
  PieLabelRenderProps,
} from "recharts";

type Metrics = {
  windowDays: number;
  submissionsPerDay: Record<string, number>;
  verificationRate: number | null;
  avgTimeToApprovalHours: number | null;
  dedupRate: number | null;
  eventCounts: Record<string, number>;
};

interface MetricsDashboardProps {
  className?: string;
}

export function MetricsDashboard({ className = "" }: MetricsDashboardProps) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);

  console.log("MetricsDashboard render - metrics state:", metrics);

  const refresh = async (d: number) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/analytics/metrics?days=${d}`);
      const json = await res.json();
      
      console.log("Metrics API response:", json);
      
      if (res.ok && json.success && json.data) {
        console.log("Raw API response:", json);
        console.log("Submissions per day:", json.data.submissionsPerDay);
        console.log("Event counts:", json.data.eventCounts);
        
        // Ensure the data has the expected structure
        const metricsData = {
          windowDays: json.data.windowDays || d,
          submissionsPerDay: json.data.submissionsPerDay || {},
          verificationRate: json.data.verificationRate,
          avgTimeToApprovalHours: json.data.avgTimeToApprovalHours,
          dedupRate: json.data.dedupRate,
          eventCounts: json.data.eventCounts || {}
        };
        
        console.log("Processed metrics data:", metricsData);
        setMetrics(metricsData);
      } else {
        console.error("API error response:", json);
        setError(json.error || "Failed to fetch metrics");
      }
    } catch (err) {
      console.error("Metrics fetch error:", err);
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh(days);
  }, [days]);

  const submissionsData = useMemo(() => {
    if (!metrics || !metrics.submissionsPerDay || typeof metrics.submissionsPerDay !== 'object') {
      return [];
    }
    try {
      return Object.entries(metrics.submissionsPerDay)
        .map(([date, count]) => ({
          date,
          submissions: count,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort by date ascending
    } catch (error) {
      console.error('Error processing submissions data:', error);
      return [];
    }
  }, [metrics]);

  const eventData = useMemo(() => {
    if (!metrics || !metrics.eventCounts || typeof metrics.eventCounts !== 'object') {
      return [];
    }
    try {
      return Object.entries(metrics.eventCounts).map(([event, count]) => ({
        name: event.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        value: count,
      }));
    } catch (error) {
      console.error('Error processing event data:', error);
      return [];
    }
  }, [metrics]);

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-100 h-24 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-100 h-64 rounded-lg"></div>
            <div className="bg-gray-100 h-64 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error Loading Metrics</h3>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button
            onClick={() => refresh(days)}
            className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className={`${className}`}>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-yellow-800 font-medium">No Metrics Available</h3>
          <p className="text-yellow-600 text-sm mt-1">Unable to load analytics data</p>
          <button
            onClick={() => refresh(days)}
            className="mt-2 px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Analytics Dashboard</h2>
        <div className="flex space-x-2">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 text-sm rounded ${
                days === d
                  ? "bg-orange-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {d} days
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-500">Verification Rate</h3>
          <p className="text-2xl font-bold text-green-600">
            {metrics.verificationRate !== null
              ? `${(metrics.verificationRate * 100).toFixed(1)}%`
              : "N/A"}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-500">Avg. Approval Time</h3>
          <p className="text-2xl font-bold text-blue-600">
            {metrics.avgTimeToApprovalHours !== null
              ? `${metrics.avgTimeToApprovalHours.toFixed(1)}h`
              : "N/A"}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-500">Duplicate Rate</h3>
          <p className="text-2xl font-bold text-orange-600">
            {metrics.dedupRate !== null
              ? `${(metrics.dedupRate * 100).toFixed(1)}%`
              : "N/A"}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submissions Over Time */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-medium mb-4">Daily Submissions</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={submissionsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString('en-GB', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric' 
                  });
                }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                labelFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString('en-GB', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric' 
                  });
                }}
              />
              <Line
                type="monotone"
                dataKey="submissions"
                stroke="#ea580c"
                strokeWidth={2}
                dot={{ fill: "#ea580c" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Event Distribution */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-medium mb-4">Event Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={eventData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(props: PieLabelRenderProps) => {
                  if (props && props.name && props.percent !== undefined && typeof props.percent === 'number') {
                    return `${props.name} ${(props.percent * 100).toFixed(0)}%`;
                  }
                  return '';
                }}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {eventData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={() => refresh(days)}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Refresh Data
        </button>
      </div>
    </div>
  );
}
