"use client";

import { useState, useEffect } from "react";
import { AmalaLocation } from "@/types/location";
import { firebaseOperations } from "@/lib/firebase/database";
import { AutonomousDiscoveryPanel } from "@/components/autonomous-discovery-panel";
import { useToast } from "@/contexts/ToastContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  Cancel as XCircle,
  AccessTime as Clock,
  LocationOn as MapPin,
  Phone,
  Language as Globe,
  SmartToy as Bot,
} from "@mui/icons-material";

interface ModerationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove?: (locationId: string, verificationNotes?: string) => void;
  onReject?: (locationId: string, reason: string, notes?: string) => void;
  onBulkAction?: (locationIds: string[], action: "approve" | "reject") => void;
  onPendingCountChange?: (count: number) => void;
  onLocationApproved?: (locationId: string) => void; // New callback for real-time update
}

export function ModerationPanel({
  isOpen,
  onClose,
  onApprove,
  onReject,
  onBulkAction,
  onPendingCountChange,
}: ModerationPanelProps) {
  const { success, error } = useToast();
  const [pendingLocations, setPendingLocations] = useState<AmalaLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"queue" | "discovery">("queue");

  useEffect(() => {
    if (isOpen) {
      loadPendingLocations();
    }
  }, [isOpen]);

  const loadPendingLocations = async () => {
    try {
      setIsLoading(true);
      console.log("📋 Loading pending locations...");

      // Get all pending locations
      const locations = await firebaseOperations.getLocationsByStatus("pending");
      console.log("📊 Pending locations loaded:", locations.length);
      console.log("📍 First location:", locations[0]);

      setPendingLocations(locations);

      // Update header badge count
      onPendingCountChange?.(locations.length);
    } catch (error) {
      console.error("❌ Error loading pending locations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveClick = async (locationId: string) => {
    try {
      console.log("🟢 Approving location:", locationId);

      if (onApprove) {
        console.log("📞 Using onApprove callback");
        await onApprove(locationId, "Approved via moderation panel");
      } else {
        console.log("💾 Using direct database update");
        const result = await firebaseOperations.updateLocationStatus(
          locationId,
          "approved"
        );
        console.log("✅ Database update result:", result);
      }

      // Immediately update local state for instant feedback (no refresh needed!)
      const newPendingLocations = pendingLocations.filter(
        (loc) => loc.id !== locationId
      );
      setPendingLocations(newPendingLocations);

      // Update header badge count
      onPendingCountChange?.(newPendingLocations.length);

      console.log("✅ Location approved and removed from queue instantly");
    } catch (err) {
      console.error("❌ Error approving location:", err);
      console.error("🔍 Full error details:", JSON.stringify(err, null, 2));
      error(
        `Error approving location: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
        "Approval Failed"
      );
    }
  };

  const handleRejectClick = async (locationId: string) => {
    try {
      console.log("🔴 Rejecting location:", locationId);

      if (onReject) {
        await onReject(locationId, "Rejected via moderation panel", "");
      } else {
        const result = await firebaseOperations.updateLocationStatus(
          locationId,
          "rejected"
        );
        console.log("✅ Location rejected:", result);
      }

      // Immediately update local state for instant feedback (no refresh needed!)
      const newPendingLocations = pendingLocations.filter(
        (loc) => loc.id !== locationId
      );
      setPendingLocations(newPendingLocations);

      // Update header badge count
      onPendingCountChange?.(newPendingLocations.length);

      console.log("✅ Location rejected and removed from queue instantly");
    } catch (err) {
      console.error("❌ Error rejecting location:", err);
      error(
        `Error rejecting location: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
        "Rejection Failed"
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            Moderation Center
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Review and approve new Amala locations
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab("queue")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "queue"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Clock className="h-4 w-4" />
              Review Queue ({pendingLocations.length})
            </button>
            <button
              onClick={() => setActiveTab("discovery")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "discovery"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Bot className="h-4 w-4" />
              Autonomous Discovery
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {activeTab === "queue" ? (
            // Review Queue Tab
            <>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Clock className="w-6 h-6 text-primary animate-spin mr-2" />
                  <span>Loading pending locations...</span>
                </div>
              ) : pendingLocations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No locations pending review</p>
                  <p className="text-sm mt-2">
                    Use the Autonomous Discovery tab to find new locations
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-primary mb-4 p-2 bg-primary/5 rounded">
                    📊 Found {pendingLocations.length} pending locations to
                    review
                  </div>
                  {pendingLocations.map((location) => (
                    <div
                      key={location.id}
                      className="border rounded-lg p-4 bg-gray-50"
                    >
                      <div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-gray-900">
                            {location.name}
                          </h3>
                          <div className="mt-2 space-y-1 text-sm text-gray-600">
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 mr-2" />
                              {location.address}
                            </div>
                            {location.phone && (
                              <div className="flex items-center">
                                <Phone className="w-4 h-4 mr-2" />
                                {location.phone}
                              </div>
                            )}
                            {location.website && (
                              <div className="flex items-center">
                                <Globe className="w-4 h-4 mr-2" />
                                <a
                                  href={location.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  {location.website}
                                </a>
                              </div>
                            )}
                          </div>
                          {location.description && (
                            <p className="mt-2 text-sm text-gray-700">
                              {location.description}
                            </p>
                          )}
                          <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                            <span>Source: {location.discoverySource}</span>
                            <span>
                              Price: {location.priceInfo || "Not specified"}
                            </span>
                            <span>Service: {location.serviceType}</span>
                            {location.rating && (
                              <span>Rating: ⭐ {location.rating}</span>
                            )}
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2 justify-end">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log(
                                "🖱️ Approve button clicked for:",
                                location.id
                              );
                              handleApproveClick(location.id);
                            }}
                            className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center cursor-pointer min-w-[80px] justify-center"
                            style={{ pointerEvents: "auto" }}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            <span className="hidden sm:inline">Approve</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log(
                                "🖱️ Reject button clicked for:",
                                location.id
                              );
                              handleRejectClick(location.id);
                            }}
                            className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center cursor-pointer min-w-[80px] justify-center"
                            style={{ pointerEvents: "auto" }}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            <span className="hidden sm:inline">Reject</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            // Autonomous Discovery Tab
            <div className="flex justify-center">
              <AutonomousDiscoveryPanel
                onDiscoveryComplete={(result) => {
                  console.log("Discovery completed:", result);
                  // Refresh the pending locations after discovery
                  loadPendingLocations();
                  // Switch back to queue tab to show new discoveries
                  if (result.savedToDatabase > 0) {
                    setActiveTab("queue");
                  }
                }}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
