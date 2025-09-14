export interface AmalaLocation {
  id: string;
  name: string;
  address: string;
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
  priceRange: "$" | "$$" | "$$$" | "$$$$";
  priceInfo?: string; // Real price details e.g. "₦1000-3000 per person"

  // Additional metadata
  cuisine: string[];
  dietary: ("vegan" | "vegetarian" | "gluten-free" | "halal" | "kosher")[];
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
}

export interface Review {
  id: string;
  location_id: string;
  author: string;
  rating: number; // 1-5
  text?: string;
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
  sortBy?: 'name_asc' | 'name_desc' | 'default';
}

export interface LocationSubmission {
  name: string;
  address: string;
  phone?: string;
  website?: string;
  description?: string;
  serviceType: "dine-in" | "takeaway" | "both";
  priceRange: "$" | "$$" | "$$$" | "$$$$";
  priceInfo?: string;
  cuisine: string[];
  submitterInfo?: {
    name?: string;
    email?: string;
  };
}
