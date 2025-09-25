'use client';

import React, { useState, useEffect } from 'react';
import { NetworkChecker } from '@/lib/utils/network-checker';
import { WifiIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface NetworkStatusProps {
  showWhenOnline?: boolean;
  className?: string;
}

export function NetworkStatus({ showWhenOnline = false, className = '' }: NetworkStatusProps) {
  const [networkStatus, setNetworkStatus] = useState<{
    connected: boolean;
    message: string;
    suggestions: string[];
  } | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkNetwork = async () => {
      try {
        const status = await NetworkChecker.getNetworkStatus();
        if (mounted) {
          setNetworkStatus(status);
          setIsVisible(!status.connected || showWhenOnline);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Network status check failed:', error);
        if (mounted) {
          setNetworkStatus({
            connected: false,
            message: "Unable to check network status",
            suggestions: ["Please check your internet connection"]
          });
          setIsVisible(true);
          setIsLoading(false);
        }
      }
    };

    // Initial check
    checkNetwork();

    // Listen for network changes
    const unsubscribe = NetworkChecker.addListener((online) => {
      if (mounted) {
        if (online) {
          // Re-check connectivity when coming back online
          checkNetwork();
        } else {
          setNetworkStatus({
            connected: false,
            message: "No internet connection",
            suggestions: ["Check your internet connection and try again"]
          });
          setIsVisible(true);
        }
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [showWhenOnline]);

  if (isLoading || !networkStatus || !isVisible) {
    return null;
  }

  const { connected, message, suggestions } = networkStatus;

  return (
    <div className={`rounded-lg border p-4 ${className} ${
      connected 
        ? 'bg-green-50 border-green-200 text-green-800' 
        : 'bg-red-50 border-red-200 text-red-800'
    }`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {connected ? (
            <CheckCircleIcon className="h-5 w-5 text-green-600" />
          ) : (
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
          )}
        </div>
        
        <div className="flex-1">
          <h3 className="text-sm font-medium">
            {connected ? 'Network Connected' : 'Network Issue'}
          </h3>
          <p className="text-sm mt-1 opacity-90">
            {message}
          </p>
          
          {suggestions.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium mb-2">Suggestions:</p>
              <ul className="text-sm space-y-1 list-disc list-inside opacity-90">
                {suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function NetworkStatusBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetworkChecker.addListener((online) => {
      setIsOffline(!online);
    });

    // Initial check
    setIsOffline(!NetworkChecker.isConnected());

    return unsubscribe;
  }, []);

  if (!isOffline) {
    return null;
  }

  return (
    <div className="bg-red-600 text-white px-4 py-2 text-center text-sm">
      <div className="flex items-center justify-center space-x-2">
        <WifiIcon className="h-4 w-4" />
        <span>You are currently offline. Some features may not work properly.</span>
      </div>
    </div>
  );
}
