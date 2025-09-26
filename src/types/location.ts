export interface AmalaLocation {
  id: string;
  name: string;
  address: string;
  city?: string; // Added for global location context
  country?: string; // Added for global location context
  coordinates: {
    lat: number;
    lng: number;
  };
  phone?: string;
  website?: string;
  email?: string;
  description?: string;

  // Core filters
  isOpenNow: boolean;
  serviceType: "dine-in" | "takeaway" | "both";
  priceMin?: number; // Price in smallest currency unit (cents, kobo, pence)
  priceMax?: number; // Price in smallest currency unit
  currency?: string; // Currency code (NGN, USD, GBP, CAD)
  priceInfo?: string; // Human readable price e.g. "₦1,500-3,000 per person"
  priceLevel?: number; // Google Places price_level (0-4)

  // Additional metadata
  cuisine: string[];
  dietary: ("vegan" | "vegetarian" | "gluten-free" | "halal" | "kosher")[];
  specialFeatures?: string[]; // Added for highlights/amenities
  features: (
    | "wheelchair-accessible"
    | "parking"
    | "wifi"
    | "outdoor-seating"
  )[];

  // Hours of operation
  hours: {
    [key: string]: {
      open: string;
      close: string;
      isOpen: boolean;
    };
  };

  // Moderation status
  status: "pending" | "approved" | "rejected";
  submittedAt: Date;
  submittedBy?: string;
  moderatedAt?: Date;
  moderatedBy?: string;

  // Ratings and reviews (aggregated)
  rating?: number;
  reviewCount?: number;

  // Individual reviews (for client-side)
  reviews?: Review[];

  // Image URLs
  images?: string[];

  // Source information for autonomous discovery
  discoverySource?:
    | "user-submitted"
    | "web-scraping"
    | "social-media"
    | "directory"
    | "google-places-api"
    | "autonomous-discovery";
  sourceUrl?: string;
  priceRange?: string; // Price range like "$", "$$", "$$$", "$$$$"
  enrichedAt?: string;
  enrichmentSource?: string;
  lastEnriched?: Date; // Performance optimization: track when location was last enriched
}

export interface Review {
  id: string;
  location_id: string;
  author: string;
  user_id?: string;
  user_name?: string;
  user_photo?: string | null;
  rating: number; // 1-5
  text?: string;
  photos?: string[];
  date_posted: Date;
  status: "pending" | "approved" | "rejected";
}

export interface LocationFilter {
  searchQuery?: string;
  isOpenNow?: boolean;
  serviceType?: "dine-in" | "takeaway" | "both" | "all";
  priceRange?: ("$" | "$$" | "$$$" | "$$$$")[];
  cuisine?: string[];
  dietary?: string[];
  features?: string[];
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  sortBy?: "name_asc" | "name_desc" | "default";
}

export interface LocationResult {
  id?: string;
  name: string;
  address: string;
  description?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  phone?: string;
  website?: string;
  rating?: number;
  priceRange?: string;
  photos?: string[];
  source?: string;
  confidence?: number;
  cuisine?: string[];
  category?: string;
  serviceType?: "dine-in" | "takeaway" | "both";
}

export interface LocationSubmission {
  name: string;
  address: string;
  description?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  phone?: string;
  website?: string;
  rating?: number;
  priceInfo?: string;
  photos?: string[];
  cuisine: string[];
  openingHours: Record<string, any>;
  source?: string;
  confidence?: number;
}
