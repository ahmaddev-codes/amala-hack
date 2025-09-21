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
import { BrandLogo } from "@/components/ui/brand-logo";

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
                onFocus={() => setIsFocused(true)}
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
                className="absolute left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto z-60 w-full"
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
            <button
              onClick={toggleHighContrast}
              aria-pressed={highContrast}
              className={`p-1.5 rounded-full hover:bg-gray-100/90 text-gray-600 hover:text-gray-900 transition-colors active:scale-95 duration-200 hidden sm:block ${
                highContrast ? 'ring-2 ring-blue-500 bg-blue-50 text-blue-700' : ''
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
