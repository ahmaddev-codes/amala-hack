"use client";

import { useState } from "react";
import {
  Bot,
  Search,
  Globe,
  Zap,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DiscoveryResult {
  totalDiscovered: number;
  savedToDatabase: number;
  skippedDuplicates: number;
  duplicateNames: string[];
}

interface AutonomousDiscoveryPanelProps {
  onDiscoveryComplete?: (result: DiscoveryResult) => void;
}

export function AutonomousDiscoveryPanel({
  onDiscoveryComplete,
}: AutonomousDiscoveryPanelProps) {
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryResult, setDiscoveryResult] =
    useState<DiscoveryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [discoveryPhase, setDiscoveryPhase] = useState<string>("");

  const startAutonomousDiscovery = async () => {
    setIsDiscovering(true);
    setError(null);
    setDiscoveryResult(null);
    setDiscoveryPhase("Initializing autonomous discovery...");

    try {
      // Simulate discovery phases for better UX
      const phases = [
        "🔍 Searching Google Places API...",
        "🕷️ Web scraping food blogs and directories...",
        "📱 Analyzing social media mentions...",
        "✅ Validating discovered locations...",
        "💾 Saving to moderation queue...",
      ];

      for (let i = 0; i < phases.length; i++) {
        setDiscoveryPhase(phases[i]);
        await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate processing time
      }

      const response = await fetch("/api/discovery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (result.success) {
        setDiscoveryResult(result.data.summary);
        setDiscoveryPhase("🎉 Discovery completed successfully!");
        onDiscoveryComplete?.(result.data.summary);
      } else {
        throw new Error(result.error || "Discovery failed");
      }
    } catch (err) {
      console.error("Discovery error:", err);
      setError(err instanceof Error ? err.message : "Discovery failed");
      setDiscoveryPhase("");
    } finally {
      setIsDiscovering(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-600" />
          Autonomous Discovery System
        </CardTitle>
        <p className="text-sm text-gray-600">
          Automatically discover new Amala locations from web sources, APIs, and
          social media
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Discovery Sources */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <Search className="h-4 w-4 text-blue-600" />
            <div>
              <div className="font-medium text-sm">API Sources</div>
              <div className="text-xs text-gray-600">
                Google Places, Foursquare
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
            <Globe className="h-4 w-4 text-green-600" />
            <div>
              <div className="font-medium text-sm">Web Scraping</div>
              <div className="text-xs text-gray-600">
                Food blogs, directories
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg">
            <Zap className="h-4 w-4 text-purple-600" />
            <div>
              <div className="font-medium text-sm">Social Media</div>
              <div className="text-xs text-gray-600">
                Instagram, Twitter, TikTok
              </div>
            </div>
          </div>
        </div>

        {/* Discovery Status */}
        {isDiscovering && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-blue-600 animate-spin" />
              <span className="font-medium text-blue-900">
                Discovery in Progress
              </span>
            </div>
            <p className="text-sm text-blue-700">{discoveryPhase}</p>
            <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full animate-pulse"
                style={{ width: "60%" }}
              ></div>
            </div>
          </div>
        )}

        {/* Discovery Results */}
        {discoveryResult && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-900">
                Discovery Completed
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="font-medium text-gray-900">
                  {discoveryResult.totalDiscovered}
                </div>
                <div className="text-gray-600">Total Discovered</div>
              </div>
              <div>
                <div className="font-medium text-green-600">
                  {discoveryResult.savedToDatabase}
                </div>
                <div className="text-gray-600">Added to Queue</div>
              </div>
              <div>
                <div className="font-medium text-yellow-600">
                  {discoveryResult.skippedDuplicates}
                </div>
                <div className="text-gray-600">Duplicates Skipped</div>
              </div>
            </div>

            {discoveryResult.duplicateNames.length > 0 && (
              <div className="mt-3 p-2 bg-yellow-50 rounded border">
                <div className="text-xs font-medium text-yellow-800 mb-1">
                  Skipped Duplicates:
                </div>
                <div className="text-xs text-yellow-700">
                  {discoveryResult.duplicateNames.join(", ")}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="font-medium text-red-900">Discovery Failed</span>
            </div>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Action Button */}
        <Button
          onClick={startAutonomousDiscovery}
          disabled={isDiscovering}
          className="w-full"
          size="lg"
        >
          {isDiscovering ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Discovering Locations...
            </>
          ) : (
            <>
              <Bot className="h-4 w-4 mr-2" />
              Start Autonomous Discovery
            </>
          )}
        </Button>

        <div className="text-xs text-gray-500 text-center">
          Discovery searches multiple sources for Amala restaurants and adds
          them to the moderation queue for review.
        </div>
      </CardContent>
    </Card>
  );
}
