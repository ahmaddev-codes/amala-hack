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
    "confidence": 0.85,
    "cuisine": ["Nigerian", "Amala"],
    "category": "restaurant",
    "serviceType": "both"
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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
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

// Search using Google Places API (New)
async function searchWithGooglePlaces(query: string): Promise<LocationResult[]> {
  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  if (!GOOGLE_MAPS_API_KEY) {
    console.error("Google Maps API key not configured");
    return [];
  }

  try {
    // Extract location hints from query
    const locationHints = extractLocationHints(query);
    
    // Build search query for Nigerian/Amala restaurants
    let searchQuery = `Nigerian restaurant Amala ${query}`;
    if (locationHints.city) {
      searchQuery += ` in ${locationHints.city}`;
    }
    if (locationHints.country) {
      searchQuery += ` ${locationHints.country}`;
    }

    // Use Google Places API (New) Text Search
    const response = await fetch(
      `https://places.googleapis.com/v1/places:searchText`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
          "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.priceLevel,places.photos,places.types,places.businessStatus"
        },
        body: JSON.stringify({
          textQuery: searchQuery,
          maxResultCount: 10,
          languageCode: "en"
        })
      }
    );

    if (!response.ok) {
      console.error(`Google Places API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const places = data.places || [];

    return places
      .filter((place: any) => 
        place.businessStatus === 'OPERATIONAL' &&
        (place.types?.includes('restaurant') || place.types?.includes('food'))
      )
      .slice(0, 5)
      .map((place: any, index: number) => ({
        id: `places_${place.id}`,
        name: place.displayName?.text || 'Unknown Restaurant',
        address: place.formattedAddress || 'Address not available',
        description: `Nigerian restaurant serving Amala and traditional dishes`,
        coordinates: {
          lat: place.location?.latitude || 0,
          lng: place.location?.longitude || 0,
        },
        rating: place.rating || undefined,
        priceRange: getPriceRange(place.priceLevel, place.formattedAddress),
        photos: place.photos?.slice(0, 1).map((photo: any) => 
          `https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=400&maxWidthPx=400&key=${GOOGLE_MAPS_API_KEY}`
        ) || [],
        source: 'google_places' as const,
        confidence: Math.min(0.9, 0.7 + (place.rating ? place.rating / 5 * 0.2 : 0)),
        // Add required fields for validation
        cuisine: ['Nigerian', 'Amala'],
        category: 'restaurant',
        serviceType: 'both' as const,
      }));
  } catch (error) {
    console.error("Google Places search error:", error);
    return [];
  }
}

// Helper function to convert Google Places price level to actual price ranges
function getPriceRange(priceLevel?: number, address?: string): string | undefined {
  if (priceLevel === undefined) return undefined;
  
  const currency = getCurrencyByLocation(address);
  
  switch (priceLevel) {
    case 0: return `${currency.symbol}0 - ${currency.symbol}${currency.low}`;
    case 1: return `${currency.symbol}${currency.low} - ${currency.symbol}${currency.moderate}`;
    case 2: return `${currency.symbol}${currency.moderate} - ${currency.symbol}${currency.high}`;
    case 3: return `${currency.symbol}${currency.high} - ${currency.symbol}${currency.veryHigh}`;
    case 4: return `${currency.symbol}${currency.veryHigh}+`;
    default: return `${currency.symbol}${currency.low} - ${currency.symbol}${currency.moderate}`;
  }
}

// Helper function to get currency by location
function getCurrencyByLocation(address?: string): {
  symbol: string;
  code: string;
  low: number;
  moderate: number;
  high: number;
  veryHigh: number;
} {
  if (!address) {
    return { symbol: "₦", code: "NGN", low: 500, moderate: 2000, high: 5000, veryHigh: 10000 };
  }

  const lowerAddress = address.toLowerCase();

  // Nigeria
  if (lowerAddress.includes("nigeria") || lowerAddress.includes("lagos") || 
      lowerAddress.includes("abuja") || lowerAddress.includes("ibadan")) {
    return { symbol: "₦", code: "NGN", low: 500, moderate: 2000, high: 5000, veryHigh: 10000 };
  }

  // UK
  if (lowerAddress.includes("uk") || lowerAddress.includes("united kingdom") || 
      lowerAddress.includes("london") || lowerAddress.includes("manchester") ||
      lowerAddress.includes("birmingham") || lowerAddress.includes("england")) {
    return { symbol: "£", code: "GBP", low: 8, moderate: 15, high: 25, veryHigh: 40 };
  }

  // USA
  if (lowerAddress.includes("usa") || lowerAddress.includes("united states") || 
      lowerAddress.includes("new york") || lowerAddress.includes("houston") ||
      lowerAddress.includes("atlanta") || lowerAddress.includes("chicago")) {
    return { symbol: "$", code: "USD", low: 10, moderate: 20, high: 35, veryHigh: 50 };
  }

  // Canada
  if (lowerAddress.includes("canada") || lowerAddress.includes("toronto") || 
      lowerAddress.includes("vancouver") || lowerAddress.includes("montreal")) {
    return { symbol: "C$", code: "CAD", low: 12, moderate: 25, high: 40, veryHigh: 60 };
  }

  // Australia
  if (lowerAddress.includes("australia") || lowerAddress.includes("sydney") || 
      lowerAddress.includes("melbourne") || lowerAddress.includes("brisbane")) {
    return { symbol: "A$", code: "AUD", low: 15, moderate: 25, high: 40, veryHigh: 60 };
  }

  // Default to Naira for unknown locations
  return { symbol: "₦", code: "NGN", low: 500, moderate: 2000, high: 5000, veryHigh: 10000 };
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

    // Search using both Gemini and Google Places
    const [geminiResults, placesResults] = await Promise.allSettled([
      searchWithGemini(query),
      searchWithGooglePlaces(query),
    ]);

    const locations: LocationResult[] = [];

    // Combine results
    if (geminiResults.status === 'fulfilled') {
      locations.push(...geminiResults.value);
    }

    if (placesResults.status === 'fulfilled') {
      locations.push(...placesResults.value);
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
