import { supabase } from "./supabase";
import { sampleLocations } from "@/data/locations";

export async function initializeDatabase() {
  try {
    console.log("🔄 Checking database connection...");

    // Test connection
    const { error: testError } = await supabase
      .from("amala_locations")
      .select("count")
      .limit(1);

    if (testError) {
      console.error("❌ Database connection failed:", testError);
      return { success: false, error: testError.message };
    }

    console.log("✅ Database connection successful");

    // Check if we have any data
    const { data: existingLocations, error: countError } = await supabase
      .from("amala_locations")
      .select("id")
      .limit(1);

    if (countError) {
      console.error("❌ Error checking existing data:", countError);
      return { success: false, error: countError.message };
    }

    // If no data exists, insert sample data
    if (!existingLocations || existingLocations.length === 0) {
      console.log("📝 No data found, inserting sample locations...");

      const locationsToInsert = sampleLocations
        .filter((loc) => loc.status === "approved")
        .map((loc) => ({
          name: loc.name,
          address: loc.address,
          coordinates: loc.coordinates,
          phone: loc.phone,
          website: loc.website,
          description: loc.description,
          isOpenNow: loc.isOpenNow,
          serviceType: loc.serviceType,
          priceRange: loc.priceRange,
          cuisine: loc.cuisine,
          dietary: loc.dietary,
          features: loc.features,
          hours: loc.hours,
          status: loc.status,
          submittedAt: loc.submittedAt.toISOString(),
          moderatedAt: loc.moderatedAt?.toISOString(),
          rating: loc.rating,
          reviewCount: loc.reviewCount,
          discoverySource: loc.discoverySource,
          sourceUrl: loc.sourceUrl,
        }));

      const { data: insertedData, error: insertError } = await supabase
        .from("amala_locations")
        .insert(locationsToInsert)
        .select();

      if (insertError) {
        console.error("❌ Error inserting sample data:", insertError);
        return { success: false, error: insertError.message };
      }

      console.log(
        `✅ Successfully inserted ${insertedData?.length || 0} sample locations`
      );
    } else {
      console.log("✅ Database already has data");
    }

    return { success: true };
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function checkDatabaseHealth() {
  try {
    const { data, error } = await supabase
      .from("amala_locations")
      .select("count")
      .eq("status", "approved");

    if (error) {
      return { healthy: false, error: error.message };
    }

    return { healthy: true, approvedCount: data?.length || 0 };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
