"use client";

import { useState } from "react";
import {
  SparklesIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { useAnalytics } from "@/hooks/useAnalytics";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LocationAssistant } from "./location-assistant";
import { ManualLocationForm } from "./manual-location-form";
import { LocationResult } from "@/types/location";

interface LocationSubmissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (locations: LocationResult[]) => Promise<void>;
}

export function LocationSubmissionDialog({
  isOpen,
  onClose,
  onSubmit,
}: LocationSubmissionDialogProps) {
  const [activeTab, setActiveTab] = useState<'ai' | 'manual'>('ai');
  const analytics = useAnalytics();

  const handleManualSubmit = async (location: LocationResult) => {
    // Track manual location submission
    analytics.trackLocationSubmission('manual', {
      name: location.name,
      images: location.photos,
    });
    
    await onSubmit([location]);
  };

  const handleAISubmit = async (locations: LocationResult[]) => {
    // Track AI-powered location submissions
    locations.forEach(location => {
      analytics.trackLocationSubmission('ai_intake', {
        name: location.name,
        images: location.photos,
      });
    });
    
    await onSubmit(locations);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] p-0 rounded-xl overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white rounded-t-xl">
          <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-orange-50 to-amber-50 rounded-t-xl">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Add New Location
            </DialogTitle>
            <p className="text-sm text-gray-600 mt-1">
              Choose how you&apos;d like to add a new location to the platform
            </p>
          </DialogHeader>

          {/* Tab Navigation */}
          <div className="flex border-b bg-gray-50">
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'ai'
                  ? 'bg-white text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <SparklesIcon className="w-4 h-4" />
              AI Assistant
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'manual'
                  ? 'bg-white text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <DocumentTextIcon className="w-4 h-4" />
              Manual Form
            </button>
          </div>
        </div>

        {/* Tab Content - All content scrolls together */}
        <div className="min-h-0">
          {activeTab === 'ai' ? (
            <LocationAssistant
              isOpen={true}
              onClose={onClose}
              onSubmit={handleAISubmit}
              isEmbedded={true}
            />
          ) : (
            <div className="p-6">
              <ManualLocationForm
                onSubmit={handleManualSubmit}
                onCancel={onClose}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
