import { AmalaLocation, LocationSubmission } from "@/types/location";

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  similarLocations: AmalaLocation[];
  confidence: number;
  reasons: string[];
}

export interface AddressValidationResult {
  isValid: boolean;
  formattedAddress?: string;
  coordinates?: { lat: number; lng: number };
  placeId?: string;
  confidence: number;
}

export class LocationService {
  private static readonly DUPLICATE_THRESHOLD = 0.8;
  private static readonly PROXIMITY_THRESHOLD = 100; // meters

  /**
   * Enhanced duplicate detection with multiple criteria
   */
  static async detectDuplicate(
    newLocation: Partial<LocationSubmission>,
    existingLocations: AmalaLocation[]
  ): Promise<DuplicateCheckResult> {
    const similarLocations: AmalaLocation[] = [];
    const reasons: string[] = [];
    let maxConfidence = 0;

    for (const existing of existingLocations) {
      const checks = await this.performDuplicateChecks(newLocation, existing);

      if (checks.overallScore > this.DUPLICATE_THRESHOLD) {
        similarLocations.push(existing);
        reasons.push(...checks.reasons);
        maxConfidence = Math.max(maxConfidence, checks.overallScore);
      }
    }

    return {
      isDuplicate: similarLocations.length > 0,
      similarLocations,
      confidence: maxConfidence,
      reasons: [...new Set(reasons)], // Remove duplicates
    };
  }

  private static async performDuplicateChecks(
    newLocation: Partial<LocationSubmission>,
    existing: AmalaLocation
  ) {
    const checks = {
      nameScore: 0,
      addressScore: 0,
      phoneScore: 0,
      proximityScore: 0,
      reasons: [] as string[],
    };

    // Name similarity check
    if (newLocation.name && existing.name) {
      checks.nameScore = this.calculateStringSimilarity(
        newLocation.name.toLowerCase().trim(),
        existing.name.toLowerCase().trim()
      );

      if (checks.nameScore > 0.9) {
        checks.reasons.push(`Very similar name: "${existing.name}"`);
      }
    }

    // Address similarity check
    if (newLocation.address && existing.address) {
      checks.addressScore = this.calculateStringSimilarity(
        this.normalizeAddress(newLocation.address),
        this.normalizeAddress(existing.address)
      );

      if (checks.addressScore > 0.8) {
        checks.reasons.push(`Similar address: "${existing.address}"`);
      }
    }

    // Phone number check
    if (newLocation.phone && existing.phone) {
      const normalizedNew = this.normalizePhone(newLocation.phone);
      const normalizedExisting = this.normalizePhone(existing.phone);

      if (normalizedNew === normalizedExisting) {
        checks.phoneScore = 1.0;
        checks.reasons.push(`Same phone number: ${existing.phone}`);
      }
    }

    // Calculate overall score with weighted importance
    const weights = {
      name: 0.4,
      address: 0.3,
      phone: 0.2,
      proximity: 0.1,
    };

    const overallScore =
      checks.nameScore * weights.name +
      checks.addressScore * weights.address +
      checks.phoneScore * weights.phone +
      checks.proximityScore * weights.proximity;

    return { ...checks, overallScore };
  }

  /**
   * Validate address using Google Places API
   */
  static async validateAddress(
    address: string
  ): Promise<AddressValidationResult> {
    try {
      // In a real implementation, you'd call Google Places API
      // For now, we'll simulate validation
      const isValid = address.length > 10 && address.includes("Lagos");

      if (isValid) {
        return {
          isValid: true,
          formattedAddress: address,
          coordinates: { lat: 6.5244, lng: 3.3792 }, // Default Lagos coordinates
          confidence: 0.8,
        };
      }

      return {
        isValid: false,
        confidence: 0.2,
      };
    } catch (error) {
      return {
        isValid: false,
        confidence: 0,
      };
    }
  }

  /**
   * Calculate distance between two coordinates
   */
  static calculateDistance(
    coord1: { lat: number; lng: number },
    coord2: { lat: number; lng: number }
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (coord1.lat * Math.PI) / 180;
    const φ2 = (coord2.lat * Math.PI) / 180;
    const Δφ = ((coord2.lat - coord1.lat) * Math.PI) / 180;
    const Δλ = ((coord2.lng - coord1.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private static calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    if (str1.length === 0 || str2.length === 0) return 0.0;

    // Use Jaro-Winkler similarity for better name matching
    return this.jaroWinklerSimilarity(str1, str2);
  }

  private static jaroWinklerSimilarity(s1: string, s2: string): number {
    const jaro = this.jaroSimilarity(s1, s2);

    if (jaro < 0.7) return jaro;

    // Calculate common prefix length (up to 4 characters)
    let prefix = 0;
    for (let i = 0; i < Math.min(s1.length, s2.length, 4); i++) {
      if (s1[i] === s2[i]) prefix++;
      else break;
    }

    return jaro + 0.1 * prefix * (1 - jaro);
  }

  private static jaroSimilarity(s1: string, s2: string): number {
    if (s1 === s2) return 1.0;

    const len1 = s1.length;
    const len2 = s2.length;
    const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;

    const s1Matches = new Array(len1).fill(false);
    const s2Matches = new Array(len2).fill(false);

    let matches = 0;
    let transpositions = 0;

    // Find matches
    for (let i = 0; i < len1; i++) {
      const start = Math.max(0, i - matchWindow);
      const end = Math.min(i + matchWindow + 1, len2);

      for (let j = start; j < end; j++) {
        if (s2Matches[j] || s1[i] !== s2[j]) continue;
        s1Matches[i] = s2Matches[j] = true;
        matches++;
        break;
      }
    }

    if (matches === 0) return 0.0;

    // Find transpositions
    let k = 0;
    for (let i = 0; i < len1; i++) {
      if (!s1Matches[i]) continue;
      while (!s2Matches[k]) k++;
      if (s1[i] !== s2[k]) transpositions++;
      k++;
    }

    return (
      (matches / len1 +
        matches / len2 +
        (matches - transpositions / 2) / matches) /
      3
    );
  }

  private static normalizeAddress(address: string): string {
    return address
      .toLowerCase()
      .replace(/\b(street|st|road|rd|avenue|ave|lane|ln)\b/g, "")
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  private static normalizePhone(phone: string): string {
    return phone.replace(/\D/g, "");
  }
}
