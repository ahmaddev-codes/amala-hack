import { supabase } from "./supabase";

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
