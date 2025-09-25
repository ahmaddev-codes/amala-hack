"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/FirebaseAuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
  UserIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  UserPlusIcon,
  PencilIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import {
  UserIcon as UserSolid,
  ShieldCheckIcon as ShieldSolid,
  StarIcon as StarSolid,
} from '@heroicons/react/24/solid';

interface User {
  id: string;
  email: string;
  displayName?: string;
  roles: string[];
  createdAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
  provider: 'email' | 'google';
  submissionCount: number;
  approvalRate: number;
  level: 'Beginner' | 'Explorer' | 'Expert' | 'Master';
}

interface UserFilters {
  search: string;
  role: string;
  provider: string;
  status: string;
  dateRange: string;
  sortBy: string;
}

interface ApiUser {
  email: string;
  displayName?: string;
  name?: string;
  roles: string[];
  createdAt: string;
  lastLoginAt?: string;
  provider?: 'email' | 'google';
}

function UserManagement() {
  const { getIdToken } = useAuth();
  const { success, error } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    role: '',
    provider: '',
    status: '',
    dateRange: '',
    sortBy: 'createdAt-desc'
  });

  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    newUsersThisWeek: 0,
    averageApprovalRate: 0,
    topContributors: 0,
  });

  // Fetch all users from the system
  useEffect(() => {
    fetchUsers();
  }, []);

  // Apply filters whenever filters or users change
  useEffect(() => {
    applyFilters();
  }, [filters, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const idToken = await getIdToken();

      if (!idToken) {
        throw new Error('Authentication required');
      }

      // Fetch all users from user management API
      const response = await fetch('/api/users/manage', {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      const usersData = data.users || [];

      // Enhance user data with analytics
      const enhancedUsers = await Promise.all(
        usersData.map(async (user: ApiUser) => {
          const userAnalytics = await fetchUserAnalytics(user.email);
          return {
            id: user.email, // Use email as ID for consistency
            email: user.email,
            displayName: user.displayName || user.name,
            roles: user.roles || ['user'],
            isActive: true, // Default to active
            provider: user.provider || 'email',
            submissionCount: userAnalytics.submissions,
            approvalRate: userAnalytics.approvalRate,
            level: calculateUserLevel(userAnalytics.submissions, userAnalytics.approvalRate),
            createdAt: new Date(user.createdAt || Date.now()),
            lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : undefined,
          };
        })
      );

      setUsers(enhancedUsers);
      calculateStats(enhancedUsers);
    } catch (err: unknown) {
      console.error('Error fetching users:', err);
      error('Failed to load users', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserAnalytics = async (userId: string) => {
    try {
      const idToken = await getIdToken();
      const response = await fetch(`/api/analytics/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.error('Error fetching user analytics:', err);
    }

    return { submissions: 0, approvalRate: 0 };
  };

  const calculateUserLevel = (submissions: number, approvalRate: number): User['level'] => {
    const score = submissions * (approvalRate / 100);
    if (score >= 50) return 'Master';
    if (score >= 20) return 'Expert';
    if (score >= 5) return 'Explorer';
    return 'Beginner';
  };

  const calculateStats = (usersData: User[]) => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const stats = {
      totalUsers: usersData.length,
      activeUsers: usersData.filter(u => u.isActive).length,
      newUsersThisWeek: usersData.filter(u => u.createdAt >= oneWeekAgo).length,
      averageApprovalRate: usersData.reduce((sum, u) => sum + u.approvalRate, 0) / usersData.length || 0,
      topContributors: usersData.filter(u => u.submissionCount >= 10).length,
    };

    setStats(stats);
  };

  const applyFilters = () => {
    let filtered = [...users];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(searchLower) ||
        user.displayName?.toLowerCase().includes(searchLower) ||
        user.id.includes(searchLower)
      );
    }

    // Role filter
    if (filters.role) {
      filtered = filtered.filter(user => user.roles.includes(filters.role));
    }

    // Provider filter
    if (filters.provider) {
      filtered = filtered.filter(user => user.provider === filters.provider);
    }

    // Status filter
    if (filters.status) {
      if (filters.status === 'active') {
        filtered = filtered.filter(user => user.isActive);
      } else if (filters.status === 'inactive') {
        filtered = filtered.filter(user => !user.isActive);
      }
    }

    // Date range filter
    if (filters.dateRange) {
      const now = new Date();
      const cutoffDate = new Date();
      
      switch (filters.dateRange) {
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
      
      filtered = filtered.filter(user => user.createdAt >= cutoffDate);
    }

    // Sort
    const [sortField, sortDirection] = filters.sortBy.split('-');
    filtered.sort((a, b) => {
      let aVal: string | number | Date, bVal: string | number | Date;
      
      switch (sortField) {
        case 'name':
          aVal = a.displayName || a.email;
          bVal = b.displayName || b.email;
          break;
        case 'email':
          aVal = a.email;
          bVal = b.email;
          break;
        case 'createdAt':
          aVal = a.createdAt;
          bVal = b.createdAt;
          break;
        case 'submissions':
          aVal = a.submissionCount;
          bVal = b.submissionCount;
          break;
        case 'approvalRate':
          aVal = a.approvalRate;
          bVal = b.approvalRate;
          break;
        default:
          aVal = a.createdAt;
          bVal = b.createdAt;
      }

      if (sortDirection === 'desc') {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      } else {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      }
    });

    setFilteredUsers(filtered);
  };

  const handleRoleChange = async (userId: string, newRole: string, action: 'add' | 'remove') => {
    try {
      const idToken = await getIdToken();

      if (!idToken) {
        error('Authentication required', 'Error');
        return;
      }

      const response = await fetch('/api/users/manage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userId, // API expects email, not userId
          role: newRole,
          action,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user role');
      }

      success(`User role ${action === 'add' ? 'added' : 'removed'} successfully`, 'Success');
      await fetchUsers(); // Refresh the user list
    } catch (err: unknown) {
      console.error('Error updating user role:', err);
      error('Failed to update user role', 'Error');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'mod': return 'bg-purple-100 text-purple-800';
      case 'scout': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLevelIcon = (level: User['level']) => {
    switch (level) {
      case 'Master': return <StarSolid className="w-4 h-4 text-yellow-500" />;
      case 'Expert': return <ShieldSolid className="w-4 h-4 text-purple-500" />;
      case 'Explorer': return <UserSolid className="w-4 h-4 text-blue-500" />;
      default: return <UserIcon className="w-4 h-4 text-gray-500" />;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        <span className="ml-3 text-gray-600">Loading users...</span>
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
              <UserIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Users</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.activeUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UserPlusIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">New This Week</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.newUsersThisWeek}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <StarSolid className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg Approval Rate</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.averageApprovalRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ShieldSolid className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Top Contributors</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.topContributors}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-medium text-gray-900">User Management</h3>
            <div className="mt-4 sm:mt-0 flex items-center space-x-3">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
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
              <select
                value={filters.role}
                onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="mod">Moderator</option>
                <option value="scout">Scout</option>
                <option value="user">User</option>
              </select>

              <select
                value={filters.provider}
                onChange={(e) => setFilters(prev => ({ ...prev, provider: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">All Providers</option>
                <option value="email">Email</option>
                <option value="google">Google</option>
              </select>

              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <select
                value={filters.dateRange}
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">All Time</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>

              <select
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="submissions-desc">Most Submissions</option>
                <option value="approvalRate-desc">Highest Approval Rate</option>
              </select>
            </div>
          )}
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Roles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stats
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                          <UserIcon className="h-6 w-6 text-orange-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.displayName || 'No Name'}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        <div className="text-xs text-gray-400">
                          {user.provider === 'google' ? '🔗 Google' : '📧 Email'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <span
                          key={role}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(role)}`}
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getLevelIcon(user.level)}
                      <span className="ml-2 text-sm text-gray-900">{user.level}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div>{user.submissionCount} submissions</div>
                      <div className="text-xs text-gray-500">{user.approvalRate.toFixed(1)}% approved</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.isActive 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                      }`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      {/* Scout Role Toggle */}
                      {!user.roles.includes('scout') ? (
                        <button
                          onClick={() => handleRoleChange(user.email, 'scout', 'add')}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200"
                          title="Assign Scout Role"
                        >
                          + Scout
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRoleChange(user.email, 'scout', 'remove')}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200"
                          title="Remove Scout Role"
                        >
                          - Scout
                        </button>
                      )}

                      {/* Moderator Role Toggle */}
                      {!user.roles.includes('mod') ? (
                        <button
                          onClick={() => handleRoleChange(user.email, 'mod', 'add')}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-purple-700 bg-purple-100 rounded hover:bg-purple-200"
                          title="Assign Moderator Role"
                        >
                          + Mod
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRoleChange(user.email, 'mod', 'remove')}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200"
                          title="Remove Moderator Role"
                        >
                          - Mod
                        </button>
                      )}

                      {/* Admin Role Toggle */}
                      {!user.roles.includes('admin') ? (
                        <button
                          onClick={() => handleRoleChange(user.email, 'admin', 'add')}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200"
                          title="Assign Admin Role"
                        >
                          + Admin
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRoleChange(user.email, 'admin', 'remove')}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                          title="Remove Admin Role"
                        >
                          - Admin
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserManagement;
