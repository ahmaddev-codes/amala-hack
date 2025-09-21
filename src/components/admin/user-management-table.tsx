"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/FirebaseAuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
  UsersIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import { BrandLogo } from '@/components/ui/brand-logo';

interface User {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

const roleColors = {
  user: 'bg-gray-100 text-gray-800',
  scout: 'bg-blue-100 text-blue-800',
  mod: 'bg-yellow-100 text-yellow-800',
  admin: 'bg-red-100 text-red-800'
};

const roleIcons = {
  user: UsersIcon,
  scout: MagnifyingGlassIcon,
  mod: ShieldCheckIcon,
  admin: CogIcon
};

export function UserManagementTable() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const { getIdToken } = useAuth();
  const { success, error, warning } = useToast();

  // Debug: Log component render
  console.log('UserManagementTable rendered at:', new Date().toISOString());

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = await getIdToken();
      const response = await fetch('/api/users/roles', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Remove duplicates by email and ensure unique users
        const uniqueUsers = data.users.reduce((acc: any[], user: any) => {
          const existingIndex = acc.findIndex(u => u.email === user.email);
          if (existingIndex >= 0) {
            // Update existing user with latest data
            acc[existingIndex] = {
              ...user,
              createdAt: new Date(user.createdAt),
              updatedAt: new Date(user.updatedAt),
              lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : undefined
            };
          } else {
            // Add new user
            acc.push({
              ...user,
              createdAt: new Date(user.createdAt),
              updatedAt: new Date(user.updatedAt),
              lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : undefined
            });
          }
          return acc;
        }, []);
        
        setUsers(uniqueUsers);
      } else {
        error('Failed to fetch users', 'Error');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      error('Failed to fetch users', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (email: string, role: string, add: boolean) => {
    try {
      const token = await getIdToken();
      const response = await fetch('/api/users/roles', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          role,
          action: add ? 'add' : 'remove'
        })
      });

      if (response.ok) {
        const data = await response.json();
        success(data.message, 'Role Updated');
        
        // Update the user in the local state immediately
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.email === email 
              ? { 
                  ...user, 
                  roles: add 
                    ? [...new Set([...user.roles, role])] // Add role, avoid duplicates
                    : user.roles.filter(r => r !== role), // Remove role
                  updatedAt: new Date()
                }
              : user
          )
        );
        
        // Update selected user if it's the one being modified
        if (selectedUser && selectedUser.email === email) {
          setSelectedUser(prev => prev ? {
            ...prev,
            roles: add 
              ? [...new Set([...prev.roles, role])]
              : prev.roles.filter(r => r !== role),
            updatedAt: new Date()
          } : null);
        }
        
        // Also refresh the full list to ensure consistency
        setTimeout(() => fetchUsers(), 500);
      } else {
        const errorData = await response.json();
        if (errorData.error?.includes('not found') || errorData.error?.includes('does not exist')) {
          error('User must be registered on the platform before assigning roles', 'User Not Found');
        } else {
          error(errorData.error || 'Failed to update role', 'Error');
        }
      }
    } catch (err) {
      console.error('Error updating role:', err);
      error('Failed to update role', 'Error');
    }
  };

  const addNewUserRole = async (email: string, role: string) => {
    try {
      // First check if user exists by trying to fetch their data
      const token = await getIdToken();
      
      // Validate user exists by checking if they're in our system
      const checkResponse = await fetch(`/api/users/roles?search=${encodeURIComponent(email)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        const existingUser = checkData.users?.find((u: User) => u.email.toLowerCase() === email.toLowerCase());
        
        if (!existingUser) {
          warning(
            'User must first register on the platform before roles can be assigned. Please ask them to sign up first.',
            'User Not Registered'
          );
          return;
        }
        
        // User exists, proceed with role assignment
        await updateUserRole(email, role, true);
        setShowAddUserModal(false);
      } else {
        error('Failed to validate user existence', 'Error');
      }
    } catch (err) {
      console.error('Error adding user role:', err);
      error('Failed to add user role', 'Error');
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const RoleBadge = ({ role }: { role: string }) => {
    const Icon = roleIcons[role as keyof typeof roleIcons] || UsersIcon;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[role as keyof typeof roleColors] || roleColors.user}`}>
        <Icon className="w-3 h-3 mr-1" />
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  const RoleModal = ({ user, onClose }: { user: User; onClose: () => void }) => {
    const availableRoles = [
      { key: 'scout', label: 'Scout', description: 'Can discover and submit locations' },
      { key: 'mod', label: 'Moderator', description: 'Can moderate content and approve locations' },
      { key: 'admin', label: 'Admin', description: 'Full system access and user management' }
    ];
    
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Manage Roles</h3>
                <p className="text-sm text-gray-500 mt-1">{user.email}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <XCircleIcon className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Default User Role */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                    <UsersIcon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">User</span>
                    <p className="text-xs text-gray-500">Default role for all registered users</p>
                  </div>
                </div>
                <div className="flex items-center text-green-600">
                  <CheckCircleIcon className="w-5 h-5" />
                  <span className="text-sm font-medium ml-1">Active</span>
                </div>
              </div>
              
              {/* Additional Roles */}
              {availableRoles.map(role => {
                const hasRole = user.roles.includes(role.key);
                const Icon = roleIcons[role.key as keyof typeof roleIcons];
                
                return (
                  <div key={role.key} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                        hasRole ? 'bg-orange-100' : 'bg-gray-100'
                      }`}>
                        <Icon className={`w-5 h-5 ${
                          hasRole ? 'text-orange-600' : 'text-gray-600'
                        }`} />
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">{role.label}</span>
                        <p className="text-xs text-gray-500">{role.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => updateUserRole(user.email, role.key, !hasRole)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        hasRole
                          ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200'
                      }`}
                    >
                      {hasRole ? 'Remove' : 'Add'}
                    </button>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <UsersIcon className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
              <p className="text-sm text-gray-500">Manage user roles and permissions</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAddUserModal(true)}
              className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
            >
              <UserPlusIcon className="w-4 h-4 mr-2" />
              Add User Role
            </button>
            <div className="flex items-center space-x-2">
              <BrandLogo size="sm" variant="icon" />
              <span className="text-sm text-gray-500">{users.length} users</span>
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users by email or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Roles
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Updated
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={`${user.email}-${user.updatedAt?.getTime()}`} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{user.email}</div>
                    {user.displayName && (
                      <div className="text-sm text-gray-500">{user.displayName}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-wrap gap-1">
                    {user.roles.map((role) => (
                      <RoleBadge key={role} role={role} />
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.createdAt.toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.updatedAt.toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => {
                      setSelectedUser(user);
                      setShowRoleModal(true);
                    }}
                    className="text-orange-600 hover:text-orange-900 flex items-center"
                  >
                    <CogIcon className="w-4 h-4 mr-1" />
                    Manage Roles
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'Try adjusting your search terms.' : 'Users will appear here once they register.'}
          </p>
        </div>
      )}

      {showRoleModal && selectedUser && (
        <RoleModal
          user={selectedUser}
          onClose={() => {
            setShowRoleModal(false);
            setSelectedUser(null);
          }}
        />
      )}

      {showAddUserModal && (
        <AddUserModal
          onClose={() => setShowAddUserModal(false)}
          onAddUser={addNewUserRole}
        />
      )}
    </div>
  );
}

const AddUserModal: React.FC<{
  onClose: () => void;
  onAddUser: (email: string, role: string) => Promise<void>;
}> = ({ onClose, onAddUser }) => {
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('scout');
  const [isLoading, setIsLoading] = useState(false);

  const roles = [
    { key: 'scout', label: 'Scout', description: 'Can discover and submit locations', icon: MagnifyingGlassIcon },
    { key: 'mod', label: 'Moderator', description: 'Can moderate content and approve locations', icon: ShieldCheckIcon },
    { key: 'admin', label: 'Admin', description: 'Full system access and user management', icon: CogIcon }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    try {
      await onAddUser(email.trim().toLowerCase(), selectedRole);
      setEmail('');
      setSelectedRole('scout');
      onClose();
    } catch (err) {
      console.error('Error adding user:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Add User Role</h3>
              <p className="text-sm text-gray-500 mt-1">Assign additional roles to existing users</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <XCircleIcon className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                User Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="user@example.com"
                required
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                User must already be registered on the platform
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Role to Assign
              </label>
              <div className="space-y-3">
                {roles.map((role) => {
                  const Icon = role.icon;
                  return (
                    <label
                      key={role.key}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedRole === role.key
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={role.key}
                        checked={selectedRole === role.key}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="sr-only"
                      />
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                        selectedRole === role.key ? 'bg-orange-100' : 'bg-gray-100'
                      }`}>
                        <Icon className={`w-5 h-5 ${
                          selectedRole === role.key ? 'text-orange-600' : 'text-gray-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{role.label}</div>
                        <div className="text-xs text-gray-500">{role.description}</div>
                      </div>
                      {selectedRole === role.key && (
                        <CheckCircleIcon className="w-5 h-5 text-orange-600" />
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading || !email.trim()}
              >
                {isLoading ? 'Adding...' : 'Add Role'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
