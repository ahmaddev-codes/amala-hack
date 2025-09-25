"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/FirebaseAuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  MapPinIcon,
  StarIcon,
  EyeIcon,
  FunnelIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import {
  CheckCircleIcon as CheckSolid,
  XCircleIcon as XSolid,
  ClockIcon as ClockSolid,
} from '@heroicons/react/24/solid';

interface ModerationAction {
  id: string;
  action: 'approve' | 'reject' | 'flag' | 'unflag';
  contentType: 'location' | 'review' | 'user';
  contentId: string;
  contentName: string;
  moderatorEmail: string;
  moderatorName?: string;
  timestamp: Date;
  reason?: string;
  notes?: string;
  previousStatus?: string;
  newStatus: string;
  details?: any;
}

interface HistoryFilters {
  moderator: string;
  action: string;
  contentType: string;
  dateRange: string;
  search: string;
}

export function ModerationHistory() {
  const { getIdToken, user } = useAuth();
  const { success, error } = useToast();
  const [history, setHistory] = useState<ModerationAction[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<ModerationAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ModerationAction | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [filters, setFilters] = useState<HistoryFilters>({
    moderator: '',
    action: '',
    contentType: '',
    dateRange: '30d',
    search: '',
  });

  const [stats, setStats] = useState({
    totalActions: 0,
    todayActions: 0,
    approvalRate: 0,
    averageResponseTime: 0,
    topModerator: '',
  });

  // Fetch moderation history
  useEffect(() => {
    fetchModerationHistory();
  }, []);

  // Apply filters when they change
  useEffect(() => {
    applyFilters();
  }, [filters, history]);

  const fetchModerationHistory = async () => {
    try {
      setLoading(true);
      const idToken = await getIdToken();

      const response = await fetch('/api/moderation/history', {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch moderation history');
      }

      const data = await response.json();
      const historyData = data.history || [];

      // Transform the data to match our interface
      const transformedHistory: ModerationAction[] = historyData.map((item: any) => ({
        id: item.id,
        action: item.action,
        contentType: item.contentType,
        contentId: item.contentId,
        contentName: item.contentName || `${item.contentType} ${item.contentId.slice(0, 8)}`,
        moderatorEmail: item.moderatorEmail,
        moderatorName: item.moderatorName || item.moderatorEmail.split('@')[0],
        timestamp: new Date(item.timestamp),
        reason: item.reason,
        notes: item.notes,
        previousStatus: item.previousStatus,
        newStatus: item.newStatus,
        details: item.details,
      }));

      setHistory(transformedHistory);
      calculateStats(transformedHistory);
    } catch (err: any) {
      console.error('Error fetching moderation history:', err);
      error('Failed to load moderation history', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (historyData: ModerationAction[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const todayActions = historyData.filter(h => h.timestamp >= today).length;
    const approvals = historyData.filter(h => h.action === 'approve').length;
    const totalDecisions = historyData.filter(h => ['approve', 'reject'].includes(h.action)).length;
    const approvalRate = totalDecisions > 0 ? (approvals / totalDecisions) * 100 : 0;

    // Calculate average response time (mock calculation)
    const averageResponseTime = 2.5; // hours

    // Find top moderator
    const moderatorCounts = historyData.reduce((acc, h) => {
      acc[h.moderatorEmail] = (acc[h.moderatorEmail] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topModerator = Object.entries(moderatorCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '';

    setStats({
      totalActions: historyData.length,
      todayActions,
      approvalRate,
      averageResponseTime,
      topModerator: topModerator.split('@')[0] || 'N/A',
    });
  };

  const applyFilters = () => {
    let filtered = [...history];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(item =>
        item.contentName.toLowerCase().includes(searchLower) ||
        item.moderatorEmail.toLowerCase().includes(searchLower) ||
        item.notes?.toLowerCase().includes(searchLower) ||
        item.reason?.toLowerCase().includes(searchLower)
      );
    }

    // Moderator filter
    if (filters.moderator) {
      filtered = filtered.filter(item => item.moderatorEmail === filters.moderator);
    }

    // Action filter
    if (filters.action) {
      filtered = filtered.filter(item => item.action === filters.action);
    }

    // Content type filter
    if (filters.contentType) {
      filtered = filtered.filter(item => item.contentType === filters.contentType);
    }

    // Date range filter
    if (filters.dateRange) {
      const now = new Date();
      const cutoffDate = new Date();

      switch (filters.dateRange) {
        case '1d':
          cutoffDate.setDate(now.getDate() - 1);
          break;
        case '7d':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          cutoffDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          cutoffDate.setDate(now.getDate() - 90);
          break;
      }

      filtered = filtered.filter(item => item.timestamp >= cutoffDate);
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    setFilteredHistory(filtered);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'approve':
        return <CheckSolid className="w-5 h-5 text-green-600" />;
      case 'reject':
        return <XSolid className="w-5 h-5 text-red-600" />;
      case 'flag':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />;
      default:
        return <ClockSolid className="w-5 h-5 text-gray-600" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'approve':
        return 'bg-green-100 text-green-800';
      case 'reject':
        return 'bg-red-100 text-red-800';
      case 'flag':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'location':
        return <MapPinIcon className="w-4 h-4" />;
      case 'review':
        return <StarIcon className="w-4 h-4" />;
      case 'user':
        return <UserIcon className="w-4 h-4" />;
      default:
        return <DocumentTextIcon className="w-4 h-4" />;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return `${Math.floor(diffInHours / 24)}d ago`;
    }
  };

  // Get unique moderators for filter
  const uniqueModerators = [...new Set(history.map(h => h.moderatorEmail))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        <span className="ml-3 text-gray-600">Loading moderation history...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DocumentTextIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Actions</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalActions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Today</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.todayActions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Approval Rate</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.approvalRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg Response</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.averageResponseTime}h</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UserIcon className="h-8 w-8 text-indigo-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Top Moderator</p>
              <p className="text-lg font-semibold text-gray-900">{stats.topModerator}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-medium text-gray-900">Moderation History</h3>
            <div className="mt-4 sm:mt-0 flex items-center space-x-3">
              <button
                onClick={fetchModerationHistory}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Refresh
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <FunnelIcon className="h-4 w-4 mr-2" />
                Filters
                {showFilters ? (
                  <ChevronUpIcon className="h-4 w-4 ml-1" />
                ) : (
                  <ChevronDownIcon className="h-4 w-4 ml-1" />
                )}
              </button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <input
                type="text"
                placeholder="Search actions..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              />

              <select
                value={filters.moderator}
                onChange={(e) => setFilters(prev => ({ ...prev, moderator: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">All Moderators</option>
                {uniqueModerators.map(email => (
                  <option key={email} value={email}>
                    {email.split('@')[0]}
                  </option>
                ))}
              </select>

              <select
                value={filters.action}
                onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">All Actions</option>
                <option value="approve">Approve</option>
                <option value="reject">Reject</option>
                <option value="flag">Flag</option>
                <option value="unflag">Unflag</option>
              </select>

              <select
                value={filters.contentType}
                onChange={(e) => setFilters(prev => ({ ...prev, contentType: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">All Content</option>
                <option value="location">Locations</option>
                <option value="review">Reviews</option>
                <option value="user">Users</option>
              </select>

              <select
                value={filters.dateRange}
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="1d">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>
            </div>
          )}
        </div>

        {/* History List */}
        <div className="divide-y divide-gray-200">
          {filteredHistory.map((action) => (
            <div key={action.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    {getActionIcon(action.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(action.action)}`}>
                        {action.action.charAt(0).toUpperCase() + action.action.slice(1)}
                      </span>
                      <span className="inline-flex items-center text-sm text-gray-500">
                        {getContentTypeIcon(action.contentType)}
                        <span className="ml-1">{action.contentType}</span>
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {action.contentName}
                    </p>
                    <p className="text-sm text-gray-500">
                      by {action.moderatorName} • {formatRelativeTime(action.timestamp)}
                    </p>
                    {action.notes && (
                      <p className="text-sm text-gray-600 mt-1">
                        &quot;{action.notes}&quot;
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">
                    {formatDate(action.timestamp)}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedAction(action);
                      setShowDetailModal(true);
                    }}
                    className="text-orange-600 hover:text-orange-900"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredHistory.length === 0 && (
          <div className="text-center py-12">
            <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No moderation history</h3>
            <p className="mt-1 text-sm text-gray-500">
              {history.length === 0 
                ? "No moderation actions have been performed yet."
                : "No actions match your current filters."
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
