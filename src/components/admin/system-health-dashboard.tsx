'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  RefreshCw,
  Server,
  Wifi,
  Zap,
  Cpu,
  HardDrive,
  Shield,
  TestTube,
  Bug,
  ChartBar,
  BoltIcon,
  PlayIcon,
  MonitorStop
} from 'lucide-react';

// Import performance testing utilities
import {
  getPerformanceStatus,
  runCompleteValidation,
  testPerformanceIntegration,
  PERFORMANCE_CONSTANTS,
  PERFORMANCE_STATUS
} from '@/lib/performance/index';

interface SystemHealthData {
  status: 'healthy' | 'warning' | 'error';
  health: {
    latency: number;
    connectivity: boolean;
    database: boolean;
    performance: boolean;
  };
  performance?: {
    status: string;
    optimizations?: any;
    queryBatching?: any;
    metrics?: any;
    lastChecked: string;
    error?: string;
  };
  tests?: {
    running: boolean;
    results: any[];
    lastRun: string;
  };
}

interface PerformanceTestResult {
  testName: string;
  duration: number;
  success: boolean;
  metrics?: any;
  improvement?: string;
}

function SystemHealthDashboard() {
  const [systemHealth, setSystemHealth] = useState<SystemHealthData | null>(null);
  const [isHealthCheckRunning, setIsHealthCheckRunning] = useState(false);
  const [isPerformanceTestRunning, setIsPerformanceTestRunning] = useState(false);
  const [lastHealthCheck, setLastHealthCheck] = useState<Date | null>(null);
  const [performanceResults, setPerformanceResults] = useState<PerformanceTestResult[]>([]);
  const { success, error: showError } = useToast();

  // Run initial health check on component mount
  useEffect(() => {
    runHealthCheck();
  }, []);

  const runHealthCheck = async () => {
    setIsHealthCheckRunning(true);
    try {
      // Basic connectivity and system checks
      const startTime = Date.now();

      // Test API connectivity
      const apiResponse = await fetch('/api/locations?limit=1');
      const apiLatency = Date.now() - startTime;

      // Get performance status
      const performanceStatus = await getPerformanceStatus();

      const healthData: SystemHealthData = {
        status: apiResponse.ok && performanceStatus.status === 'OPERATIONAL' ? 'healthy' : 'error',
        health: {
          latency: apiLatency,
          connectivity: apiResponse.ok,
          database: apiResponse.ok,
          performance: performanceStatus.status === 'OPERATIONAL'
        },
        performance: performanceStatus
      };

      setSystemHealth(healthData);
      setLastHealthCheck(new Date());
      success('System health check completed successfully', 'Health Check');
    } catch (error) {
      console.error('Health check failed:', error);
      setSystemHealth({
        status: 'error',
        health: {
          latency: 0,
          connectivity: false,
          database: false,
          performance: false
        }
      });
      showError('System health check failed', 'Health Check Error');
    } finally {
      setIsHealthCheckRunning(false);
    }
  };

  const runPerformanceTests = async () => {
    setIsPerformanceTestRunning(true);
    setPerformanceResults([]);

    try {
      success('Starting comprehensive performance tests...', 'Performance Testing');

      // Run complete validation suite
      const validationReport = await runCompleteValidation();

      // Convert validation results to test results format
      const testResults: PerformanceTestResult[] = [
        {
          testName: 'API Response Caching',
          duration: validationReport.cacheValidation?.duration || 0,
          success: validationReport.cacheValidation?.success || false,
          metrics: validationReport.cacheValidation?.metrics,
          improvement: validationReport.cacheValidation?.improvement
        },
        {
          testName: 'Database Query Batching',
          duration: validationReport.batchingValidation?.duration || 0,
          success: validationReport.batchingValidation?.success || false,
          metrics: validationReport.batchingValidation?.metrics,
          improvement: validationReport.batchingValidation?.improvement
        },
        {
          testName: 'Memory Cache Performance',
          duration: validationReport.memoryValidation?.duration || 0,
          success: validationReport.memoryValidation?.success || false,
          metrics: validationReport.memoryValidation?.metrics,
          improvement: validationReport.memoryValidation?.improvement
        },
        {
          testName: 'Background Job Processing',
          duration: validationReport.backgroundJobValidation?.duration || 0,
          success: validationReport.backgroundJobValidation?.success || false,
          metrics: validationReport.backgroundJobValidation?.metrics,
          improvement: validationReport.backgroundJobValidation?.improvement
        }
      ];

      setPerformanceResults(testResults);

      // Update system health with test results
      if (systemHealth) {
        setSystemHealth({
          ...systemHealth,
          tests: {
            running: false,
            results: testResults,
            lastRun: new Date().toISOString()
          }
        });
      }

      const successCount = testResults.filter(r => r.success).length;
      const totalTests = testResults.length;

      if (successCount === totalTests) {
        success(`All ${totalTests} performance tests passed!`, 'Performance Testing Complete');
      } else {
        showError(`${totalTests - successCount} of ${totalTests} tests failed`, 'Performance Testing Issues');
      }

    } catch (error) {
      console.error('Performance tests failed:', error);
      showError('Performance testing failed', 'Testing Error');
    } finally {
      setIsPerformanceTestRunning(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'OPERATIONAL':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
      case 'ERROR':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'OPERATIONAL':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
      case 'error':
      case 'ERROR':
        return <AlertTriangle className="w-6 h-6 text-red-600" />;
      default:
        return <Clock className="w-6 h-6 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Health & Performance</h1>
          <p className="text-gray-600 mt-1">Real-time monitoring, performance testing, and system diagnostics</p>
        </div>

        {/* Status and Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${systemHealth?.status === 'healthy' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600 font-medium">
              {systemHealth?.status === 'healthy' ? 'All systems operational' : 'System issues detected'}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={runHealthCheck}
              disabled={isHealthCheckRunning}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isHealthCheckRunning ? 'animate-spin' : ''}`} />
              {isHealthCheckRunning ? 'Running Check...' : 'Health Check'}
            </button>

            <button
              onClick={runPerformanceTests}
              disabled={isPerformanceTestRunning}
              className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPerformanceTestRunning ? (
                <MonitorStop className="w-4 h-4 mr-2 animate-pulse" />
              ) : (
                <PlayIcon className="w-4 h-4 mr-2" />
              )}
              {isPerformanceTestRunning ? 'Testing...' : 'Run Performance Tests'}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Status Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">System Status</p>
              <p className="text-2xl font-bold text-gray-900">
                {systemHealth?.status === 'healthy' ? 'Healthy' :
                  systemHealth?.status === 'error' ? 'Error' : 'Unknown'}
              </p>
            </div>
            <div className={`p-2 rounded-full ${getStatusColor(systemHealth?.status || 'unknown')}`}>
              {getStatusIcon(systemHealth?.status || 'unknown')}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Response Time</p>
              <p className="text-lg font-bold text-gray-900">
                {systemHealth?.health?.latency ? `${systemHealth.health.latency}ms` : 'N/A'}
              </p>
            </div>
            <Zap className="w-6 h-6 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Performance</p>
              <p className="text-lg font-bold text-gray-900">
                {systemHealth?.performance?.status || 'Unknown'}
              </p>
            </div>
            <BoltIcon className="w-6 h-6 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Last Check</p>
              <p className="text-lg font-bold text-gray-900">
                {lastHealthCheck ? lastHealthCheck.toLocaleTimeString() : 'Never'}
              </p>
            </div>
            <Clock className="w-6 h-6 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Performance Test Results */}
      {performanceResults.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <TestTube className="w-5 h-5 mr-2 text-orange-600" />
              Performance Test Results
            </h2>
            <div className="text-sm text-gray-500">
              {performanceResults.filter(r => r.success).length} of {performanceResults.length} tests passed
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {performanceResults.map((result, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{result.testName}</h3>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                    {result.success ? 'PASS' : 'FAIL'}
                  </div>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>Duration: {result.duration}ms</div>
                  {result.improvement && (
                    <div className="text-green-600 font-medium">
                      Improvement: {result.improvement}
                    </div>
                  )}
                  {result.metrics && (
                    <div className="text-xs text-gray-500">
                      {JSON.stringify(result.metrics, null, 2).slice(0, 100)}...
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Health Details */}
      {systemHealth && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">System Health Details</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Health Status */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-blue-600" />
                System Components
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <Wifi className="w-4 h-4 mr-2 text-gray-600" />
                    <span className="text-sm font-medium">API Connectivity</span>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${systemHealth.health.connectivity ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                    {systemHealth.health.connectivity ? 'Connected' : 'Disconnected'}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <Database className="w-4 h-4 mr-2 text-gray-600" />
                    <span className="text-sm font-medium">Database</span>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${systemHealth.health.database ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                    {systemHealth.health.database ? 'Operational' : 'Error'}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <BoltIcon className="w-4 h-4 mr-2 text-gray-600" />
                    <span className="text-sm font-medium">Performance</span>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${systemHealth.health.performance ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                    {systemHealth.health.performance ? 'Optimized' : 'Issues'}
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            {systemHealth.performance && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <ChartBar className="w-5 h-5 mr-2 text-orange-600" />
                  Performance Metrics
                </h3>

                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-900 mb-1">Optimization Status</div>
                    <div className="text-xs text-gray-600">{systemHealth.performance.status}</div>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-900 mb-1">Last Performance Check</div>
                    <div className="text-xs text-gray-600">
                      {new Date(systemHealth.performance.lastChecked).toLocaleString()}
                    </div>
                  </div>

                  {systemHealth.performance.error && (
                    <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="text-sm font-medium text-red-900 mb-1">Performance Error</div>
                      <div className="text-xs text-red-600">{systemHealth.performance.error}</div>
                    </div>
                  )}

                  {systemHealth.performance.metrics && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium text-gray-900 mb-1">Performance Targets</div>
                      <div className="text-xs text-gray-600 space-y-1">
                        <div>Page Load: &lt; {PERFORMANCE_CONSTANTS.PERFORMANCE_TARGET_PAGE_LOAD}ms</div>
                        <div>API Response: &lt; {PERFORMANCE_CONSTANTS.PERFORMANCE_TARGET_API_RESPONSE}ms</div>
                        <div>Cache Hit Rate: &gt; {PERFORMANCE_CONSTANTS.CACHE_HIT_RATE_TARGET}%</div>
                      </div>
                    </div>
                  )}

                  {systemHealth.performance.optimizations && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium text-gray-900 mb-1">Optimization Summary</div>
                      <div className="text-xs text-gray-600">
                        {systemHealth.performance.optimizations.completionRate && (
                          <div>Completion Rate: {systemHealth.performance.optimizations.completionRate}</div>
                        )}
                        {systemHealth.performance.optimizations.overallImprovement && (
                          <div>Overall Improvement: {systemHealth.performance.optimizations.overallImprovement}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SystemHealthDashboard;
