"use client";

import React, { useState, useEffect } from "react";
import {
  Bars3Icon as Menu,
  PlusIcon as Plus,
  MagnifyingGlassIcon as Search,
  XMarkIcon as X,
  MapPinIcon,
  EyeIcon as Eye,
} from "@heroicons/react/24/outline";

interface HeaderProps {
  onAddLocation: () => void;
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
  onSearch,
  searchResults = [],
  onSearchResultSelect,
  className = "",
}: HeaderProps & { className?: string }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    const saved = localStorage.getItem("highContrast") === "true";
    setHighContrast(saved);
    if (saved) {
      document.documentElement.classList.add("high-contrast");
    }
  }, []);

  const toggleHighContrast = () => {
    const newValue = !highContrast;
    setHighContrast(newValue);
    if (newValue) {
      document.documentElement.classList.add("high-contrast");
    } else {
      document.documentElement.classList.remove("high-contrast");
    }
    localStorage.setItem("highContrast", newValue.toString());
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim() && onSearch) {
        onSearch(searchQuery);
        // Recalculate position before showing results
        const searchInput = document.querySelector('input[placeholder="Search locations..."]') as HTMLInputElement;
        if (searchInput) {
          calculateDropdownPosition(searchInput);
        }
        setShowSearchResults(true);
      } else {
        setShowSearchResults(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, onSearch]);

  // Clear search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSearchResults && !(event.target as Element)?.closest('[role="search"]') && !(event.target as Element)?.closest('[role="listbox"]')) {
        setShowSearchResults(false);
      }
    };

    if (showSearchResults) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSearchResults]);

  // Recalculate dropdown position on window resize
  useEffect(() => {
    const handleResize = () => {
      if (showSearchResults) {
        const searchInput = document.querySelector('input[placeholder="Search locations..."]') as HTMLInputElement;
        if (searchInput) {
          calculateDropdownPosition(searchInput);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showSearchResults]);

  const calculateDropdownPosition = (inputElement: HTMLInputElement) => {
    const rect = inputElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Find the header container to position dropdown immediately below it
    const headerElement = inputElement.closest('header');
    const headerRect = headerElement ? headerElement.getBoundingClientRect() : rect;
    
    // Calculate optimal width - match header width exactly, with small padding
    const isMobile = viewportWidth < 640;
    const dropdownWidth = isMobile 
      ? Math.min(viewportWidth - 32, headerRect.width) 
      : headerRect.width - 8; // Match header width minus small padding
    
    // Position dropdown to align with header left edge
    const left = isMobile ? Math.max(16, headerRect.left) : headerRect.left + 4;
    
    // Position immediately below header with minimal gap
    const topPosition = headerRect.bottom + 2;
    
    // Ensure dropdown doesn't go off screen vertically
    const dropdownHeight = 240; // max-h-60 = 240px
    const adjustedTop = topPosition + dropdownHeight > viewportHeight 
      ? Math.max(16, headerRect.top - dropdownHeight - 2) 
      : topPosition;
    
    setDropdownPosition({
      top: adjustedTop,
      left,
      width: dropdownWidth
    });
  };

  const handleSearchResultClick = (locationId: string) => {
    setShowSearchResults(false);
    setSearchQuery("");
    setIsFocused(false);
    onSearchResultSelect?.(locationId);
  };
  return (
    <>
      {/* Compact header - fits within sidebar width */}
      <header
        className={`bg-white/80 backdrop-blur-sm rounded-full shadow-sm border border-gray-200 transition-all duration-300 hover:shadow-md hover:border-gray-300 ${className}`}
      >
        <div className="flex items-center px-4 py-1.5 gap-2">
          {/* Search bar */}
          <div className="flex-1 relative min-w-0" role="search">
            <div className="flex items-center space-x-3">
              <input
                type="text"
                placeholder="Search locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={(e) => {
                  setIsFocused(true);
                  calculateDropdownPosition(e.target as HTMLInputElement);
                }}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                className="flex-1 bg-transparent border-0 outline-none text-sm text-gray-900 placeholder-gray-400 min-w-0 focus:ring-0 focus:outline-none px-1 py-1.5"
                aria-label="Search for Amala restaurants and locations"
                aria-expanded={showSearchResults}
                aria-haspopup="listbox"
                role="combobox"
                aria-autocomplete="list"
                aria-controls="search-results"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setShowSearchResults(false);
                  }}
                  className="ml-1 p-1 rounded-full hover:bg-gray-100 transition-colors duration-200 flex-shrink-0"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3 text-gray-500" aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Search results dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div
                id="search-results"
                className="fixed bg-white rounded-lg shadow-xl border border-gray-200 max-h-60 overflow-y-auto z-50 backdrop-blur-sm"
                style={{ 
                  top: `${dropdownPosition.top}px`,
                  left: `${dropdownPosition.left}px`,
                  width: `${dropdownPosition.width}px`
                }}
                role="listbox"
                aria-label="Search results"
              >
                <div className="py-1">
                  {searchResults.map((result, index) => (
                    <button
                      key={result.id}
                      onClick={() => handleSearchResultClick(result.id)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 focus:bg-blue-50 focus:outline-none transition-colors duration-200"
                      role="option"
                      aria-selected="false"
                      tabIndex={0}
                    >
                      <div className="flex items-center gap-2">
                        <MapPinIcon className="w-3 h-3 text-gray-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate text-sm">
                            {result.name}
                          </div>
                          <div className="text-xs text-gray-600 truncate">
                            {result.address}
                          </div>
                        </div>
                        <div
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${result.isOpenNow ? "bg-green-500" : "bg-red-500"
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
            <button
              onClick={toggleHighContrast}
              aria-pressed={highContrast}
              className={`p-1.5 rounded-full hover:bg-gray-100/90 text-gray-600 hover:text-gray-900 transition-colors active:scale-95 duration-200 hidden sm:block ${highContrast ? 'ring-2 ring-blue-500 bg-blue-50 text-blue-700' : ''
                }`}
              aria-label={`${highContrast ? 'Disable' : 'Enable'} high contrast mode`}
              title={`${highContrast ? 'Disable' : 'Enable'} high contrast mode`}
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
            </button>

            <button
              onClick={onAddLocation}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-full font-medium transition-colors flex items-center space-x-2 shadow-sm"
              aria-label="Add a new Amala location"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Add places</span>
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
