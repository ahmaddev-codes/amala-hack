import { GoogleGenerativeAI } from "@google/generative-ai";
import { LocationSubmission, AmalaLocation } from "@/types/location";

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
}

export class AILocationService {
  static async extractLocationInfo(
    userMessage: string,
    conversationHistory: ConversationMessage[] = []
  ): Promise<AIExtractionResult> {
    // Check if Gemini is configured
    if (!genAI) {
      return AILocationService.fallbackExtraction(userMessage);
    }

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `You are an AI assistant specialized in extracting Amala restaurant information from user messages.

Extract the following information when available from this message: "${userMessage}"

Context from previous conversation:
${conversationHistory.map((msg) => `${msg.role}: ${msg.content}`).join("\n")}

Return ONLY a valid JSON object with this exact structure:
{
  "extracted": {
    "name": "Restaurant name if mentioned",
    "address": "Full address if mentioned",
    "phone": "Phone number if mentioned", 
    "website": "Website URL if mentioned",
    "description": "Brief description",
    "serviceType": "dine-in" | "takeaway" | "both",
    "priceRange": "$" | "$$" | "$$$" | "$$$$",
    "cuisine": ["cuisine", "types"]
  },
  "confidence": 85,
  "missingFields": ["field1", "field2"],
  "suggestions": ["What's the phone number?", "What are the hours?"]
}

Only include fields in "extracted" that are explicitly mentioned. Set confidence 0-100 based on completeness.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();

      try {
        // Clean up the response to extract JSON
        let jsonText = text;
        if (text.includes("```json")) {
          jsonText = text.split("```json")[1].split("```")[0];
        } else if (text.includes("```")) {
          jsonText = text.split("```")[1].split("```")[0];
        }

        const parsed = JSON.parse(jsonText.trim());

        return {
          extracted: parsed.extracted || {},
          confidence: parsed.confidence || 50,
          missingFields: parsed.missingFields || [],
          suggestions: parsed.suggestions || [],
        };
      } catch (parseError) {
        return AILocationService.fallbackExtraction(userMessage);
      }
    } catch (error) {
      return AILocationService.fallbackExtraction(userMessage);
    }
  }

  static async generateFollowUpQuestion(
    extractedInfo: Partial<LocationSubmission>
  ): Promise<string> {
    // Simple fallback when AI is not available
    if (!genAI) {
      const missingFields: string[] = [];
      if (!extractedInfo.name) missingFields.push("restaurant name");
      if (!extractedInfo.address) missingFields.push("address");
      if (!extractedInfo.serviceType)
        missingFields.push("service type (dine-in or takeaway)");
      if (!extractedInfo.priceRange) missingFields.push("price range");

      if (missingFields.length === 0) {
        return "Great! I have all the essential information. Would you like to add any additional details like phone number, website, or description?";
      }

      if (missingFields.length === 1) {
        return `Thanks! Could you also tell me the ${missingFields[0]}?`;
      }

      return `Thanks for that information! I still need to know the ${missingFields
        .slice(0, -1)
        .join(", ")} and ${missingFields[missingFields.length - 1]}.`;
    }

    // AI-powered follow-up generation using Gemini
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `You are helping collect information about an Amala restaurant. 
      
Current information collected: ${JSON.stringify(extractedInfo, null, 2)}

Generate a natural, friendly follow-up question to gather missing important information like:
- Restaurant name
- Address/location
- Phone number
- Operating hours
- Service type (dine-in, takeaway, or both)
- Price range
- Special dishes or features

Return only the question, be conversational and specific. If all essential info is collected, ask about optional details.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();

      return (
        text || "What other details would you like to share about this place?"
      );
    } catch (error) {
      return "What other details would you like to share about this place?";
    }
  }

  static async detectDuplicate(
    newLocation: Partial<LocationSubmission>,
    existingLocations: AmalaLocation[]
  ): Promise<{
    isDuplicate: boolean;
    similarLocations: AmalaLocation[];
    confidence: number;
  }> {
    // Simple similarity detection
    const similar = existingLocations.filter((location) => {
      // Check name similarity
      const nameSimilarity = this.calculateSimilarity(
        newLocation.name?.toLowerCase() || "",
        location.name.toLowerCase()
      );

      // Check address similarity
      const addressSimilarity = this.calculateSimilarity(
        newLocation.address?.toLowerCase() || "",
        location.address.toLowerCase()
      );

      // Consider it similar if name similarity > 70% OR address similarity > 80%
      return nameSimilarity > 0.7 || addressSimilarity > 0.8;
    });

    return {
      isDuplicate: similar.length > 0,
      similarLocations: similar,
      confidence: similar.length > 0 ? 0.8 : 0.2,
    };
  }

  private static calculateSimilarity(str1: string, str2: string): number {
    // Simple Levenshtein distance-based similarity
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  static fallbackExtraction(message: string): AIExtractionResult {
    const extracted: Partial<LocationSubmission> = {};
    const confidence = 30;
    const missingFields: string[] = [];
    const suggestions: string[] = [];

    // Very basic keyword extraction
    const words = message.toLowerCase().split(/\s+/);

    // Look for potential restaurant names (first few words or quoted text)
    if (words.length > 0) {
      extracted.name = words.slice(0, 3).join(" ");
    }

    // Look for price indicators
    if (message.includes("cheap") || message.includes("budget")) {
      extracted.priceRange = "$";
    } else if (message.includes("expensive") || message.includes("upscale")) {
      extracted.priceRange = "$$$";
    } else {
      extracted.priceRange = "$$";
    }

    // Look for service type indicators
    if (message.includes("takeaway") || message.includes("delivery")) {
      extracted.serviceType = "takeaway";
    } else if (message.includes("dine") || message.includes("sit")) {
      extracted.serviceType = "dine-in";
    } else {
      extracted.serviceType = "both";
    }

    // Default cuisine
    extracted.cuisine = ["Nigerian"];

    // Determine missing fields
    if (!extracted.name) missingFields.push("name");
    if (!extracted.address) missingFields.push("address");
    if (!extracted.phone) missingFields.push("phone");

    // Generate suggestions
    suggestions.push("Could you provide the restaurant's full name?");
    suggestions.push("What's the complete address?");
    suggestions.push("Do you have contact information?");

    return {
      extracted,
      confidence,
      missingFields,
      suggestions,
    };
  }
}
