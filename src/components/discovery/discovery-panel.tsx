"use client";

import React, { useState } from 'react';
import { useAuth } from '@/contexts/FirebaseAuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
  CpuChipIcon,
  MapPinIcon,
  GlobeAltIcon,
  MagnifyingGlassIcon,
  PlayIcon,
  StopIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { BrandLogo } from '@/components/ui/brand-logo';

interface DiscoveryResult {
  totalDiscovered: number;
  savedToDatabase: number;
  duplicatesFound: number;
  errors: number;
  regions: string[];
  duration: number;
}

interface DiscoverySession {
  id: string;
  region: string;
  status: 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  locationsFound: number;
  locationsSaved: number;
  result?: DiscoveryResult;
}

interface EnhancedDiscoveryPanelProps {
  onDiscoveryComplete?: (result: DiscoveryResult) => void;
}

export function EnhancedDiscoveryPanel({ onDiscoveryComplete }: EnhancedDiscoveryPanelProps = {}) {
  const [isRunning, setIsRunning] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('');
  const [discoveryType, setDiscoveryType] = useState<'global' | 'continent' | 'country' | 'state'>('global');
  const [targetQuery, setTargetQuery] = useState('');
  const [sessions, setSessions] = useState<DiscoverySession[]>([]);
  const [currentSession, setCurrentSession] = useState<DiscoverySession | null>(null);
  
  const { getIdToken } = useAuth();
  const { success, error, info } = useToast();

  const availableRegions = {
    continents: ['Americas', 'Europe', 'Africa', 'Asia-Pacific', 'Middle East'],
    countries: {
      'Americas': ['US', 'CA', 'BR', 'MX', 'AR', 'CO', 'VE', 'PE'],
      'Europe': ['GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'SE', 'NO', 'DK'],
      'Africa': ['NG', 'GH', 'SN', 'CI', 'KE', 'ZA', 'BF', 'ML', 'NE', 'TD'],
      'Asia-Pacific': ['AU', 'SG', 'MY', 'JP', 'IN', 'TH', 'PH', 'ID', 'VN', 'KR'],
      'Middle East': ['AE', 'SA', 'QA', 'KW', 'BH', 'OM', 'JO', 'LB']
    },
    states: {
      'US': ['NY', 'CA', 'TX', 'FL', 'IL', 'GA', 'MD', 'VA', 'NJ', 'MA'],
      'CA': ['ON', 'BC', 'AB', 'QC'],
      'GB': ['London', 'Manchester', 'Birmingham', 'Liverpool', 'Leeds'],
      'DE': ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt'],
      'NG': ['Lagos', 'Oyo', 'Ogun', 'Osun', 'Ondo', 'Ekiti', 'Kwara', 'FCT'],
      'GH': ['Greater Accra', 'Ashanti', 'Western', 'Central'],
      'AU': ['NSW', 'VIC', 'QLD', 'WA', 'SA'],
      'IN': ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'Gujarat'],
      'AE': ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman'],
      'SA': ['Riyadh', 'Jeddah', 'Dammam', 'Mecca']
    }
  };

  const startDiscovery = async () => {
    if (isRunning) return;
    
    try {
      setIsRunning(true);
      const startTime = new Date();
      
      const locationContext = getLocationContext();
      
      const session: DiscoverySession = {
        id: `discovery-${Date.now()}`,
        region: locationContext,
        startTime,
        status: 'running',
        locationsFound: 0,
        locationsSaved: 0
      };
      
      setCurrentSession(session);
      setSessions(prev => [session, ...prev]);
      info(`Starting ${locationContext} discovery...`, 'Discovery Started');
      
      const token = await getIdToken();
      const response = await fetch('/api/discovery', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          region: discoveryType === 'continent' ? selectedRegion : undefined,
          country: discoveryType === 'country' || discoveryType === 'state' ? selectedCountry : undefined,
          state: discoveryType === 'state' ? selectedState : undefined,
          continent: discoveryType === 'continent' ? selectedRegion : undefined
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        const result: DiscoveryResult = {
          totalDiscovered: data.data.summary.totalDiscovered,
          savedToDatabase: data.data.summary.savedToDatabase,
          duplicatesFound: data.data.summary.skippedDuplicates,
          errors: data.data.summary.saveErrors?.length || 0,
          regions: [locationContext],
          duration: Date.now() - startTime.getTime()
        };
        
        const completedSession = {
          ...session,
          endTime: new Date(),
          status: 'completed' as const,
          result
        };
        
        setCurrentSession(completedSession);
        setSessions(prev => prev.map(s => s.id === session.id ? completedSession : s));
        
        success(
          `Discovery completed! Found ${result.savedToDatabase} new locations in ${locationContext}.`,
          'Discovery Complete'
        );
        
        // Call the callback if provided
        onDiscoveryComplete?.(result);
      } else {
        throw new Error(data.error || 'Discovery failed');
      }
    } catch (err: any) {
      const failedSession = {
        ...currentSession!,
        endTime: new Date(),
        status: 'failed' as const
      };
      
      setCurrentSession(failedSession);
      setSessions(prev => prev.map(s => s.id === currentSession!.id ? failedSession : s));
      
      error(`Discovery failed: ${err.message}`, 'Discovery Error');
    } finally {
      setIsRunning(false);
    }
  };

  const getLocationContext = () => {
    switch (discoveryType) {
      case 'global':
        return 'Global';
      case 'continent':
        return selectedRegion || 'Unknown Continent';
      case 'country':
        return selectedCountry || 'Unknown Country';
      case 'state':
        return `${selectedState}, ${selectedCountry}` || 'Unknown State';
      default:
        return 'Global';
    }
  };

  const getAvailableCountries = () => {
    if (!selectedRegion) return [];
    return availableRegions.countries[selectedRegion as keyof typeof availableRegions.countries] || [];
  };

  const getAvailableStates = () => {
    if (!selectedCountry) return [];
    return availableRegions.states[selectedCountry as keyof typeof availableRegions.states] || [];
  };

  const isValidSelection = () => {
    switch (discoveryType) {
      case 'continent':
        return !!selectedRegion;
      case 'country':
        return !!selectedCountry;
      case 'state':
        return !!selectedState;
      default:
        return true;
    }
  };

  const DiscoveryTypeCard = ({ 
    type, 
    title, 
    description, 
    icon: Icon, 
    isSelected, 
    onClick 
  }: {
    type: string;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    isSelected: boolean;
    onClick: () => void;
  }) => (
    <div
      onClick={onClick}
      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
        isSelected
          ? 'border-orange-500 bg-orange-50'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-center space-x-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          isSelected ? 'bg-orange-100' : 'bg-gray-100'
        }`}>
          <Icon className={`w-5 h-5 ${isSelected ? 'text-orange-600' : 'text-gray-600'}`} />
        </div>
        <div>
          <h4 className="font-medium text-gray-900">{title}</h4>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
    </div>
  );

  const SessionCard = ({ session }: { session: DiscoverySession }) => {
    const getStatusIcon = () => {
      switch (session.status) {
        case 'running':
          return <ClockIcon className="w-5 h-5 text-blue-600" />;
        case 'completed':
          return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
        case 'failed':
          return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />;
      }
    };

    const getStatusColor = () => {
      switch (session.status) {
        case 'running':
          return 'bg-blue-100 text-blue-800';
        case 'completed':
          return 'bg-green-100 text-green-800';
        case 'failed':
          return 'bg-red-100 text-red-800';
      }
    };

    return (
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
              {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
            </span>
          </div>
          <span className="text-sm text-gray-500">
            {session.startTime.toLocaleTimeString()}
          </span>
        </div>
        
        {session.result && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Discovered:</span>
              <span className="ml-2 font-medium">{session.result.totalDiscovered}</span>
            </div>
            <div>
              <span className="text-gray-500">Saved:</span>
              <span className="ml-2 font-medium text-green-600">{session.result.savedToDatabase}</span>
            </div>
            <div>
              <span className="text-gray-500">Duplicates:</span>
              <span className="ml-2 font-medium text-yellow-600">{session.result.duplicatesFound}</span>
            </div>
            <div>
              <span className="text-gray-500">Duration:</span>
              <span className="ml-2 font-medium">{Math.round(session.result.duration / 1000)}s</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <CpuChipIcon className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">AI-Powered Discovery</h2>
              <p className="text-gray-600">Autonomous location discovery using advanced AI</p>
            </div>
          </div>
          <BrandLogo size="md" />
        </div>
      </div>

      {/* Discovery Types */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Discovery Scope</h3>
        <select
          value={discoveryType}
          onChange={(e) => {
            setDiscoveryType(e.target.value as any);
            setSelectedRegion('');
            setSelectedCountry('');
            setSelectedState('');
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          disabled={isRunning}
        >
          <option value="global">Global Discovery</option>
          <option value="continent">Continent-Specific</option>
          <option value="country">Country-Specific</option>
          <option value="state">State/City-Specific</option>
        </select>

        {discoveryType === 'continent' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Continent
            </label>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              disabled={isRunning}
            >
              <option value="">Choose a continent...</option>
              {availableRegions.continents.map((continent) => (
                <option key={continent} value={continent}>{continent}</option>
              ))}
            </select>
          </div>
        )}

        {(discoveryType === 'country' || discoveryType === 'state') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Continent First
            </label>
            <select
              value={selectedRegion}
              onChange={(e) => {
                setSelectedRegion(e.target.value);
                setSelectedCountry('');
                setSelectedState('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              disabled={isRunning}
            >
              <option value="">Choose a continent...</option>
              {availableRegions.continents.map((continent) => (
                <option key={continent} value={continent}>{continent}</option>
              ))}
            </select>
          </div>
        )}

        {(discoveryType === 'country' || discoveryType === 'state') && selectedRegion && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Country
            </label>
            <select
              value={selectedCountry}
              onChange={(e) => {
                setSelectedCountry(e.target.value);
                setSelectedState('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              disabled={isRunning}
            >
              <option value="">Choose a country...</option>
              {getAvailableCountries().map((country) => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>
        )}

        {discoveryType === 'state' && selectedCountry && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select State/City
            </label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              disabled={isRunning}
            >
              <option value="">Choose a state/city...</option>
              {getAvailableStates().map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Configuration */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Configuration</h3>
        
        {/* Configuration options can be added here for specific discovery types */}

        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-gray-500">
            Target: {getLocationContext()}
          </div>
          <button
            onClick={startDiscovery}
            disabled={isRunning || (discoveryType !== 'global' && !isValidSelection())}
            className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRunning ? (
              <>
                <StopIcon className="w-4 h-4 mr-2" />
                Running...
              </>
            ) : (
              <>
                <PlayIcon className="w-4 h-4 mr-2" />
                Start Discovery
              </>
            )}
          </button>
        </div>
      </div>

      {/* Recent Sessions */}
      {sessions.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Discovery Sessions</h3>
            <div className="flex items-center space-x-2">
              <ChartBarIcon className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-500">{sessions.length} sessions</span>
            </div>
          </div>
          <div className="space-y-3">
            {sessions.slice(0, 5).map(session => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
