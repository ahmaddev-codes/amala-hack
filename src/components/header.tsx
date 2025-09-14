"use client";

import React from "react";
import { useState, useEffect } from "react";
import { Menu, Plus, Search, Shield, X, MapPin, Eye } from "lucide-react";

interface HeaderProps {
  onAddLocation: () => void;
  onToggleSidebar: () => void;
  onShowModeration?: () => void;
  pendingCount?: number;
  onSearch?: (query: string) => void;
  searchResults?: Array<{
    id: string;
    name: string;
    address: string;
    isOpenNow: boolean;
  }>;
  onSearchResultSelect?: (locationId: string) => void;
}

export function Header({
  onAddLocation,
  onToggleSidebar,
  onShowModeration,
  pendingCount,
  onSearch,
  searchResults = [],
  onSearchResultSelect,
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('highContrast') === 'true';
    setHighContrast(saved);
    if (saved) {
      document.body.classList.add('high-contrast');
    }
  }, []);

  const toggleHighContrast = () => {
    const newValue = !highContrast;
    setHighContrast(newValue);
    if (newValue) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
    localStorage.setItem('highContrast', newValue.toString());
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim() && onSearch) {
        onSearch(searchQuery);
        setShowSearchResults(true);
      } else {
        setShowSearchResults(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, onSearch]);

  const handleSearchResultClick = (locationId: string) => {
    setShowSearchResults(false);
    setSearchQuery("");
    onSearchResultSelect?.(locationId);
  };
  return (
    <>
      {/* Google Maps-style floating header */}
      <header className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-2xl px-4">
        <div className="bg-white rounded-full shadow-lg border border-gray-300 px-4 py-2 flex items-center gap-2">
          {/* Menu button */}
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200 flex-shrink-0 cursor-pointer"
          >
            <Menu className="h-5 w-5 text-gray-700" />
          </button>

          {/* Search bar - takes most space */}
          <div className="flex-1 relative">
            <div className="flex items-center">
              <Search className="h-4 w-4 text-gray-500 mr-2 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search Google Maps"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                className="flex-1 bg-transparent border-0 outline-none text-sm text-gray-900 placeholder-gray-500 min-w-0"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setShowSearchResults(false);
                  }}
                  className="ml-1 p-1 rounded-full hover:bg-gray-100 transition-colors duration-200 flex-shrink-0 cursor-pointer"
                >
                  <X className="h-3 w-3 text-gray-500" />
                </button>
              )}
            </div>

            {/* Search results dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-80 overflow-y-auto z-60">
                <div className="py-1">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleSearchResultClick(result.id)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate text-sm">
                            {result.name}
                          </div>
                          <div className="text-xs text-gray-600 truncate">
                            {result.address}
                          </div>
                        </div>
                        <div
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            result.isOpenNow ? "bg-green-500" : "bg-red-500"
                          }`}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {onShowModeration && (
              <button
                onClick={onShowModeration}
                className="relative bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full px-4 py-2 text-xs font-medium transition-colors duration-200 flex items-center gap-1 max-w-[100px] sm:max-w-none"
                style={{ minWidth: 0 }}
              >
                <Shield className="h-3 w-3 flex-shrink-0" />
                <span className="hidden xs:inline sm:inline whitespace-nowrap">Moderate</span>
                {pendingCount && pendingCount > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold min-w-[20px]">
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </div>
                )}
              </button>
            )}

            <button
              onClick={onAddLocation}
              className="bg-primary hover:bg-primary text-white rounded-full px-3 py-2 text-xs font-medium transition-colors duration-200 flex items-center gap-1 max-w-[90px] sm:max-w-none overflow-hidden"
              style={{ minWidth: 0 }}
            >
              <Plus className="h-3 w-3" />
              <span className="hidden xs:inline sm:inline">Add place</span>
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
