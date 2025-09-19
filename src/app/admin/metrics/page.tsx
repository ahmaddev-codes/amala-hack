"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
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
} from "recharts";

type Metrics = {
  windowDays: number;
  submissionsPerDay: Record<string, number>;
  verificationRate: number | null;
  avgTimeToApprovalHours: number | null;
  dedupRate: number | null;
  eventCounts: Record<string, number>;
};

export default function MetricsDashboardPage() {
  return (
    <ProtectedRoute requiredRoles={["admin", "mod"]}>
      <MetricsDashboard />
    </ProtectedRoute>
  );
}

function MetricsDashboard() {
  const { user, canAdmin } = useAuth();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);

  const refresh = async (d: number) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/analytics/metrics?days=${d}`);
      const json = await res.json();
      if (!json.success)
        throw new Error(json.error || "Failed to fetch metrics");
      setMetrics(json.data as Metrics);
    } catch (e: any) {
      setError(e.message || "Failed to fetch metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh(days);
  }, [days]);

  const submissionsTotal = useMemo(() => {
    if (!metrics) return 0;
    return Object.values(metrics.submissionsPerDay || {}).reduce(
      (a, b) => a + b,
      0
    );
  }, [metrics]);

  const submissionsChartData = useMemo(() => {
    if (!metrics?.submissionsPerDay) return [];
    return Object.entries(metrics.submissionsPerDay).map(([date, count]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      submissions: count,
    }));
  }, [metrics]);

  const eventChartData = useMemo(() => {
    if (!metrics?.eventCounts) return [];
    return Object.entries(metrics.eventCounts).map(([event, count]) => ({
      name: event.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: count,
    }));
  }, [metrics]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading metrics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Analytics Dashboard</h1>

      <div className="mb-6">
        <label
          htmlFor="days"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Time Range (Days)
        </label>
        <select
          id="days"
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value))}
          className="border border-gray-300 rounded-md px-3 py-2"
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Total Submissions</h3>
            <p className="text-3xl font-bold text-blue-600">
              {submissionsTotal}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Verification Rate</h3>
            <p className="text-3xl font-bold text-green-600">
              {metrics.verificationRate !== null
                ? `${(metrics.verificationRate * 100).toFixed(1)}%`
                : "N/A"}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Avg Time to Approval</h3>
            <p className="text-3xl font-bold text-orange-600">
              {metrics.avgTimeToApprovalHours !== null
                ? `${metrics.avgTimeToApprovalHours.toFixed(1)}h`
                : "N/A"}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Duplicate Rate</h3>
            <p className="text-3xl font-bold text-red-600">
              {metrics.dedupRate !== null
                ? `${(metrics.dedupRate * 100).toFixed(1)}%`
                : "N/A"}
            </p>
          </div>
        </div>
      )}

      {metrics && submissionsChartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Submissions Over Time Chart */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Daily Submissions Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={submissionsChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  labelStyle={{ color: '#374151' }}
                  contentStyle={{ 
                    backgroundColor: '#f9fafb', 
                    border: '1px solid #d1d5db',
                    borderRadius: '6px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="submissions" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Event Distribution Chart */}
          {eventChartData.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Event Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={eventChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props: any) => {
                      const { name, value } = props as { name: string; value: number };
                      const total = eventChartData.reduce((sum, item) => sum + item.value, 0);
                      const percent = ((value / total) * 100).toFixed(0);
                      return `${name} ${percent}%`;
                    }}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {eventChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#f9fafb', 
                      border: '1px solid #d1d5db',
                      borderRadius: '6px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {metrics &&
        metrics.eventCounts &&
        Object.keys(metrics.eventCounts).length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Event Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(metrics.eventCounts).map(([event, count]) => (
                <div key={event} className="text-center p-4 bg-gray-50 rounded">
                  <p className="text-sm text-gray-600 capitalize">
                    {event.replace("_", " ")}
                  </p>
                  <p className="text-xl font-bold">{count}</p>
                </div>
              ))}
            </div>
          </div>
        )}
    </div>
  );
}
