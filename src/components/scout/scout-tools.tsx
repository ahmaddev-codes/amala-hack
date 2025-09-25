"use client";

import React, { useState } from 'react';
import { useAuth } from '@/contexts/FirebaseAuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
  MapPinIcon,
  CameraIcon,
  DevicePhoneMobileIcon,
  QrCodeIcon,
  ShareIcon,
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  StarIcon,
  PhotoIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { BrandLogo } from '@/components/ui/brand-logo';

interface ScoutTool {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'mobile' | 'web' | 'analysis' | 'reporting';
  status: 'available' | 'coming-soon' | 'beta';
  action?: () => void;
}

export function ScoutTools() {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedTool, setSelectedTool] = useState<ScoutTool | null>(null);
  const { user } = useAuth();
  const { success, info, error } = useToast();

  const scoutTools: ScoutTool[] = [
    {
      id: 'location-finder',
      name: 'Location Finder',
      description: 'AI-powered location discovery and verification tool',
      icon: MapPinIcon,
      category: 'mobile',
      status: 'available',
      action: () => info('Opening location finder...', 'Tool Launch')
    },
    {
      id: 'photo-validator',
      name: 'Photo Validator',
      description: 'Verify and enhance location photos with AI',
      icon: PhotoIcon,
      category: 'mobile',
      status: 'available',
      action: () => info('Opening photo validator...', 'Tool Launch')
    },
    {
      id: 'qr-generator',
      name: 'QR Code Generator',
      description: 'Generate QR codes for easy location sharing',
      icon: QrCodeIcon,
      category: 'mobile',
      status: 'available',
      action: () => generateQRCode()
    },
    {
      id: 'mobile-app',
      name: 'Scout Mobile App',
      description: 'Dedicated mobile app for field scouting',
      icon: DevicePhoneMobileIcon,
      category: 'mobile',
      status: 'coming-soon'
    },
    {
      id: 'batch-upload',
      name: 'Batch Upload',
      description: 'Upload multiple locations at once',
      icon: ClipboardDocumentListIcon,
      category: 'web',
      status: 'beta',
      action: () => info('Opening batch upload...', 'Tool Launch')
    },
    {
      id: 'duplicate-checker',
      name: 'Duplicate Checker',
      description: 'Check for duplicate locations before submission',
      icon: MagnifyingGlassIcon,
      category: 'analysis',
      status: 'available',
      action: () => info('Opening duplicate checker...', 'Tool Launch')
    },
    {
      id: 'quality-analyzer',
      name: 'Quality Analyzer',
      description: 'Analyze submission quality and get improvement tips',
      icon: StarIcon,
      category: 'analysis',
      status: 'available',
      action: () => info('Opening quality analyzer...', 'Tool Launch')
    },
    {
      id: 'performance-report',
      name: 'Performance Report',
      description: 'Generate detailed performance and impact reports',
      icon: DocumentTextIcon,
      category: 'reporting',
      status: 'available',
      action: () => generatePerformanceReport()
    },
    {
      id: 'social-share',
      name: 'Social Sharing',
      description: 'Share discoveries on social media platforms',
      icon: ShareIcon,
      category: 'web',
      status: 'beta',
      action: () => info('Opening social sharing...', 'Tool Launch')
    }
  ];

  const categories = [
    { id: 'all', name: 'All Tools', count: scoutTools.length },
    { id: 'mobile', name: 'Mobile Tools', count: scoutTools.filter(t => t.category === 'mobile').length },
    { id: 'web', name: 'Web Tools', count: scoutTools.filter(t => t.category === 'web').length },
    { id: 'analysis', name: 'Analysis', count: scoutTools.filter(t => t.category === 'analysis').length },
    { id: 'reporting', name: 'Reporting', count: scoutTools.filter(t => t.category === 'reporting').length }
  ];

  const generateQRCode = () => {
    const scoutUrl = `${window.location.origin}/scout?ref=${user?.email}`;
    navigator.clipboard.writeText(scoutUrl);
    success('Scout referral URL copied to clipboard!', 'QR Generated');
  };

  const generatePerformanceReport = () => {
    info('Generating your performance report...', 'Report Generation');
    // In a real app, this would generate and download a PDF report
    setTimeout(() => {
      success('Performance report generated successfully!', 'Report Ready');
    }, 2000);
  };

  const filteredTools = activeCategory === 'all' 
    ? scoutTools 
    : scoutTools.filter(tool => tool.category === activeCategory);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircleIcon className="w-3 h-3 mr-1" />
            Available
          </span>
        );
      case 'beta':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
            Beta
          </span>
        );
      case 'coming-soon':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Coming Soon
          </span>
        );
      default:
        return null;
    }
  };

  const ToolCard = ({ tool }: { tool: ScoutTool }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <tool.icon className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{tool.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{tool.description}</p>
          </div>
        </div>
        {getStatusBadge(tool.status)}
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 uppercase tracking-wide">
          {tool.category.replace('-', ' ')}
        </span>
        {tool.status === 'available' && tool.action && (
          <button
            onClick={tool.action}
            className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 transition-colors"
          >
            Launch Tool
          </button>
        )}
        {tool.status === 'beta' && tool.action && (
          <button
            onClick={tool.action}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Beta
          </button>
        )}
        {tool.status === 'coming-soon' && (
          <button
            disabled
            className="px-4 py-2 bg-gray-100 text-gray-400 text-sm font-medium rounded-md cursor-not-allowed"
          >
            Coming Soon
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <MagnifyingGlassIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Scout Toolkit</h2>
              <p className="text-gray-600">Professional tools for location discovery and verification</p>
            </div>
          </div>
          <BrandLogo size="md" />
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Tool Categories</h3>
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeCategory === category.id
                  ? 'bg-orange-100 text-orange-700 border border-orange-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.name}
              <span className="ml-2 text-xs opacity-75">({category.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTools.map(tool => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => window.open('/', '_blank')}
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <MapPinIcon className="w-6 h-6 text-orange-600" />
            <div className="text-left">
              <div className="font-medium">Submit Location</div>
              <div className="text-sm text-gray-500">Add new location</div>
            </div>
          </button>
          
          <button
            onClick={generateQRCode}
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <QrCodeIcon className="w-6 h-6 text-blue-600" />
            <div className="text-left">
              <div className="font-medium">Generate QR</div>
              <div className="text-sm text-gray-500">Share scout link</div>
            </div>
          </button>
          
          <button
            onClick={() => info('Opening camera tool...', 'Tool Launch')}
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <CameraIcon className="w-6 h-6 text-green-600" />
            <div className="text-left">
              <div className="font-medium">Photo Tool</div>
              <div className="text-sm text-gray-500">Capture & verify</div>
            </div>
          </button>
          
          <button
            onClick={generatePerformanceReport}
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <DocumentTextIcon className="w-6 h-6 text-purple-600" />
            <div className="text-left">
              <div className="font-medium">Get Report</div>
              <div className="text-sm text-gray-500">Performance data</div>
            </div>
          </button>
        </div>
      </div>

      {/* Tips & Best Practices */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Scout Tips & Best Practices</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <CheckCircleIcon className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <div className="font-medium text-gray-900">Verify Information</div>
                <div className="text-sm text-gray-600">Always double-check location details and opening hours</div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircleIcon className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <div className="font-medium text-gray-900">Quality Photos</div>
                <div className="text-sm text-gray-600">Take clear, well-lit photos from multiple angles</div>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <CheckCircleIcon className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <div className="font-medium text-gray-900">Complete Profiles</div>
                <div className="text-sm text-gray-600">Fill out all available fields for better approval rates</div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircleIcon className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <div className="font-medium text-gray-900">Check for Duplicates</div>
                <div className="text-sm text-gray-600">Use the duplicate checker before submitting</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
