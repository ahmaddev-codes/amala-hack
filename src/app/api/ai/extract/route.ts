import { NextRequest, NextResponse } from "next/server";
import { EnhancedAILocationService } from "@/lib/services/ai-service";
import { rateLimit } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rl = rateLimit(`ai:extract:${ip}`, 20, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Try again later." },
        { status: 429 }
      );
    }
    const { message, conversationHistory } = await request.json();

    if (!message) {
      return NextResponse.json(
        { success: false, error: "Message is required" },
        { status: 400 }
      );
    }

    // Extract location information using Enhanced AI
    const extraction = await EnhancedAILocationService.extractLocationInfo(
      message,
      conversationHistory || []
    );

    // Generate follow-up question if needed
    let followUp = await EnhancedAILocationService.generateFollowUpQuestion(
      extraction.extracted,
      conversationHistory
    );

    // Override for special agentic actions
    if (
      extraction.nextAction === "askClarify" ||
      extraction.nextAction === "askChoice"
    ) {
      followUp = extraction.suggestions[0] || followUp;
    }

    const isComplete =
      extraction.missingFields.length === 0 &&
      extraction.nextAction !== "askClarify" &&
      extraction.nextAction !== "askChoice" &&
      extraction.nextAction !== "performWebSearch" &&
      extraction.nextAction !== "askUserForData";

    return NextResponse.json({
      success: true,
      data: {
        extraction,
        followUpQuestion: followUp,
        isComplete,
      },
    });
  } catch (error) {
    console.error("AI extraction failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process message",
        data: {
          extraction: {
            extracted: {},
            confidence: 0,
            missingFields: ["name", "address"],
            suggestions: [
              "Could you tell me the name and address of the Amala spot?",
            ],
          },
          followUpQuestion:
            "I'm having trouble understanding. Could you tell me the name and address of the Amala restaurant?",
          isComplete: false,
        },
      },
      { status: 200 } // Return 200 with fallback data instead of 500
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { location, existingLocations } = await request.json();

    // Check for duplicates
    const duplicateCheck = await EnhancedAILocationService.detectDuplicate(
      location,
      existingLocations || []
    );

    return NextResponse.json({
      success: true,
      data: duplicateCheck,
    });
  } catch (error) {
    console.error("Duplicate detection failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to check for duplicates" },
      { status: 500 }
    );
  }
}
