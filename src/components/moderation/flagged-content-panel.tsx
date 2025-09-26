"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/FirebaseAuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
  ExclamationTriangleIcon,
  FlagIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserIcon,
  MapPinIcon,
  StarIcon,
  ChatBubbleLeftIcon
} from '@heroicons/react/24/outline';

interface FlaggedContent {
  id: string;
  contentType: 'location' | 'review';
  contentId: string;
  contentTitle: string;
  flagReason: string;
  flagDescription: string;
  reportedBy: string;
  reportedAt: Date;
  status: 'pending' | 'dismissed' | 'upheld';
  moderatorNotes?: string;
  moderatedBy?: string;
  moderatedAt?: Date;
}

export function FlaggedContentPanel() {
  const [flaggedContent, setFlaggedContent] = useState<FlaggedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<FlaggedContent | null>(null);
  const [moderatorNotes, setModeratorNotes] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  const { getIdToken } = useAuth();
  const { success, error } = useToast();

  useEffect(() => {
    fetchFlaggedContent();
  }, []);

  const fetchFlaggedContent = async () => {
    try {
      setLoading(true);
      const token = await getIdToken();
      const response = await fetch('/api/flagged?status=pending', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Handle both possible response structures
        const flaggedItems = data.data || data.flaggedContent || [];
        
        // Ensure flaggedItems is an array before mapping
        if (Array.isArray(flaggedItems)) {
          setFlaggedContent(flaggedItems.map((item: any) => ({
            ...item,
            reportedAt: new Date(item.reportedAt),
            moderatedAt: item.moderatedAt ? new Date(item.moderatedAt) : undefined
          })));
        } else {
          console.warn('Flagged content data is not an array:', flaggedItems);
          setFlaggedContent([]);
        }
      } else {
        error('Failed to fetch flagged content', 'Error');
      }
    } catch (err) {
      console.error('Error fetching flagged content:', err);
      error('Failed to fetch flagged content', 'Error');
      // Set empty array on error to prevent undefined map errors
      setFlaggedContent([]);
    } finally {
      setLoading(false);
    }
  };

  const moderateContent = async (contentId: string, action: 'dismiss' | 'uphold') => {
    try {
      setProcessingId(contentId);
      const token = await getIdToken();
      
      const response = await fetch('/api/flagged', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          flagId: contentId,
          action,
          moderatorNotes: moderatorNotes.trim() || undefined
        })
      });

      if (response.ok) {
        const data = await response.json();
        success(data.message, 'Moderation Complete');
        setModeratorNotes('');
        setSelectedContent(null);
        fetchFlaggedContent(); // Refresh the list
      } else {
        const errorData = await response.json();
        error(errorData.error || 'Failed to moderate content', 'Error');
      }
    } catch (err) {
      console.error('Error moderating content:', err);
      error('Failed to moderate content', 'Error');
    } finally {
      setProcessingId(null);
    }
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'location':
        return MapPinIcon;
      case 'review':
        return StarIcon;
      default:
        return FlagIcon;
    }
  };

  const getReasonColor = (reason: string) => {
    switch (reason.toLowerCase()) {
      case 'inappropriate content':
        return 'bg-red-100 text-red-800';
      case 'spam':
        return 'bg-yellow-100 text-yellow-800';
      case 'fake information':
        return 'bg-orange-100 text-orange-800';
      case 'duplicate':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const FlaggedContentCard = ({ content }: { content: FlaggedContent }) => {
    const ContentIcon = getContentTypeIcon(content.contentType);
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <ContentIcon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{content.contentTitle}</h3>
              <p className="text-sm text-gray-500 capitalize">{content.contentType}</p>
            </div>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getReasonColor(content.flagReason)}`}>
            {content.flagReason}
          </span>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <UserIcon className="w-4 h-4 mr-2" />
            Reported by: {content.reportedBy}
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <ClockIcon className="w-4 h-4 mr-2" />
            {content.reportedAt.toLocaleDateString()} at {content.reportedAt.toLocaleTimeString()}
          </div>
          {content.flagDescription && (
            <div className="flex items-start text-sm text-gray-600">
              <ChatBubbleLeftIcon className="w-4 h-4 mr-2 mt-0.5" />
              <span>{content.flagDescription}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedContent(content)}
            className="text-orange-600 hover:text-orange-700 text-sm font-medium"
          >
            Review Details
          </button>
          <div className="flex space-x-2">
            <button
              onClick={() => moderateContent(content.id, 'dismiss')}
              disabled={processingId === content.id}
              className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-md hover:bg-green-200 disabled:opacity-50"
            >
              Dismiss
            </button>
            <button
              onClick={() => moderateContent(content.id, 'uphold')}
              disabled={processingId === content.id}
              className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-md hover:bg-red-200 disabled:opacity-50"
            >
              Uphold
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ModerationModal = ({ content, onClose }: { content: FlaggedContent; onClose: () => void }) => (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold">Review Flagged Content</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircleIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Content Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Content Details</h4>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Title:</span> {content.contentTitle}</div>
              <div><span className="font-medium">Type:</span> {content.contentType}</div>
              <div><span className="font-medium">ID:</span> {content.contentId}</div>
            </div>
          </div>

          {/* Flag Details */}
          <div className="bg-red-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Flag Details</h4>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Reason:</span> {content.flagReason}</div>
              <div><span className="font-medium">Reported by:</span> {content.reportedBy}</div>
              <div><span className="font-medium">Reported at:</span> {content.reportedAt.toLocaleString()}</div>
              {content.flagDescription && (
                <div><span className="font-medium">Description:</span> {content.flagDescription}</div>
              )}
            </div>
          </div>

          {/* Moderator Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Moderator Notes (Optional)
            </label>
            <textarea
              value={moderatorNotes}
              onChange={(e) => setModeratorNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
              placeholder="Add any notes about your moderation decision..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => moderateContent(content.id, 'dismiss')}
              disabled={processingId === content.id}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              Dismiss Flag
            </button>
            <button
              onClick={() => moderateContent(content.id, 'uphold')}
              disabled={processingId === content.id}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              Uphold Flag
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <FlagIcon className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Flagged Content</h2>
            <p className="text-sm text-gray-500">{flaggedContent.length} items pending review</p>
          </div>
        </div>
      </div>

      {/* Content List */}
      {flaggedContent.length > 0 ? (
        <div className="space-y-4">
          {flaggedContent.map(content => (
            <FlaggedContentCard key={content.id} content={content} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <CheckCircleIcon className="mx-auto h-12 w-12 text-green-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No flagged content</h3>
          <p className="mt-1 text-sm text-gray-500">
            Great job! There are no content flags pending review.
          </p>
        </div>
      )}

      {/* Moderation Modal */}
      {selectedContent && (
        <ModerationModal
          content={selectedContent}
          onClose={() => {
            setSelectedContent(null);
            setModeratorNotes('');
          }}
        />
      )}
    </div>
  );
}
