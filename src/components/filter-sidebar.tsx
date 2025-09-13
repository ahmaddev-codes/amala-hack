"use client";

import { X, Clock, MapPin, DollarSign, Utensils } from "lucide-react";
import { LocationFilter } from "@/types/location";

interface FilterSidebarProps {
  isOpen: boolean;
  filters: LocationFilter;
  onFilterChange: (filters: Partial<LocationFilter>) => void;
  onClose: () => void;
}

export function FilterSidebar({
  isOpen,
  filters,
  onFilterChange,
  onClose,
}: FilterSidebarProps) {
  console.log("🎛️ FilterSidebar render - isOpen:", isOpen);

  const priceRanges = [
    { value: "$", label: "$" },
    { value: "$$", label: "$$" },
    { value: "$$$", label: "$$$" },
    { value: "$$$$", label: "$$$$" },
  ];

  const cuisineTypes = [
    "Nigerian",
    "Yoruba",
    "Traditional",
    "Fusion",
    "Modern",
  ];

  return (
    <>
      {/* Mobile overlay - only show when open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-25 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Google Maps-style sidebar */}
      <div
        className={`
        fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-sm border-r border-gray-200
        transform transition-transform duration-200 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        overflow-y-auto h-full
      `}
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Filters</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Open Now */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-gray-900">
                  Open now
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.isOpenNow || false}
                  onChange={(e) =>
                    onFilterChange({ isOpenNow: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Service Type */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <MapPin className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-900">
                  Service type
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "all", label: "All" },
                  { value: "dine-in", label: "Dine-in" },
                  { value: "takeaway", label: "Takeaway" },
                  { value: "both", label: "Both" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() =>
                      onFilterChange({
                        serviceType: option.value as
                          | "all"
                          | "dine-in"
                          | "takeaway"
                          | "both",
                      })
                    }
                    className={`px-3 py-1 text-sm font-medium rounded-full border transition-colors duration-200 ${
                      (filters.serviceType || "all") === option.value
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <DollarSign className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-gray-900">Price</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {priceRanges.map((range) => {
                  const isSelected =
                    filters.priceRange?.includes(
                      range.value as "$" | "$$" | "$$$" | "$$$$"
                    ) || false;
                  return (
                    <button
                      key={range.value}
                      onClick={() => {
                        const currentRanges = filters.priceRange || [];
                        if (isSelected) {
                          onFilterChange({
                            priceRange: currentRanges.filter(
                              (r) => r !== range.value
                            ),
                          });
                        } else {
                          onFilterChange({
                            priceRange: [
                              ...currentRanges,
                              range.value as "$" | "$$" | "$$$" | "$$$$",
                            ],
                          });
                        }
                      }}
                      className={`px-3 py-1 text-sm font-medium rounded-full border transition-colors duration-200 ${
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                      }`}
                    >
                      {range.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cuisine Type */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Utensils className="h-5 w-5 text-orange-600" />
                <span className="text-sm font-medium text-gray-900">
                  Cuisine
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {cuisineTypes.map((cuisine) => {
                  const isSelected =
                    filters.cuisine?.includes(cuisine) || false;
                  return (
                    <button
                      key={cuisine}
                      onClick={() => {
                        const currentCuisines = filters.cuisine || [];
                        if (isSelected) {
                          onFilterChange({
                            cuisine: currentCuisines.filter(
                              (c) => c !== cuisine
                            ),
                          });
                        } else {
                          onFilterChange({
                            cuisine: [...currentCuisines, cuisine],
                          });
                        }
                      }}
                      className={`px-3 py-1 text-sm font-medium rounded-full border transition-colors duration-200 ${
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                      }`}
                    >
                      {cuisine}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Clear Filters */}
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={() => onFilterChange({})}
                className="w-full py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
              >
                Clear all
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
