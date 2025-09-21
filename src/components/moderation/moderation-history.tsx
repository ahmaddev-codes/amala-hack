"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/FirebaseAuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  FlagIcon,
  UserIcon,
  MapPinIcon,
  StarIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

interface ModerationAction {
  id: string;
  actionType: 'approve' | 'reject' | 'flag_dismiss' | 'flag_uphold';
  contentType: 'location' | 'review' | 'flagged_content';
  contentId: string;
  contentTitle: string;
  moderatorEmail: string;
  moderatorNotes?: string;
  timestamp: Date;
  metadata?: {
    previousStatus?: string;
    newStatus?: string;
    flagReason?: string;
  };
}

export function ModerationHistory() {
  const [actions, setActions] = useState<ModerationAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('7'); // days
  
  const { getIdToken } = useAuth();
  const { error } = useToast();

  useEffect(() => {
    fetchModerationHistory();
  }, [dateRange]);

  const fetchModerationHistory = async () => {
    try {
      setLoading(true);
      const token = await getIdToken();
      const response = await fetch(`/api/moderation/history?days=${dateRange}&limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const historyData = data.data || [];
        setActions(historyData.map((action: any) => ({
          ...action,
          timestamp: new Date(action.timestamp)
        })));
      } else {
        error('Failed to fetch moderation history', 'Error');
      }
    } catch (err) {
      console.error('Error fetching moderation history:', err);
      error('Failed to fetch moderation history', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'approve':
        return CheckCircleIcon;
      case 'reject':
        return XCircleIcon;
      case 'flag_dismiss':
      case 'flag_uphold':
        return FlagIcon;
      default:
        return DocumentTextIcon;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'approve':
        return 'text-green-600 bg-green-100';
      case 'reject':
        return 'text-red-600 bg-red-100';
      case 'flag_dismiss':
        return 'text-blue-600 bg-blue-100';
      case 'flag_uphold':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getContentTypeIcon = (contentType: string) => {
    switch (contentType) {
      case 'location':
        return MapPinIcon;
      case 'review':
        return StarIcon;
      case 'flagged_content':
        return FlagIcon;
      default:
        return DocumentTextIcon;
    }
  };

  const formatActionType = (actionType: string) => {
    switch (actionType) {
      case 'approve':
        return 'Approved';
      case 'reject':
        return 'Rejected';
      case 'flag_dismiss':
        return 'Flag Dismissed';
      case 'flag_uphold':
        return 'Flag Upheld';
      default:
        return actionType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const filteredActions = actions.filter(action => {
    const matchesType = filterType === 'all' || action.actionType === filterType;
    const matchesSearch = searchTerm === '' || 
      action.contentTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      action.moderatorEmail.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const ActionCard = ({ action }: { action: ModerationAction }) => {
    const ActionIcon = getActionIcon(action.actionType);
    const ContentIcon = getContentTypeIcon(action.contentType);
    const actionColor = getActionColor(action.actionType);

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${actionColor}`}>
              <ActionIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{action.contentTitle}</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <ContentIcon className="w-4 h-4" />
                <span className="capitalize">{action.contentType.replace('_', ' ')}</span>
                <span>•</span>
                <span>{formatActionType(action.actionType)}</span>
              </div>
            </div>
          </div>
          <div className="text-right text-sm text-gray-500">
            <div>{action.timestamp.toLocaleDateString()}</div>
            <div>{action.timestamp.toLocaleTimeString()}</div>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <UserIcon className="w-4 h-4 mr-2" />
            Moderator: {action.moderatorEmail}
          </div>
          
          {action.metadata?.flagReason && (
            <div className="flex items-center text-sm text-gray-600">
              <FlagIcon className="w-4 h-4 mr-2" />
              Flag reason: {action.metadata.flagReason}
            </div>
          )}
          
          {action.metadata?.previousStatus && action.metadata?.newStatus && (
            <div className="flex items-center text-sm text-gray-600">
              <ClockIcon className="w-4 h-4 mr-2" />
              Status: {action.metadata.previousStatus} → {action.metadata.newStatus}
            </div>
          )}
        </div>

        {action.moderatorNotes && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm font-medium text-gray-700 mb-1">Moderator Notes:</div>
            <div className="text-sm text-gray-600">{action.moderatorNotes}</div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-48"></div>
                <div className="h-3 bg-gray-200 rounded w-32"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded w-full"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <ClockIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Moderation History</h2>
              <p className="text-sm text-gray-500">{filteredActions.length} actions in the last {dateRange} days</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="all">All Actions</option>
              <option value="approve">Approvals</option>
              <option value="reject">Rejections</option>
              <option value="flag_dismiss">Flag Dismissals</option>
              <option value="flag_uphold">Flag Upholds</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="1">Last 24 hours</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by content or moderator..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Actions List */}
      {filteredActions.length > 0 ? (
        <div className="space-y-4">
          {filteredActions.map(action => (
            <ActionCard key={action.id} action={action} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No moderation history</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || filterType !== 'all' 
              ? 'No actions match your current filters.' 
              : 'No moderation actions have been performed yet.'}
          </p>
        </div>
      )}

      {/* Summary Stats */}
      {actions.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {actions.filter(a => a.actionType === 'approve').length}
              </div>
              <div className="text-sm text-gray-500">Approvals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {actions.filter(a => a.actionType === 'reject').length}
              </div>
              <div className="text-sm text-gray-500">Rejections</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {actions.filter(a => a.actionType === 'flag_dismiss').length}
              </div>
              <div className="text-sm text-gray-500">Flags Dismissed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {actions.filter(a => a.actionType === 'flag_uphold').length}
              </div>
              <div className="text-sm text-gray-500">Flags Upheld</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
