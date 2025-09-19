"use client";

import {
  Warning as AlertTriangle,
  LocationOn as MapPin,
  Phone,
  OpenInNew as ExternalLink,
} from "@mui/icons-material";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AmalaLocation } from "@/types/location";

interface DuplicateWarningProps {
  similarLocations: AmalaLocation[];
  confidence: number;
  onProceedAnyway: () => void;
  onCancel: () => void;
}

export function DuplicateWarning({
  similarLocations,
  confidence,
  onProceedAnyway,
  onCancel,
}: DuplicateWarningProps) {
  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <AlertTriangle className="w-5 h-5" />
          Possible Duplicate Location
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-orange-700">
          We found {similarLocations.length} similar location
          {similarLocations.length > 1 ? "s" : ""} (
          {Math.round(confidence * 100)}% confidence). Please review:
        </p>

        <div className="space-y-3">
          {similarLocations.slice(0, 2).map((location) => (
            <div
              key={location.id}
              className="p-3 bg-white rounded border border-orange-200"
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-gray-900">{location.name}</h4>
                <Badge
                  variant={
                    location.status === "approved" ? "default" : "secondary"
                  }
                  className="text-xs"
                >
                  {location.status}
                </Badge>
              </div>

              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {location.address}
                </div>

                {location.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {location.phone}
                  </div>
                )}

                {location.website && (
                  <div className="flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />
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

              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-medium">
                  {location.priceInfo || "Price not available"}
                </span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs capitalize">
                  {location.serviceType.replace("-", " ")}
                </span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs">{location.cuisine.join(", ")}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel Submission
          </Button>
          <Button
            onClick={onProceedAnyway}
            className="bg-orange-600 hover:bg-orange-700"
          >
            Submit Anyway
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
