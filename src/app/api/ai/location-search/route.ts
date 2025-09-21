import { NextRequest, NextResponse } from "next/server";
import { verifyBearerToken } from "@/lib/auth";
import { z } from "zod";
import { LocationResult } from "@/types/location";

const searchSchema = z.object({
  query: z.string().min(1, "Query is required"),
});

// AI-powered location search using Gemini
async function searchWithGemini(query: string): Promise<LocationResult[]> {
  const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;
  
  if (!GOOGLE_AI_API_KEY) {
    throw new Error("Google AI API key not configured");
  }

  const prompt = `
You are an expert at finding Amala restaurants and Nigerian food spots worldwide. 
Given this user query: "${query}"

Please search for and return information about Amala restaurants and Nigerian food spots that match this description.
Focus on Amala spots, Nigerian restaurants, Yoruba cuisine, and West African food joints anywhere in the world - including Nigeria, UK, USA, Canada, South Africa, and other countries with Nigerian diaspora communities.

Return your response as a JSON array of locations with this exact structure:
[
  {
    "id": "unique_id",
    "name": "Restaurant Name",
    "address": "Full address with city, state/region, country",
    "description": "Brief description focusing on Amala and Nigerian dishes served",
    "phone": "phone number if known",
    "website": "website if known", 
    "rating": 4.2,
    "priceRange": "$" or "$$" or "$$$" or "$$$$",
    "coordinates": {"lat": 6.5244, "lng": 3.3792},
    "photos": ["photo_url_if_available"],
    "source": "web_search",
    "confidence": 0.85
  }
]

Guidelines:
- Only return real, existing places you're confident about that serve Amala or Nigerian food
- Include coordinates for any global location (Nigeria, London, New York, Toronto, etc.)
- Use $ symbols for price ranges ($ = budget, $$ = moderate, $$$ = expensive, $$$$ = very expensive)
- Confidence should be 0.7-0.95 based on how well it matches the query
- Maximum 5 results
- If no specific matches, return empty array []
- Prioritize places that specifically serve Amala, but include Nigerian restaurants that likely serve it
- Include both traditional Nigerian spots and modern Nigerian fusion restaurants globally

Query: "${query}"
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) {
      return [];
    }

    // Extract JSON from the response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }

    try {
      const locations = JSON.parse(jsonMatch[0]);
      return Array.isArray(locations) ? locations : [];
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", parseError);
      return [];
    }
  } catch (error) {
    console.error("Gemini search error:", error);
    return [];
  }
}

// Fallback search using OpenStreetMap (FREE alternative to Google Places)
async function searchWithOpenStreetMap(query: string): Promise<LocationResult[]> {
  try {
    const { OpenStreetMapService } = await import('@/lib/services/openstreetmap-service');
    
    // Extract location hints from query
    const locationHints = extractLocationHints(query);
    
    // Search for Nigerian restaurants globally
    const results = await OpenStreetMapService.searchNigerianRestaurants(
      query,
      locationHints.city,
      locationHints.country,
      5
    );

    return results.map((place, index) => ({
      id: `osm_${place.id}`,
      name: place.name,
      address: place.address,
      description: `Nigerian restaurant in ${place.city || place.country}`,
      coordinates: place.coordinates,
      source: 'web_search' as const,
      confidence: Math.min(0.85, 0.6 + (place.importance * 0.3)),
    }));
  } catch (error) {
    console.error("OpenStreetMap search error:", error);
    return [];
  }
}

// Helper function to extract location hints from query
function extractLocationHints(query: string): { city?: string; country?: string } {
  const lowerQuery = query.toLowerCase();
  
  // Common cities with Nigerian diaspora
  const cities = [
    'london', 'manchester', 'birmingham', 'leeds', // UK
    'new york', 'houston', 'atlanta', 'chicago', 'los angeles', // USA
    'toronto', 'vancouver', 'montreal', // Canada
    'johannesburg', 'cape town', 'durban', // South Africa
    'lagos', 'abuja', 'ibadan', 'kano', 'port harcourt', // Nigeria
  ];
  
  const countries = [
    'nigeria', 'uk', 'united kingdom', 'usa', 'united states', 'america',
    'canada', 'south africa', 'ghana', 'kenya'
  ];
  
  const foundCity = cities.find(city => lowerQuery.includes(city));
  const foundCountry = countries.find(country => lowerQuery.includes(country));
  
  return {
    city: foundCity,
    country: foundCountry,
  };
}

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const body = await request.json();
    const { query } = searchSchema.parse(body);

    // Optional authentication - log user if available
    let userEmail = 'anonymous';
    try {
      const authResult = await verifyBearerToken(request.headers.get("authorization") || undefined);
      if (authResult.success) {
        userEmail = authResult.user?.email || 'authenticated user';
      }
    } catch (authError) {
      // Continue without authentication - this is a public search endpoint
      console.log('Auth not available, continuing as anonymous user');
    }

    console.log(`AI Location Search: "${query}" by ${userEmail}`);

    // Search using both Gemini and OpenStreetMap
    const [geminiResults, osmResults] = await Promise.allSettled([
      searchWithGemini(query),
      searchWithOpenStreetMap(query),
    ]);

    const locations: LocationResult[] = [];

    // Combine results
    if (geminiResults.status === 'fulfilled') {
      locations.push(...geminiResults.value);
    }

    if (osmResults.status === 'fulfilled') {
      locations.push(...osmResults.value);
    }

    // Remove duplicates and sort by confidence
    const uniqueLocations = locations
      .filter((location, index, self) => 
        index === self.findIndex(l => 
          l.name.toLowerCase() === location.name.toLowerCase() &&
          l.address.toLowerCase().includes(location.address.toLowerCase().split(',')[0])
        )
      )
      .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
      .slice(0, 5); // Limit to top 5 results

    return NextResponse.json({
      success: true,
      locations: uniqueLocations,
      query,
      resultsCount: uniqueLocations.length,
    });

  } catch (error) {
    console.error("Location search error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to search locations" },
      { status: 500 }
    );
  }
}
