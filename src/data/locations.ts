import { AmalaLocation } from "../types/location";

// Real Amala locations across Lagos, Nigeria with accurate coordinates
export const sampleLocations: AmalaLocation[] = [
  {
    id: "1",
    name: "Amala Palace",
    address: "23 Ikorodu Road, Fadeyi, Lagos, Nigeria",
    coordinates: { lat: 6.5359, lng: 3.3692 }, // Fadeyi area
    phone: "+234 801 234 5678",
    website: "https://amalapalace.ng",
    description:
      "Authentic Amala with variety of traditional soups including Ewedu, Gbegiri, and Ila",
    isOpenNow: true,
    serviceType: "both",
    priceRange: "$$",
    cuisine: ["Nigerian", "Yoruba", "Traditional"],
    dietary: ["gluten-free"],
    features: ["parking", "wifi", "outdoor-seating"],
    hours: {
      monday: { open: "08:00", close: "22:00", isOpen: true },
      tuesday: { open: "08:00", close: "22:00", isOpen: true },
      wednesday: { open: "08:00", close: "22:00", isOpen: true },
      thursday: { open: "08:00", close: "22:00", isOpen: true },
      friday: { open: "08:00", close: "23:00", isOpen: true },
      saturday: { open: "09:00", close: "23:00", isOpen: true },
      sunday: { open: "10:00", close: "21:00", isOpen: true },
    },
    status: "approved",
    submittedAt: new Date("2024-09-01"),
    moderatedAt: new Date("2024-09-02"),
    rating: 4.5,
    reviewCount: 127,
    images: [],
    discoverySource: "user-submitted",
  },
  {
    id: "2",
    name: "Mama Sidi Amala Spot",
    address: "45 Allen Avenue, Ikeja, Lagos, Nigeria",
    coordinates: { lat: 6.6018, lng: 3.3515 }, // Ikeja
    phone: "+234 802 345 6789",
    description:
      "Local favorite known for fresh Amala and authentic Ewedu soup. Family-owned since 1995",
    isOpenNow: false,
    serviceType: "dine-in",
    priceRange: "$",
    cuisine: ["Nigerian", "Yoruba", "Home-style"],
    dietary: ["vegetarian"],
    features: ["outdoor-seating"],
    hours: {
      monday: { open: "07:00", close: "18:00", isOpen: false },
      tuesday: { open: "07:00", close: "18:00", isOpen: false },
      wednesday: { open: "07:00", close: "18:00", isOpen: false },
      thursday: { open: "07:00", close: "18:00", isOpen: false },
      friday: { open: "07:00", close: "18:00", isOpen: false },
      saturday: { open: "08:00", close: "17:00", isOpen: false },
      sunday: { open: "09:00", close: "16:00", isOpen: false },
    },
    status: "approved",
    submittedAt: new Date("2024-08-28"),
    moderatedAt: new Date("2024-08-29"),
    rating: 4.2,
    reviewCount: 89,
    discoverySource: "user-submitted",
  },
  {
    id: "3",
    name: "Lagos Island Amala Hub",
    address: "12 Broad Street, Lagos Island, Lagos, Nigeria",
    coordinates: { lat: 6.4541, lng: 3.3947 }, // Lagos Island
    phone: "+234 803 456 7890",
    website: "https://lagosislandamala.com",
    email: "info@lagosislandamala.com",
    description:
      "Premium Amala experience in the heart of Lagos Island with air-conditioned dining",
    isOpenNow: true,
    serviceType: "both",
    priceRange: "$$$",
    cuisine: ["Nigerian", "Yoruba", "Fusion"],
    dietary: ["vegan", "vegetarian", "gluten-free"],
    features: ["wheelchair-accessible", "wifi", "parking"],
    hours: {
      monday: { open: "11:00", close: "23:00", isOpen: true },
      tuesday: { open: "11:00", close: "23:00", isOpen: true },
      wednesday: { open: "11:00", close: "23:00", isOpen: true },
      thursday: { open: "11:00", close: "23:00", isOpen: true },
      friday: { open: "11:00", close: "00:00", isOpen: true },
      saturday: { open: "10:00", close: "00:00", isOpen: true },
      sunday: { open: "12:00", close: "22:00", isOpen: true },
    },
    status: "approved",
    submittedAt: new Date("2024-09-05"),
    moderatedAt: new Date("2024-09-06"),
    rating: 4.7,
    reviewCount: 203,
    discoverySource: "social-media",
  },
  {
    id: "4",
    name: "Bukky's Amala Express",
    address: "78 Adeniran Ogunsanya Street, Surulere, Lagos, Nigeria",
    coordinates: { lat: 6.4969, lng: 3.3602 }, // Surulere
    phone: "+234 804 567 8901",
    description:
      "Fast-casual Amala spot popular with office workers. Known for quick service and consistent quality",
    isOpenNow: true,
    serviceType: "takeaway",
    priceRange: "$",
    cuisine: ["Nigerian", "Fast-casual"],
    dietary: ["gluten-free"],
    features: ["wifi"],
    hours: {
      monday: { open: "09:00", close: "19:00", isOpen: true },
      tuesday: { open: "09:00", close: "19:00", isOpen: true },
      wednesday: { open: "09:00", close: "19:00", isOpen: true },
      thursday: { open: "09:00", close: "19:00", isOpen: true },
      friday: { open: "09:00", close: "20:00", isOpen: true },
      saturday: { open: "10:00", close: "18:00", isOpen: true },
      sunday: { open: "11:00", close: "17:00", isOpen: true },
    },
    status: "approved",
    submittedAt: new Date("2024-08-15"),
    moderatedAt: new Date("2024-08-16"),
    rating: 4.1,
    reviewCount: 156,
    discoverySource: "user-submitted",
  },
  {
    id: "5",
    name: "Victoria Island Amala Lounge",
    address: "15 Adeola Odeku Street, Victoria Island, Lagos, Nigeria",
    coordinates: { lat: 6.4281, lng: 3.4219 }, // Victoria Island
    phone: "+234 805 678 9012",
    website: "https://viamala.com",
    email: "reservations@viamala.com",
    description:
      "Upscale Amala restaurant with modern ambiance and traditional flavors. Perfect for business meals",
    isOpenNow: true,
    serviceType: "dine-in",
    priceRange: "$$$$",
    cuisine: ["Nigerian", "Contemporary", "Fine-dining"],
    dietary: ["vegan", "vegetarian", "gluten-free", "halal"],
    features: ["wheelchair-accessible", "wifi", "parking", "outdoor-seating"],
    hours: {
      monday: { open: "12:00", close: "23:00", isOpen: true },
      tuesday: { open: "12:00", close: "23:00", isOpen: true },
      wednesday: { open: "12:00", close: "23:00", isOpen: true },
      thursday: { open: "12:00", close: "23:00", isOpen: true },
      friday: { open: "12:00", close: "00:00", isOpen: true },
      saturday: { open: "11:00", close: "00:00", isOpen: true },
      sunday: { open: "14:00", close: "22:00", isOpen: true },
    },
    status: "approved",
    submittedAt: new Date("2024-09-10"),
    moderatedAt: new Date("2024-09-11"),
    rating: 4.8,
    reviewCount: 342,
    images: [],
    discoverySource: "social-media",
  },
  {
    id: "6",
    name: "Yaba Amala Corner",
    address: "34 Herbert Macaulay Way, Yaba, Lagos, Nigeria",
    coordinates: { lat: 6.5158, lng: 3.3696 }, // Yaba
    phone: "+234 806 789 0123",
    description:
      "Student-friendly Amala spot near University of Lagos. Great portions at affordable prices",
    isOpenNow: false,
    serviceType: "both",
    priceRange: "$",
    cuisine: ["Nigerian", "Student-friendly"],
    dietary: ["vegetarian"],
    features: ["wifi"],
    hours: {
      monday: { open: "06:30", close: "20:00", isOpen: false },
      tuesday: { open: "06:30", close: "20:00", isOpen: false },
      wednesday: { open: "06:30", close: "20:00", isOpen: false },
      thursday: { open: "06:30", close: "20:00", isOpen: false },
      friday: { open: "06:30", close: "21:00", isOpen: false },
      saturday: { open: "07:00", close: "21:00", isOpen: false },
      sunday: { open: "08:00", close: "19:00", isOpen: false },
    },
    status: "approved",
    submittedAt: new Date("2024-08-20"),
    moderatedAt: new Date("2024-08-21"),
    rating: 3.9,
    reviewCount: 78,
    discoverySource: "user-submitted",
  },
  {
    id: "7",
    name: "Mushin Amala Mama",
    address: "67 Agege Motor Road, Mushin, Lagos, Nigeria",
    coordinates: { lat: 6.5244, lng: 3.3437 }, // Mushin
    phone: "+234 807 890 1234",
    description:
      "Authentic street-style Amala in Mushin. Local atmosphere with the most traditional preparation methods",
    isOpenNow: true,
    serviceType: "dine-in",
    priceRange: "$",
    cuisine: ["Nigerian", "Street-food", "Traditional"],
    dietary: [],
    features: ["outdoor-seating"],
    hours: {
      monday: { open: "06:00", close: "19:00", isOpen: true },
      tuesday: { open: "06:00", close: "19:00", isOpen: true },
      wednesday: { open: "06:00", close: "19:00", isOpen: true },
      thursday: { open: "06:00", close: "19:00", isOpen: true },
      friday: { open: "06:00", close: "20:00", isOpen: true },
      saturday: { open: "06:30", close: "20:00", isOpen: true },
      sunday: { open: "07:00", close: "18:00", isOpen: true },
    },
    status: "approved",
    submittedAt: new Date("2024-09-03"),
    moderatedAt: new Date("2024-09-04"),
    rating: 4.3,
    reviewCount: 92,
    discoverySource: "user-submitted",
  },
  {
    id: "8",
    name: "Ajah Amala Garden",
    address: "123 Lekki-Epe Expressway, Ajah, Lagos, Nigeria",
    coordinates: { lat: 6.4667, lng: 3.6 }, // Ajah
    phone: "+234 808 901 2345",
    website: "https://ajahamalagarden.com",
    description:
      "Garden-style Amala restaurant with outdoor dining and live traditional music on weekends",
    isOpenNow: false,
    serviceType: "both",
    priceRange: "$$",
    cuisine: ["Nigerian", "Garden-dining", "Entertainment"],
    dietary: ["vegetarian", "gluten-free"],
    features: ["outdoor-seating", "parking", "wifi"],
    hours: {
      monday: { open: "11:00", close: "22:00", isOpen: false },
      tuesday: { open: "11:00", close: "22:00", isOpen: false },
      wednesday: { open: "11:00", close: "22:00", isOpen: false },
      thursday: { open: "11:00", close: "22:00", isOpen: false },
      friday: { open: "11:00", close: "23:00", isOpen: false },
      saturday: { open: "10:00", close: "23:00", isOpen: false },
      sunday: { open: "12:00", close: "21:00", isOpen: false },
    },
    status: "approved",
    submittedAt: new Date("2024-09-07"),
    moderatedAt: new Date("2024-09-08"),
    rating: 4.4,
    reviewCount: 167,
    images: [],
    discoverySource: "social-media",
  },
];

// Helper function to filter locations based on criteria
export const filterLocations = (
  locations: AmalaLocation[],
  filters: {
    searchQuery?: string;
    isOpenNow?: boolean;
    serviceType?: string;
    priceRange?: string[];
    cuisine?: string[];
  }
) => {
  return locations.filter((location) => {
    // Search query filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const matchesName = location.name.toLowerCase().includes(query);
      const matchesAddress = location.address.toLowerCase().includes(query);
      const matchesCuisine = location.cuisine.some((c) =>
        c.toLowerCase().includes(query)
      );
      if (!matchesName && !matchesAddress && !matchesCuisine) return false;
    }

    // Open now filter
    if (
      filters.isOpenNow !== undefined &&
      location.isOpenNow !== filters.isOpenNow
    ) {
      return false;
    }

    // Service type filter
    if (filters.serviceType && filters.serviceType !== "all") {
      if (
        location.serviceType !== filters.serviceType &&
        location.serviceType !== "both"
      ) {
        return false;
      }
    }

    // Price range filter
    if (filters.priceRange && filters.priceRange.length > 0) {
      if (!filters.priceRange.includes(location.priceRange)) {
        return false;
      }
    }

    // Cuisine filter
    if (filters.cuisine && filters.cuisine.length > 0) {
      const hasMatchingCuisine = filters.cuisine.some((c) =>
        location.cuisine.some((lc) =>
          lc.toLowerCase().includes(c.toLowerCase())
        )
      );
      if (!hasMatchingCuisine) return false;
    }

    return true;
  });
};
