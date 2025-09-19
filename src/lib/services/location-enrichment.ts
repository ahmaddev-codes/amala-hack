// Utility to force Places API enrichment for existing locations
// This can be run manually or triggered from admin panel

export async function enrichLocationWithPlacesAPI(
  location: any,
  apiKey: string
) {
  try {
    console.log(`🔄 Enriching location: ${location.name}`);

    // Call your API endpoint to force enrichment
    const response = await fetch("/api/locations/enrich", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        locationId: location.id,
        address: location.address,
        name: location.name,
        forceRefresh: true,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Enriched ${location.name}:`, result);
      return result;
    } else {
      console.error(`❌ Failed to enrich ${location.name}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error enriching ${location.name}:`, error);
    return null;
  }
}

// Batch enrich all locations
export async function batchEnrichLocations() {
  try {
    const response = await fetch("/api/locations?includeReviews=false");
    const data = await response.json();
    const locations = data.locations || [];

    console.log(
      `🚀 Starting batch enrichment of ${locations.length} locations`
    );

    for (const location of locations) {
      // Skip if already has real data
      if (
        location.rating &&
        location.images?.length > 0 &&
        location.reviewCount > 0
      ) {
        console.log(`⏭️ Skipping ${location.name} - already has real data`);
        continue;
      }

      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.error('❌ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is required for enrichment');
        break;
      }
      
      await enrichLocationWithPlacesAPI(location, apiKey);

      // Add delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log("✅ Batch enrichment completed");
  } catch (error) {
    console.error("❌ Batch enrichment failed:", error);
  }
}
