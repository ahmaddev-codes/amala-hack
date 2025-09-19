"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useToast } from "@/contexts/ToastContext";
import { Person as User, Logout as SignOut } from "@mui/icons-material";

export function MapUserProfile() {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showHoverText, setShowHoverText] = useState(false);
  const { user, signOut, isLoading, canAdmin, canModerate } = useAuth();
  const { info } = useToast();

  if (isLoading) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      {user ? (
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            onMouseEnter={() => setShowHoverText(true)}
            onMouseLeave={() => setShowHoverText(false)}
            className="w-10 h-10 bg-white rounded-full shadow-lg border-2 border-red-500 hover:shadow-xl transition-all duration-200 flex items-center justify-center"
            title={`Signed in as ${user.email}`}
          >
            {user.avatar ? (
              <Image
                src={user.avatar}
                alt="Profile"
                width={32}
                height={32}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <User className="h-5 w-5 text-gray-600" />
            )}
          </button>

          {/* Hover logout text - positioned sideways (left) */}
          {showHoverText && (
            <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 bg-white px-3 py-1 rounded-full shadow-lg border-2 border-red-500 text-sm font-medium text-red-600 whitespace-nowrap">
              Log Out
            </div>
          )}

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
              {/* User Info Section */}
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  {user.avatar ? (
                    <Image
                      src={user.avatar}
                      alt="Profile"
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100">
                      <Image
                        src="/placeholder-image.svg"
                        alt="Profile"
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate text-sm">
                      {user.name || user.email?.split("@")[0] || "User"}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {user.email}
                    </div>
                  </div>
                </div>
              </div>

              {/* Roles Section */}
              <div className="px-4 py-2">
                <div className="text-xs text-gray-500 mb-1">Account Type</div>
                <div className="text-sm text-gray-700 mb-2">
                  {user.roles
                    .map((role) => {
                      if (role === "mod") return "Moderator";
                      return role.charAt(0).toUpperCase() + role.slice(1);
                    })
                    .join(", ")}
                </div>
                <div className="text-xs text-gray-500 mb-1">Permissions</div>
                <div className="flex flex-wrap gap-1">
                  {user.roles.includes("user") && (
                    <span className="inline-block px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">
                      Submit Reviews
                    </span>
                  )}
                  {user.roles.includes("scout") && (
                    <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                      Scout Locations
                    </span>
                  )}
                  {user.roles.includes("mod") && (
                    <span className="inline-block px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded-full">
                      Moderate Content
                    </span>
                  )}
                  {user.roles.includes("admin") && (
                    <span className="inline-block px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                      Admin Access
                    </span>
                  )}
                </div>
              </div>

              {/* Role-Specific Dashboards */}
              {(canAdmin() ||
                canModerate() ||
                user.roles.includes("scout")) && (
                <div className="border-t border-gray-100 pt-2">
                  {canAdmin() && (
                    <>
                      <Link
                        href="/admin"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                        onClick={() => setShowUserMenu(false)}
                      >
                        � Admin Dashboard
                      </Link>
                      <Link
                        href="/admin/metrics"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                        onClick={() => setShowUserMenu(false)}
                      >
                        📊 Analytics & Metrics
                      </Link>
                      <Link
                        href="/admin/users"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                        onClick={() => setShowUserMenu(false)}
                      >
                        👥 User Management
                      </Link>
                    </>
                  )}
                  {canModerate() && (
                    <Link
                      href="/moderator"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                      onClick={() => setShowUserMenu(false)}
                    >
                      🛡️ Moderation Center
                    </Link>
                  )}
                  {user.roles.includes("scout") && (
                    <Link
                      href="/scout"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                      onClick={() => setShowUserMenu(false)}
                    >
                      🔍 Scout Dashboard
                    </Link>
                  )}
                </div>
              )}

              {/* Sign Out */}
              <div className="border-t border-gray-100 pt-2">
                <button
                  onClick={async () => {
                    info("Signing out...", "Logout");
                    setShowUserMenu(false);
                    await signOut();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors duration-150"
                >
                  <SignOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="relative">
          <Link
            href="/login"
            onMouseEnter={() => setShowHoverText(true)}
            onMouseLeave={() => setShowHoverText(false)}
            className="w-10 h-10 bg-white rounded-full shadow-lg border-2 border-primary hover:shadow-xl transition-all duration-200 flex items-center justify-center"
            title="Sign in to your account"
          >
            <User className="h-5 w-5 text-gray-600" />
          </Link>

          {/* Hover login text - positioned sideways (left) */}
          {showHoverText && (
            <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 bg-white px-3 py-1 rounded-full shadow-lg border-2 border-primary text-sm font-medium text-primary whitespace-nowrap">
              Sign In
            </div>
          )}
        </div>
      )}
    </div>
  );
}
