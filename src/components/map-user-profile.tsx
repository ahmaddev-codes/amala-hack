"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useToast } from "@/contexts/ToastContext";
import { UserIcon, ArrowRightOnRectangleIcon, ShieldCheckIcon, EyeIcon, MagnifyingGlassIcon, ChartBarIcon } from "@heroicons/react/24/outline";

// Component for profile image with fallback
function ProfileImage({ src, alt, size = 32, className = "" }: { src?: string; alt: string; size?: number; className?: string }) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isGoogleImage, setIsGoogleImage] = useState(false);

  // Reset error state when src changes
  React.useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
    setIsGoogleImage(src?.includes('googleusercontent.com') || false);
  }, [src]);

  // If no src provided or image failed to load, show fallback
  if (!src || imageError) {
    return (
      <div className={`rounded-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
        <UserIcon className="text-orange-600" style={{ width: size * 0.6, height: size * 0.6 }} />
      </div>
    );
  }

  // Create a more robust image loading approach
  const handleImageError = () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🖼️ Profile image failed to load, using fallback');
    }
    setImageError(true);
  };

  const handleImageLoad = () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Profile image loaded successfully');
    }
    setImageLoaded(true);
  };

  // For Google profile photos, use a simple approach to avoid rate limiting
  if (isGoogleImage) {
    // Use a fixed size to avoid multiple requests
    const googleSrc = size <= 64 ? src.replace(/=s\d+-c$/, '=s64-c') : src;

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <img
          src={googleSrc}
          alt={alt}
          width={size}
          height={size}
          className={`rounded-full ${className} ${imageLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}
          onError={handleImageError}
          onLoad={handleImageLoad}
          style={{ width: size, height: size }}
          referrerPolicy="no-referrer"
          loading="lazy"
        />
        {!imageLoaded && !imageError && (
          <div className={`absolute inset-0 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center ${className}`}>
            <UserIcon className="text-orange-600" style={{ width: size * 0.6, height: size * 0.6 }} />
          </div>
        )}
      </div>
    );
  }

  // For other images, use Next.js Image component
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-full ${className}`}
      onError={handleImageError}
      onLoad={handleImageLoad}
    />
  );
}

export function MapUserProfile() {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showHoverText, setShowHoverText] = useState(false);
  const { user, signOut, isLoading, canAdmin, canModerate } = useAuth();
  const { info } = useToast();

  // Only log critical user data changes in development
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development' && user) {
      console.log('👤 User profile loaded:', {
        email: user.email,
        hasAvatar: !!user.avatar,
        roles: user.roles
      });
    }
  }, [user]);

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
            <ProfileImage 
              src={user.avatar} 
              alt="Profile" 
              size={32} 
              className="w-8 h-8" 
            />
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
                  <ProfileImage 
                    src={user.avatar} 
                    alt="Profile" 
                    size={40} 
                    className="w-10 h-10" 
                  />
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
                    <Link
                      href="/admin"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <ShieldCheckIcon className="h-4 w-4" />
                      Admin Dashboard
                    </Link>
                  )}
                  {canModerate() && (
                    <Link
                      href="/moderator"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <EyeIcon className="h-4 w-4" />
                      Moderator Dashboard
                    </Link>
                  )}
                  {user.roles.includes("scout") && (
                    <Link
                      href="/scout"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <MagnifyingGlassIcon className="h-4 w-4" />
                      Scout Dashboard
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
                  <ArrowRightOnRectangleIcon className="h-4 w-4" />
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
            <UserIcon className="h-5 w-5 text-gray-600" />
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
