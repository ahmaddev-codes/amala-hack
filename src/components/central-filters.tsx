"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  AccessTime as Clock,
  AttachMoney as DollarSign,
  LocationOn as MapPin,
  Close as X,
  ExpandMore as ChevronDown,
  Restaurant as RestaurantIcon,
} from "@mui/icons-material";
import { LocationFilter } from "@/types/location";

// Define the types inline since they're not exported from the location types
type PriceRange = "$" | "$$" | "$$$" | "$$$$";
type ServiceType = "dine-in" | "takeaway" | "both" | "all";

interface CentralFiltersProps {
  filters: LocationFilter;
  onFilterChange: (filters: LocationFilter) => void;
}

export function CentralFilters({
  filters,
  onFilterChange,
}: CentralFiltersProps) {
  const { isOpenNow = false, serviceType = "all", priceRange = [] } = filters;
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [showPriceDropdown, setShowPriceDropdown] = useState(false);
  const serviceDropdownRef = useRef<HTMLDivElement>(null);
  const priceDropdownRef = useRef<HTMLDivElement>(null);

  const hasActiveFilters = isOpenNow || serviceType !== "all" || priceRange.length > 0;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(event.target as Node)) {
        setShowServiceDropdown(false);
      }
      if (priceDropdownRef.current && !priceDropdownRef.current.contains(event.target as Node)) {
        setShowPriceDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenNowChange = (value: boolean) => {
    onFilterChange({ ...filters, isOpenNow: value });
  };

  const handleServiceTypeChange = (value: ServiceType) => {
    onFilterChange({ ...filters, serviceType: value });
    setShowServiceDropdown(false);
  };

  const handlePriceRangeToggle = (value: PriceRange) => {
    const newPriceRange = priceRange.includes(value)
      ? priceRange.filter((p) => p !== value)
      : [...priceRange, value];
    onFilterChange({ ...filters, priceRange: newPriceRange });
  };

  const clearFilters = () => {
    onFilterChange({
      isOpenNow: false,
      serviceType: "all",
      priceRange: [],
    });
  };

  const serviceTypes: { value: ServiceType; label: string; icon: React.ReactNode }[] = [
    { value: "all", label: "All Services", icon: <RestaurantIcon className="h-4 w-4" /> },
    { value: "dine-in", label: "Dine-in", icon: <RestaurantIcon className="h-4 w-4" /> },
    { value: "takeaway", label: "Takeaway", icon: <MapPin className="h-4 w-4" /> },
    { value: "both", label: "Both", icon: <RestaurantIcon className="h-4 w-4" /> },
  ];

  const priceRanges: { value: PriceRange; label: string; description: string }[] = [
    { value: "$", label: "$", description: "Inexpensive" },
    { value: "$$", label: "$$", description: "Moderate" },
    { value: "$$$", label: "$$$", description: "Expensive" },
    { value: "$$$$", label: "$$$$", description: "Very Expensive" },
  ];

  const getServiceTypeLabel = () => {
    const service = serviceTypes.find(s => s.value === serviceType);
    return service?.label || "Service Type";
  };

  const getPriceRangeLabel = () => {
    if (priceRange.length === 0) return "Price";
    if (priceRange.length === 1) return priceRange[0];
    return `${priceRange.length} selected`;
  };

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-40 pointer-events-none">
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Open Now Filter */}
        <button
          onClick={() => handleOpenNowChange(!isOpenNow)}
          className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 flex items-center gap-2 shadow-lg backdrop-blur-sm border ${
            isOpenNow
              ? "bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]"
              : "bg-white/90 text-gray-700 dark:text-gray-200 border-gray-200/50 dark:border-gray-700/50 hover:bg-white dark:hover:bg-gray-800 hover:shadow-xl"
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Open now</span>
        </button>

        {/* Service Type Dropdown */}
        <div className="relative" ref={serviceDropdownRef}>
          <button
            onClick={() => setShowServiceDropdown(!showServiceDropdown)}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 flex items-center gap-2 shadow-lg backdrop-blur-sm border ${
              serviceType !== "all"
                ? "bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]"
                : "bg-white/90 text-gray-700 dark:text-gray-200 border-gray-200/50 dark:border-gray-700/50 hover:bg-white dark:hover:bg-gray-800 hover:shadow-xl"
            }`}
          >
            <RestaurantIcon className="h-4 w-4" />
            <span>{getServiceTypeLabel()}</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showServiceDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showServiceDropdown && (
            <div className="absolute top-full mt-2 left-0 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[160px] z-50">
              {serviceTypes.map((service) => (
                <button
                  key={service.value}
                  onClick={() => handleServiceTypeChange(service.value)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 ${
                    serviceType === service.value 
                      ? 'bg-[var(--primary)]/10 text-[var(--primary)] dark:bg-[var(--primary)]/20 dark:text-[var(--primary-foreground)]' 
                      : 'text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {service.icon}
                  {service.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Price Range Dropdown */}
        <div className="relative" ref={priceDropdownRef}>
          <button
            onClick={() => setShowPriceDropdown(!showPriceDropdown)}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 flex items-center gap-2 shadow-lg backdrop-blur-sm border ${
              priceRange.length > 0
                ? "bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]"
                : "bg-white/90 text-gray-700 dark:text-gray-200 border-gray-200/50 dark:border-gray-700/50 hover:bg-white dark:hover:bg-gray-800 hover:shadow-xl"
            }`}
          >
            <DollarSign className="h-4 w-4" />
            <span>{getPriceRangeLabel()}</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showPriceDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showPriceDropdown && (
            <div className="absolute top-full mt-2 left-0 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[180px] z-50">
              {priceRanges.map((price) => (
                <button
                  key={price.value}
                  onClick={() => handlePriceRangeToggle(price.value)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between ${
                    priceRange.includes(price.value) 
                      ? 'bg-[var(--primary)]/10 text-[var(--primary)] dark:bg-[var(--primary)]/20 dark:text-[var(--primary-foreground)]' 
                      : 'text-gray-700 dark:text-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{price.label}</span>
                    <span className="text-xs text-gray-500">{price.description}</span>
                  </div>
                  {priceRange.includes(price.value) && (
                    <div className="w-2 h-2 bg-[var(--primary)] rounded-full" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Clear All Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="p-2 rounded-full hover:bg-gray-100/80 dark:hover:bg-gray-700/80 transition-colors bg-white/90 dark:bg-gray-800/90 shadow-lg backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50"
            title="Clear all filters"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        )}
      </div>
    </div>
  );
}
