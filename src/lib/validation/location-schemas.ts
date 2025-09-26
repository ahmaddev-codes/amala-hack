import { z } from "zod";

// Base coordinate schema
const CoordinateSchema = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
});

// Hours schema for each day
const DayHoursSchema = z.object({
    open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
    close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
    isOpen: z.boolean(),
});

// Hours schema for all days
const HoursSchema = z.object({
    monday: DayHoursSchema,
    tuesday: DayHoursSchema,
    wednesday: DayHoursSchema,
    thursday: DayHoursSchema,
    friday: DayHoursSchema,
    saturday: DayHoursSchema,
    sunday: DayHoursSchema,
});

// Review schema
const ReviewSchema = z.object({
    id: z.string().uuid(),
    location_id: z.string().uuid(),
    author: z.string().min(1).max(100),
    rating: z.number().min(1).max(5),
    text: z.string().max(1000).optional(),
    date_posted: z.date(),
    status: z.enum(["pending", "approved", "rejected"]),
});

// Location submission schema (for POST requests)
export const LocationSubmissionSchema = z.object({
    name: z.string()
        .min(2, "Name must be at least 2 characters")
        .max(100, "Name must be less than 100 characters")
        .transform((val) => val.trim().replace(/\s+/g, " ")), // Normalize whitespace
    address: z.string()
        .min(5, "Address must be at least 5 characters")
        .max(200, "Address must be less than 200 characters")
        .transform((val) => val.trim().replace(/\s+/g, " ")), // Normalize whitespace
    coordinates: CoordinateSchema.optional(),
    phone: z.string()
        .regex(/^[\+]?[\d\s\-\(\)]{7,20}$/, "Invalid phone number format")
        .optional()
        .or(z.literal(""))
        .transform((val) => val?.replace(/\s+/g, "")), // Remove spaces
    website: z.string()
        .url("Invalid website URL")
        .optional()
        .or(z.literal(""))
        .transform((val) => val?.toLowerCase()),
    email: z.string()
        .email("Invalid email format")
        .optional()
        .or(z.literal(""))
        .transform((val) => val?.toLowerCase()),
    description: z.string()
        .max(500, "Description must be less than 500 characters")
        .optional()
        .transform((val) => val?.trim()),

    // Core filters
    isOpenNow: z.boolean().default(true),
    serviceType: z.enum(["dine-in", "takeaway", "both"]).default("both"),
    priceRange: z.enum(["$", "$$", "$$$", "$$$$"]).default("$$"),
    priceInfo: z.string()
        .max(100, "Price info must be less than 100 characters")
        .optional()
        .transform((val) => val?.trim()),

    // Additional metadata
    cuisine: z.array(z.string().min(1).max(50))
        .min(1, "At least one cuisine type is required")
        .max(10, "Maximum 10 cuisine types allowed")
        .default(["Nigerian"])
        .transform((arr) => arr.map(c => c.trim().toLowerCase())),
    dietary: z.array(z.enum(["vegan", "vegetarian", "gluten-free", "halal", "kosher"]))
        .default([]),
    features: z.array(z.enum(["wheelchair-accessible", "parking", "wifi", "outdoor-seating"]))
        .default([]),

    // Hours of operation
    hours: HoursSchema.optional(),

    // Ratings
    rating: z.number().min(1).max(5).optional(),
    reviewCount: z.number().min(0).optional(),

    // Images
    images: z.array(z.string().url("Invalid image URL")).default([]),

    // Source information
    discoverySource: z.enum([
        "user-submitted",
        "web-scraping",
        "social-media",
        "directory",
        "google-places-api",
        "autonomous-discovery"
    ]).default("user-submitted"),
    sourceUrl: z.string().url("Invalid source URL").optional(),

    // Submitter info (for user submissions)
    submitterInfo: z.object({
        name: z.string().min(1).max(100).optional(),
        email: z.string().email().optional(),
    }).optional(),
});

// Location update schema (for PUT requests)
export const LocationUpdateSchema = LocationSubmissionSchema.partial().extend({
    id: z.string().uuid(),
    status: z.enum(["pending", "approved", "rejected"]).optional(),
    moderatedAt: z.date().optional(),
    moderatedBy: z.string().optional(),
});

// Full location schema (for database operations)
export const AmalaLocationSchema = LocationSubmissionSchema.extend({
    id: z.string().uuid(),
    status: z.enum(["pending", "approved", "rejected"]),
    submittedAt: z.date(),
    submittedBy: z.string().optional(),
    moderatedAt: z.date().optional(),
    moderatedBy: z.string().optional(),
    reviews: z.array(ReviewSchema).default([]),
});

// Query parameters schema for GET requests
export const LocationQuerySchema = z.object({
    search: z.string().optional(),
    openNow: z.string().transform(val => val === "true").optional(),
    serviceType: z.enum(["dine-in", "takeaway", "both", "all"]).optional(),
    priceRange: z.array(z.enum(["$", "$$", "$$$", "$$$$"])).optional(),
    cuisine: z.array(z.string()).optional(),
    dietary: z.array(z.string()).optional(),
    features: z.array(z.string()).optional(),
    includeReviews: z.string().transform(val => val === "true").optional(),
    sortBy: z.enum(["name_asc", "name_desc", "default"]).default("default"),
    bounds: z.object({
        north: z.number(),
        south: z.number(),
        east: z.number(),
        west: z.number(),
    }).optional(),
});

// Moderation schema
export const ModerationSchema = z.object({
    locationId: z.string().uuid(),
    action: z.enum(["approve", "reject"]),
    reason: z.string().max(200).optional(),
    notes: z.string().max(500).optional(),
});

// Analytics event schema
export const AnalyticsEventSchema = z.object({
    event_type: z.string().min(1).max(50),
    location_id: z.string().uuid().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
});

export type LocationSubmissionInput = z.input<typeof LocationSubmissionSchema>;
export type LocationSubmissionOutput = z.output<typeof LocationSubmissionSchema>;
export type LocationUpdateInput = z.input<typeof LocationUpdateSchema>;
export type LocationUpdateOutput = z.output<typeof LocationUpdateSchema>;
export type AmalaLocationInput = z.input<typeof AmalaLocationSchema>;
export type AmalaLocationOutput = z.output<typeof AmalaLocationSchema>;
export type LocationQueryInput = z.input<typeof LocationQuerySchema>;
export type LocationQueryOutput = z.output<typeof LocationQuerySchema>;
export type ModerationInput = z.input<typeof ModerationSchema>;
export type ModerationOutput = z.output<typeof ModerationSchema>;
export type AnalyticsEventInput = z.input<typeof AnalyticsEventSchema>;
export type AnalyticsEventOutput = z.output<typeof AnalyticsEventSchema>;
