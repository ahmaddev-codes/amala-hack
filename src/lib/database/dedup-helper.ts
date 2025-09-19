import { AmalaLocation } from "@/types/location";
import { firebaseOperations } from "@/lib/firebase/database";
import { LocationService } from "@/lib/services/location-service";

export interface DuplicateCheckWithReasonsResult {
  isDuplicate: boolean;
  reason?: string;
  similarLocations: AmalaLocation[];
  moderationReasons: string[];
  confidence?: number;
}

export interface LocationForDuplicateCheck {
  name: string;
  address: string;
  coordinates?: { lat: number; lng: number };
  phone?: string;
}

/**
 * Enhanced duplicate detection with detailed reasons and moderation flags
 */
export async function checkForDuplicatesWithReasons(
  location: LocationForDuplicateCheck
): Promise<DuplicateCheckWithReasonsResult> {
  try {
    // Get all existing locations for comparison
    const existingLocations = await firebaseOperations.getAllLocations();

    // Use the LocationService for duplicate detection
    const duplicateResult = await LocationService.detectDuplicate(
      location,
      existingLocations
    );

    if (!duplicateResult.isDuplicate) {
      return {
        isDuplicate: false,
        similarLocations: [],
        moderationReasons: [],
      };
    }

    // Generate detailed reason based on the similarity factors
    const primaryReason = generatePrimaryReason(duplicateResult.reasons);

    // Generate moderation reasons for review
    const moderationReasons = generateModerationReasons(
      location,
      duplicateResult.similarLocations,
      duplicateResult.confidence
    );

    return {
      isDuplicate: true,
      reason: primaryReason,
      similarLocations: duplicateResult.similarLocations,
      moderationReasons,
      confidence: duplicateResult.confidence,
    };
  } catch (error) {
    console.error("Error in duplicate check:", error);

    // Return safe default - don't block submissions on error
    return {
      isDuplicate: false,
      similarLocations: [],
      moderationReasons: [
        "Error occurred during duplicate check - manual review recommended",
      ],
    };
  }
}

/**
 * Generate a primary reason for duplicate detection
 */
function generatePrimaryReason(reasons: string[]): string {
  if (reasons.length === 0) {
    return "Similar location detected";
  }

  // Prioritize reasons by importance
  const phoneReason = reasons.find((r) => r.includes("phone"));
  const nameReason = reasons.find((r) => r.includes("name"));
  const addressReason = reasons.find((r) => r.includes("address"));

  if (phoneReason) {
    return `Duplicate detected: ${phoneReason}`;
  }

  if (nameReason && addressReason) {
    return `Duplicate detected: ${nameReason} and ${addressReason}`;
  }

  if (nameReason) {
    return `Duplicate detected: ${nameReason}`;
  }

  if (addressReason) {
    return `Duplicate detected: ${addressReason}`;
  }

  return `Duplicate detected: ${reasons[0]}`;
}

/**
 * Generate moderation reasons for manual review
 */
function generateModerationReasons(
  newLocation: LocationForDuplicateCheck,
  similarLocations: AmalaLocation[],
  confidence: number
): string[] {
  const reasons: string[] = [];

  if (confidence > 0.95) {
    reasons.push("High confidence duplicate match - likely exact duplicate");
  } else if (confidence > 0.85) {
    reasons.push("Strong duplicate match - manual verification recommended");
  } else {
    reasons.push("Potential duplicate - requires human review");
  }

  if (similarLocations.length > 1) {
    reasons.push(
      `Multiple similar locations found (${similarLocations.length})`
    );
  }

  // Check for exact name matches
  const exactNameMatch = similarLocations.some(
    (loc) =>
      loc.name.toLowerCase().trim() === newLocation.name.toLowerCase().trim()
  );
  if (exactNameMatch) {
    reasons.push("Exact name match found");
  }

  // Check for phone number matches
  if (newLocation.phone) {
    const phoneMatch = similarLocations.some(
      (loc) =>
        loc.phone &&
        normalizePhone(loc.phone!) === normalizePhone(newLocation.phone!)
    );
    if (phoneMatch) {
      reasons.push("Phone number already exists in database");
    }
  }

  // Check for proximity if coordinates are available
  if (newLocation.coordinates) {
    const proximityMatches = similarLocations.filter((loc) => {
      if (!loc.coordinates) return false;
      const distance = LocationService.calculateDistance(
        newLocation.coordinates!,
        loc.coordinates
      );
      return distance < 50; // Within 50 meters
    });

    if (proximityMatches.length > 0) {
      reasons.push(`${proximityMatches.length} location(s) within 50m radius`);
    }
  }

  return reasons;
}

/**
 * Normalize phone number for comparison
 */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}
