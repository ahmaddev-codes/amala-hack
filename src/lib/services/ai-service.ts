import { GoogleGenerativeAI } from "@google/generative-ai";
import { LocationSubmission, AmalaLocation } from "@/types/location";
import { AutonomousDiscoveryService } from "./autonomous-discovery";

// Initialize Google Gemini client
const genAI = process.env.GOOGLE_GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY)
  : null;

export interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIExtractionResult {
  extracted: Partial<LocationSubmission>;
  confidence: number;
  missingFields: string[];
  suggestions: string[];
  nextAction?:
    | "askUserForData"
    | "performWebSearch"
    | "askChoice"
    | "askClarify"
    | "complete";
  searchResults?: Partial<AmalaLocation>[];
}

export class AILocationService {
  static async extractLocationInfo(
    userMessage: string,
    conversationHistory: ConversationMessage[] = []
  ): Promise<AIExtractionResult> {
    // Check if Gemini is configured
    if (!genAI) {
      return this.fallbackExtraction(userMessage);
    }

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

      const prompt = `
You are an advanced AI assistant specialized in helping users add authentic Amala restaurants to a global directory.

CONTEXT: This is a worldwide platform for discovering Nigerian Amala restaurants, not just in Lagos or Nigeria - users can add spots from any city globally where Nigerian diaspora communities have established Amala restaurants.

CONVERSATION FLOW:
1. First interaction: Ask user to choose between:
   - Option A: "I have specific restaurant details to add"
   - Option B: "Help me find Amala spots in my area/city"

2. Based on their choice:
   - Option A: Extract details from their manual input
   - Option B: Use autonomous discovery to find verified restaurants

USER MESSAGE: "${userMessage}"

CONVERSATION HISTORY:
${conversationHistory.map((msg) => `${msg.role}: ${msg.content}`).join("\n")}

EXTRACTION RULES:
- Extract ONLY information explicitly mentioned by the user
- Do not fabricate or assume details not provided
- For global locations, extract city/country information carefully
- Convert pricing mentions to real currency values with min/max ranges in smallest unit
- If user chooses web search, integrate with autonomous discovery system

OUTPUT FORMAT: Return ONLY valid JSON:
{
  "extracted": {
    "name": "exact name mentioned or empty",
    "address": "full address including city/country or empty", 
    "phone": "phone number if mentioned or empty",
    "website": "website URL if mentioned or empty",
    "description": "description if mentioned or empty",
    "priceInfo": "Human readable price range or empty",
    "cuisine": ["Nigerian", "other cuisines mentioned"],
    "city": "city name extracted from address",
    "country": "country extracted from address"
  },
  "confidence": 0-100,
  "missingFields": ["essential fields still needed"],
  "nextAction": "askUserForData|performWebSearch|askChoice|askClarify|complete",
  "suggestions": ["helpful next steps or clarification questions"]
}

PRICING CONVERSION GUIDE:
- Nigeria (NGN): Budget ₦500-1,500 = 50000-150000 kobo, Mid-range ₦1,500-4,000 = 150000-400000 kobo
- US/Canada (USD/CAD): Budget $8-20 = 800-2000 cents, Mid-range $20-45 = 2000-4500 cents  
- UK (GBP): Budget £8-20 = 800-2000 pence, Mid-range £20-45 = 2000-4500 pence

GLOBAL AWARENESS:
- If user mentions a city (London, New York, Toronto, etc.), acknowledge the global scope
- Ask for city/country when location context is unclear
- Adapt pricing and service expectations to local market
- Recognize that "Amala spot" could be in any major city with Nigerian diaspora

SMART SUGGESTIONS:
- For Option A: Guide them through essential fields (name, address, city)
- For Option B: Trigger autonomous discovery for their specified location
- Always maintain conversational, helpful tone
- Use Nigerian food terminology appropriately (bukka, mama put, etc.)
`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();

      try {
        // Clean and parse JSON response
        let jsonText = text;
        if (text.includes("```json")) {
          jsonText = text.split("```json")[1].split("```")[0];
        } else if (text.includes("```")) {
          jsonText = text.split("```")[1].split("```")[0];
        }

        const parsed = JSON.parse(jsonText.trim());

        // Handle autonomous discovery integration
        if (parsed.nextAction === "performWebSearch") {
          return await this.performEnhancedWebSearch(
            parsed.extracted,
            userMessage
          );
        }

        // Handle user choice from previous search results
        if (
          parsed.nextAction === "askChoice" &&
          this.isChoiceResponse(userMessage)
        ) {
          return this.handleUserChoice(userMessage, conversationHistory);
        }

        return {
          extracted: parsed.extracted || {},
          confidence: parsed.confidence || 50,
          missingFields: parsed.missingFields || [],
          suggestions: parsed.suggestions || [],
          nextAction: parsed.nextAction || "askClarify",
          searchResults: parsed.searchResults || [],
        };
      } catch (parseError) {
        console.error("JSON parsing failed:", parseError, "Raw text:", text);
        return this.fallbackExtraction(userMessage);
      }
    } catch (error) {
      console.error("Gemini API error:", error);
      return this.fallbackExtraction(userMessage);
    }
  }

  static async performEnhancedWebSearch(
    extractedInfo: Partial<LocationSubmission>,
    userMessage: string
  ): Promise<AIExtractionResult> {
    try {
      // Extract city/location context from user message
      const locationContext = this.extractLocationContext(
        userMessage,
        extractedInfo
      );

      console.log("🔍 Performing enhanced web search for:", locationContext);

      // Use autonomous discovery with location context
      const discoveredLocations =
        await AutonomousDiscoveryService.discoverLocations();

      if (discoveredLocations.length === 0) {
        return {
          extracted: extractedInfo,
          confidence: 20,
          missingFields: ["name", "address"],
          suggestions: [
            "I couldn't find Amala restaurants in your area through web search. Could you provide the restaurant details manually? I can help you add any authentic Amala spot worldwide!",
          ],
          nextAction: "askUserForData",
        };
      }

      // Filter and rank results based on location context
      const filteredResults = this.filterAndRankResults(
        discoveredLocations,
        locationContext
      );
      const topOptions = filteredResults.slice(0, 3);

      const searchMessage = this.formatSearchResults(
        topOptions,
        locationContext
      );

      return {
        extracted: extractedInfo,
        confidence: 75,
        missingFields: [],
        suggestions: [searchMessage],
        nextAction: "askChoice",
        searchResults: topOptions,
      };
    } catch (error) {
      console.error("Enhanced web search failed:", error);
      return {
        extracted: extractedInfo,
        confidence: 20,
        missingFields: ["name", "address"],
        suggestions: [
          "Web search is temporarily unavailable. Please share the restaurant details directly and I'll help you add it to our global directory!",
        ],
        nextAction: "askUserForData",
      };
    }
  }

  static extractLocationContext(
    userMessage: string,
    extractedInfo: Partial<LocationSubmission>
  ): {
    city?: string;
    country?: string;
    region?: string;
  } {
    const message = userMessage.toLowerCase();

    // Global cities with Nigerian diaspora
    const globalCities: Record<
      string,
      { city: string; country: string; region: string }
    > = {
      // North America
      "new york": { city: "New York", country: "USA", region: "North America" },
      houston: { city: "Houston", country: "USA", region: "North America" },
      atlanta: { city: "Atlanta", country: "USA", region: "North America" },
      chicago: { city: "Chicago", country: "USA", region: "North America" },
      toronto: { city: "Toronto", country: "Canada", region: "North America" },
      vancouver: {
        city: "Vancouver",
        country: "Canada",
        region: "North America",
      },

      // Europe
      london: { city: "London", country: "United Kingdom", region: "Europe" },
      manchester: {
        city: "Manchester",
        country: "United Kingdom",
        region: "Europe",
      },
      birmingham: {
        city: "Birmingham",
        country: "United Kingdom",
        region: "Europe",
      },
      paris: { city: "Paris", country: "France", region: "Europe" },
      berlin: { city: "Berlin", country: "Germany", region: "Europe" },

      // Africa
      lagos: { city: "Lagos", country: "Nigeria", region: "West Africa" },
      ibadan: { city: "Ibadan", country: "Nigeria", region: "West Africa" },
      abuja: { city: "Abuja", country: "Nigeria", region: "West Africa" },
      accra: { city: "Accra", country: "Ghana", region: "West Africa" },
      johannesburg: {
        city: "Johannesburg",
        country: "South Africa",
        region: "Southern Africa",
      },

      // Middle East
      dubai: { city: "Dubai", country: "UAE", region: "Middle East" },
      doha: { city: "Doha", country: "Qatar", region: "Middle East" },

      // Asia-Pacific
      singapore: {
        city: "Singapore",
        country: "Singapore",
        region: "Southeast Asia",
      },
      sydney: { city: "Sydney", country: "Australia", region: "Oceania" },
      melbourne: { city: "Melbourne", country: "Australia", region: "Oceania" },
    };

    // Check extracted info first - look for city in address
    if (extractedInfo.address) {
      const addressLower = extractedInfo.address.toLowerCase();
      for (const [cityKey, cityInfo] of Object.entries(globalCities)) {
        if (addressLower.includes(cityKey)) {
          return cityInfo;
        }
      }
    }

    // Check user message for city mentions
    for (const [cityKey, cityInfo] of Object.entries(globalCities)) {
      if (message.includes(cityKey)) {
        return cityInfo;
      }
    }

    // Default fallback
    return { region: "global" };
  }

  static filterAndRankResults(
    locations: Partial<AmalaLocation>[],
    locationContext: { city?: string; country?: string; region?: string }
  ): Partial<AmalaLocation>[] {
    // If we have specific city context, prioritize matches from that area
    if (locationContext.city) {
      const cityMatches = locations.filter(
        (loc) =>
          loc.address
            ?.toLowerCase()
            .includes(locationContext.city!.toLowerCase()) ||
          loc.address
            ?.toLowerCase()
            .includes(locationContext.country!.toLowerCase())
      );

      if (cityMatches.length > 0) {
        return cityMatches;
      }
    }

    // Otherwise return all results, prioritizing higher confidence
    return locations.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  static formatSearchResults(
    locations: Partial<AmalaLocation>[],
    locationContext: { city?: string; country?: string; region?: string }
  ): string {
    const locationStr = locationContext.city
      ? `in ${locationContext.city}${
          locationContext.country ? `, ${locationContext.country}` : ""
        }`
      : "worldwide";

    const optionsList = locations
      .map((loc, index) => {
        const cuisineStr = Array.isArray(loc.cuisine)
          ? loc.cuisine.join(", ")
          : "Nigerian";
        const ratingStr = loc.rating ? `⭐ ${loc.rating}` : "";
        const priceStr =
          (loc as AmalaLocation).priceInfo || "Pricing available";

        return (
          `${index + 1}. **${loc.name}** ${ratingStr}\n` +
          `   📍 ${loc.address}\n` +
          `   📞 ${loc.phone || "Phone not available"}\n` +
          `   🌐 ${loc.website || "Website not available"}\n` +
          `   💰 ${priceStr} • Dine-in & Takeaway\n` +
          `   🍽️ ${cuisineStr}\n` +
          `   📝 ${
            loc.description?.substring(0, 80) || "Traditional Amala restaurant"
          }...`
        );
      })
      .join("\n\n");

    return (
      `Great! I found these authentic Amala restaurants ${locationStr}:\n\n${optionsList}\n\n` +
      `Which one would you like to add? Reply with the number (1, 2, or 3), or say "none" if you'd prefer to add different details manually.`
    );
  }

  static isChoiceResponse(message: string): boolean {
    const normalized = message.toLowerCase().trim();
    return (
      /^[123]$/.test(normalized) ||
      normalized.includes("option") ||
      normalized === "none" ||
      ["first", "second", "third", "1", "2", "3"].some((choice) =>
        normalized.includes(choice)
      )
    );
  }

  static handleUserChoice(
    userMessage: string,
    conversationHistory: ConversationMessage[]
  ): AIExtractionResult {
    const choice = userMessage.toLowerCase().trim();

    if (
      choice === "none" ||
      choice.includes("none") ||
      choice.includes("manual")
    ) {
      return {
        extracted: {},
        confidence: 30,
        missingFields: ["name", "address", "phone"],
        suggestions: [
          "No problem! Please share the restaurant details you'd like to add. What's the name and location of the Amala spot?",
        ],
        nextAction: "askUserForData",
      };
    }

    // Extract choice number
    let choiceNum = 0;
    if (choice.includes("1") || choice.includes("first")) choiceNum = 1;
    else if (choice.includes("2") || choice.includes("second")) choiceNum = 2;
    else if (choice.includes("3") || choice.includes("third")) choiceNum = 3;

    if (choiceNum > 0) {
      // In a real implementation, we'd extract the chosen restaurant from search results
      // For now, return completion signal
      return {
        extracted: {
          name: `Selected Restaurant ${choiceNum}`,
          priceInfo: "₦1,500-4,000 per person",
          cuisine: ["Nigerian"],
        },
        confidence: 85,
        missingFields: [],
        suggestions: [
          `Perfect! I've selected option ${choiceNum}. The restaurant details will be added to your submission. Is there anything else you'd like to modify or add?`,
        ],
        nextAction: "complete",
      };
    }

    return {
      extracted: {},
      confidence: 20,
      missingFields: ["name", "address"],
      suggestions: [
        "I didn't understand your choice. Please reply with 1, 2, 3, or 'none' to add manually.",
      ],
      nextAction: "askChoice",
    };
  }

  static async generateFollowUpQuestion(
    extractedInfo: Partial<LocationSubmission>,
    conversationHistory: ConversationMessage[] = []
  ): Promise<string> {
    if (!genAI) {
      return this.generateSimpleFollowUp(extractedInfo);
    }

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

      const essentialFields = ["name", "address", "priceInfo"];
      const missingEssentials = essentialFields.filter(
        (field) => !extractedInfo[field as keyof LocationSubmission]
      );

      const prompt = `
You are a helpful AI assistant for a global Amala restaurant directory. Generate a natural, engaging follow-up question.

Current extracted info: ${JSON.stringify(extractedInfo, null, 2)}
Conversation history: ${conversationHistory
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join("\n")}
Missing essentials: ${missingEssentials.join(", ") || "None"}

Generate ONE conversational follow-up question:
- If missing essentials: Ask about the most important missing field
- If all essentials complete: Ask about optional details (hours, specialties, etc.)
- Be globally aware - don't assume Lagos/Nigeria location
- Use natural, varied language with light food enthusiasm
- Keep it concise (1-2 sentences max)

Return only the question text, no JSON.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return (
        response.text().trim() || this.generateSimpleFollowUp(extractedInfo)
      );
    } catch (error) {
      return this.generateSimpleFollowUp(extractedInfo);
    }
  }

  static generateSimpleFollowUp(
    extractedInfo: Partial<LocationSubmission>
  ): string {
    if (!extractedInfo.name) {
      return "What's the name of the Amala restaurant you'd like to add?";
    }
    if (!extractedInfo.address) {
      return "Great! What's the full address including the city and country?";
    }
    if (!extractedInfo.priceInfo) {
      return "What's the typical price range? ($, $$, $$$, or $$$$)";
    }

    return "Perfect! Any other details you'd like to add, like phone number, website, or what makes this place special?";
  }

  static async detectDuplicate(
    newLocation: Partial<LocationSubmission>,
    existingLocations: AmalaLocation[]
  ): Promise<{
    isDuplicate: boolean;
    similarLocations: AmalaLocation[];
    confidence: number;
  }> {
    if (!newLocation.name && !newLocation.address) {
      return {
        isDuplicate: false,
        similarLocations: [],
        confidence: 0,
      };
    }

    const similar = existingLocations.filter((location) => {
      const nameSimilarity = this.calculateSimilarity(
        newLocation.name?.toLowerCase() || "",
        location.name.toLowerCase()
      );

      const addressSimilarity = this.calculateSimilarity(
        newLocation.address?.toLowerCase() || "",
        location.address.toLowerCase()
      );

      // More stringent duplicate detection for global platform
      return (
        nameSimilarity > 0.8 ||
        (nameSimilarity > 0.6 && addressSimilarity > 0.7)
      );
    });

    return {
      isDuplicate: similar.length > 0,
      similarLocations: similar.slice(0, 3), // Limit to top 3 matches
      confidence:
        similar.length > 0 ? Math.max(0.7, similar.length * 0.3) : 0.1,
    };
  }

  private static calculateSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // insertion
          matrix[j - 1][i] + 1, // deletion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  static fallbackExtraction(message: string): AIExtractionResult {
    const extracted: Partial<LocationSubmission> = {
      cuisine: ["Nigerian"],
      priceInfo: "₦1,500-4,000 per person",
    };

    let confidence = 30;
    const missingFields = ["name", "address"];

    if (!message.trim()) {
      return {
        extracted: {},
        confidence: 0,
        missingFields: ["name", "address"],
        suggestions: [
          "Hi! I can help you add an Amala restaurant to our global directory. Would you like me to:\n\n1. Help you add a specific restaurant you know\n2. Search for popular Amala spots in your area\n\nJust let me know which option works better for you!",
        ],
        nextAction: "askClarify",
      };
    }

    // Basic extraction attempts
    const words = message.toLowerCase().split(/\s+/);

    // Try to extract restaurant name (look for quoted text or first few words)
    const quotedName = message.match(/["']([^"']+)["']/);
    if (quotedName) {
      extracted.name = quotedName[1];
      missingFields.splice(missingFields.indexOf("name"), 1);
      confidence += 20;
    } else if (
      words.length > 0 &&
      !this.isGenericPhrase(words.slice(0, 3).join(" "))
    ) {
      extracted.name = words.slice(0, 3).join(" ");
      missingFields.splice(missingFields.indexOf("name"), 1);
      confidence += 10;
    }

    // Look for address indicators
    const addressKeywords = [
      "street",
      "road",
      "avenue",
      "lagos",
      "nigeria",
      "london",
      "new york",
      "toronto",
    ];
    if (
      addressKeywords.some((keyword) => message.toLowerCase().includes(keyword))
    ) {
      const addressMatch = message.match(
        /[\w\s,.-]+(?:street|road|avenue|lagos|nigeria|london|toronto|houston|atlanta)[\w\s,.-]*/i
      );
      if (addressMatch) {
        extracted.address = addressMatch[0].trim();
        missingFields.splice(missingFields.indexOf("address"), 1);
        confidence += 15;
      }
    }

    const suggestions = [];
    if (missingFields.includes("name")) {
      suggestions.push("What's the name of the Amala restaurant?");
    } else if (missingFields.includes("address")) {
      suggestions.push("What's the full address including city and country?");
    } else {
      suggestions.push(
        "Great! Any other details like phone number or what makes this place special?"
      );
    }

    return {
      extracted,
      confidence,
      missingFields,
      suggestions,
      nextAction: "askUserForData",
    };
  }

  private static isGenericPhrase(text: string): boolean {
    const generic = [
      "i want",
      "i need",
      "can you",
      "help me",
      "find me",
      "looking for",
    ];
    return generic.some((phrase) => text.includes(phrase));
  }
}
