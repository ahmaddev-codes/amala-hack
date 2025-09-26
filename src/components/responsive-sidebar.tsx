"use client";

import { useState, useEffect, ReactNode } from 'react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
}

interface ResponsiveSidebarProps {
  title: string;
  subtitle?: string;
  userInfo?: ReactNode;
  items: SidebarItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: ReactNode;
  headerIcon?: React.ComponentType<{ className?: string }>;
  backButton?: {
    label: string;
    onClick: () => void;
    icon?: React.ComponentType<{ className?: string }>;
  };
  className?: string;
}

export function ResponsiveSidebar({
  title,
  subtitle,
  userInfo,
  items,
  activeTab,
  onTabChange,
  children,
  headerIcon: HeaderIcon,
  backButton,
  className = ""
}: ResponsiveSidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Close mobile menu when tab changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeTab]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isMobileMenuOpen]);

  const SidebarContent = () => (
    <>
      {/* Header */}
      <div className="p-6 border-b flex-shrink-0">
        <div className="flex items-center space-x-3">
          {HeaderIcon && (
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <HeaderIcon className="w-6 h-6 text-orange-600" />
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        </div>
        {userInfo && <div className="mt-2">{userInfo}</div>}
      </div>

      {/* Navigation */}
      <nav className="mt-6 flex-1 overflow-y-auto">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center justify-between px-6 py-3 text-left hover:bg-gray-50 transition-colors ${
              activeTab === item.id
                ? "bg-orange-50 border-r-2 border-orange-500 text-orange-700"
                : "text-gray-700"
            }`}
          >
            <div className="flex items-center">
              <item.icon className={`w-5 h-5 mr-3 ${activeTab === item.id ? 'text-orange-600' : 'text-gray-500'}`} />
              <span className="font-medium">{item.label}</span>
            </div>
            {item.count && item.count > 0 && (
              <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">
                {item.count}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Back Button */}
      {backButton && (
        <div className="p-6 flex-shrink-0">
          <button
            onClick={backButton.onClick}
            className="w-full flex items-center px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {backButton.icon && <backButton.icon className="w-4 h-4 mr-2" />}
            {backButton.label}
          </button>
        </div>
      )}
    </>
  );

  return (
    <div className={`h-screen bg-gray-50 flex overflow-hidden ${className}`}>
      {/* Desktop Sidebar - Always visible on lg+ screens */}
      <div className="hidden lg:flex w-64 bg-white shadow-lg flex-col">
        <SidebarContent />
      </div>

      {/* Mobile Header - Only visible on mobile/tablet */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white shadow-sm border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            {HeaderIcon && (
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <HeaderIcon className="w-5 h-5 text-orange-600" />
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold text-gray-900">{title}</h1>
              {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Open menu"
          >
            <Bars3Icon className="w-6 h-6 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobile && (
        <>
          {/* Backdrop with blur effect */}
          <div
            className={`fixed inset-0 z-50 backdrop-blur-sm bg-black/30 transition-all duration-300 ${
              isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
            }`}
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Sliding Sidebar */}
          <div className={`fixed top-0 left-0 bottom-0 z-50 w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out flex flex-col ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}>
            {/* Close Button */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center space-x-3">
                {HeaderIcon && (
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <HeaderIcon className="w-5 h-5 text-orange-600" />
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{title}</h2>
                  {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
                </div>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Close menu"
              >
                <XMarkIcon className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            {/* User Info */}
            {userInfo && (
              <div className="px-4 py-3 border-b bg-gray-50">
                {userInfo}
              </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center justify-between px-6 py-3 text-left hover:bg-gray-50 transition-colors ${
                    activeTab === item.id
                      ? "bg-orange-50 border-r-2 border-orange-500 text-orange-700"
                      : "text-gray-700"
                  }`}
                >
                  <div className="flex items-center">
                    <item.icon className={`w-5 h-5 mr-3 ${activeTab === item.id ? 'text-orange-600' : 'text-gray-500'}`} />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {item.count && item.count > 0 && (
                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">
                      {item.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>

            {/* Back Button */}
            {backButton && (
              <div className="p-4 border-t">
                <button
                  onClick={backButton.onClick}
                  className="w-full flex items-center px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {backButton.icon && <backButton.icon className="w-4 h-4 mr-2" />}
                  {backButton.label}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Add top padding on mobile to account for fixed header */}
        <div className={`${isMobile ? 'pt-20' : ''}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
