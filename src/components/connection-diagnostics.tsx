/**
 * Firestore Connection Diagnostics Component
 * Shows connection status and helps users troubleshoot issues
 */

"use client";

import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';

interface ConnectionStatus {
  healthy: boolean;
  latency?: number;
  error?: string;
  lastChecked: Date;
}

export function ConnectionDiagnostics() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const checkConnection = async () => {
    setIsChecking(true);
    try {
      const response = await fetch('/api/health/firestore');
      const data = await response.json();

      setStatus({
        healthy: data.status === 'healthy',
        latency: data.health?.latency,
        error: data.health?.error,
        lastChecked: new Date(),
      });
    } catch (error: any) {
      setStatus({
        healthy: false,
        error: error.message || 'Failed to check connection',
        lastChecked: new Date(),
      });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const getStatusIcon = () => {
    if (isChecking) return <RefreshCw className="w-4 h-4 animate-spin" />;
    if (status?.healthy) return <CheckCircle className="w-4 h-4 text-green-500" />;
    return <AlertTriangle className="w-4 h-4 text-red-500" />;
  };

  const getStatusColor = () => {
    if (isChecking) return 'text-yellow-600';
    if (status?.healthy) return 'text-green-600';
    return 'text-red-600';
  };

  const getStatusText = () => {
    if (isChecking) return 'Checking connection...';
    if (status?.healthy) return 'Connected';
    return 'Connection issues detected';
  };

  if (!status) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            {showDetails ? 'Hide details' : 'Show details'}
          </button>

          <button
            onClick={checkConnection}
            disabled={isChecking}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            title="Refresh connection status"
          >
            <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {showDetails && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="space-y-2 text-xs text-gray-600">
            <div>
              <strong>Last checked:</strong> {status.lastChecked.toLocaleTimeString()}
            </div>

            {status.latency && (
              <div>
                <strong>Latency:</strong> {status.latency}ms
              </div>
            )}

            {status.error && (
              <div className="text-red-600">
                <strong>Error:</strong> {status.error}
              </div>
            )}

            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
              <div className="flex items-center gap-1 mb-1">
                <Wifi className="w-3 h-3" />
                <strong>Common solutions:</strong>
              </div>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Check your internet connection</li>
                <li>Verify Firebase project is properly configured</li>
                <li>Ensure Firestore security rules allow access</li>
                <li>Check if Firebase project has any billing issues</li>
                <li>Try refreshing the page</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
