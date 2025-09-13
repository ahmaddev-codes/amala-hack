import { createClient } from "@supabase/supabase-js";
import { AmalaLocation, LocationFilter } from "@/types/location";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing required Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey); // Database schema types
export interface Database {
  public: {
    Tables: {
      amala_locations: {
        Row: AmalaLocation;
        Insert: Omit<AmalaLocation, "id" | "submittedAt" | "moderatedAt">;
        Update: Partial<AmalaLocation>;
      };
      location_submissions: {
        Row: {
          id: string;
          location_data: AmalaLocation;
          submitter_ip: string;
          submission_method: "chat" | "form" | "voice";
          created_at: string;
          status: "pending" | "approved" | "rejected";
        };
      };
      moderation_logs: {
        Row: {
          id: string;
          location_id: string;
          moderator_id: string;
          action: "approve" | "reject";
          reason?: string;
          created_at: string;
        };
      };
    };
  };
}

// Helper functions for database operations
export const dbOperations = {
  // Locations
  async getLocations(filters?: LocationFilter) {
    console.log("🗄️ Database: Querying amala_locations table...");
    console.log("📊 Filters applied:", filters);

    let query = supabase
      .from("amala_locations")
      .select("*")
      .eq("status", "approved");

    if (filters?.isOpenNow) {
      query = query.eq("isOpenNow", true);
    }

    if (filters?.serviceType && filters.serviceType !== "all") {
      query = query.in("serviceType", [filters.serviceType, "both"]);
    }

    if (filters?.priceRange?.length) {
      query = query.in("priceRange", filters.priceRange);
    }

    console.log("📤 Executing Supabase query...");
    const { data, error } = await query;

    if (error) {
      console.error("❌ Supabase query error:", error);
      throw error;
    }

    console.log(`📥 Supabase returned ${data?.length || 0} locations`);

    return data || [];
  },

  async createLocation(
    location: Omit<AmalaLocation, "id" | "submittedAt" | "moderatedAt">
  ) {
    const { data, error } = await supabase
      .from("amala_locations")
      .insert({
        ...location,
        id: crypto.randomUUID(),
        submittedAt: new Date().toISOString(),
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Moderation
  async getPendingLocations() {
    const { data, error } = await supabase
      .from("amala_locations")
      .select("*")
      .eq("status", "pending")
      .order("submittedAt", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getLocationsByStatus(status: "pending" | "approved" | "rejected") {
    const { data, error } = await supabase
      .from("amala_locations")
      .select("*")
      .eq("status", status)
      .order("submittedAt", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async updateLocationStatus(
    locationId: string,
    status: "pending" | "approved" | "rejected"
  ) {
    console.log(`🔄 Updating location ${locationId} to status: ${status}`);

    // First, try with minimal fields to avoid column issues
    const { data, error } = await supabase
      .from("amala_locations")
      .update({
        status,
      })
      .eq("id", locationId)
      .select()
      .single();

    if (error) {
      console.error("❌ Database update error:", error);
      throw error;
    }

    console.log("✅ Location status updated successfully:", data);
    return data;
  },

  async moderateLocation(
    locationId: string,
    action: "approve" | "reject",
    moderatorId?: string
  ) {
    console.log(`🔄 Moderating location ${locationId}: ${action}`);

    const { data, error } = await supabase
      .from("amala_locations")
      .update({
        status: action === "approve" ? "approved" : "rejected",
      })
      .eq("id", locationId)
      .select()
      .single();

    if (error) {
      console.error("❌ Moderation error:", error);
      throw error;
    }

    console.log("✅ Location moderated successfully:", data);

    // Try to log moderation action (optional - don't fail if table doesn't exist)
    try {
      await supabase.from("moderation_logs").insert({
        id: crypto.randomUUID(),
        location_id: locationId,
        moderator_id: moderatorId || "anonymous",
        action,
        created_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.warn("⚠️ Could not log moderation action:", logError);
    }

    return data;
  },
};
