import { NextRequest, NextResponse } from "next/server";
import { AILocationService } from "@/lib/services/ai-service";

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory } = await request.json();

    if (!message) {
      return NextResponse.json(
        { success: false, error: "Message is required" },
        { status: 400 }
      );
    }

    // Extract location information using AI
    const extraction = await AILocationService.extractLocationInfo(
      message,
      conversationHistory || []
    );

    // Generate follow-up question if needed
    const followUp = await AILocationService.generateFollowUpQuestion(
      extraction.extracted
    );

    return NextResponse.json({
      success: true,
      data: {
        extraction,
        followUpQuestion: followUp,
        isComplete: extraction.missingFields.length === 0,
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
    const duplicateCheck = await AILocationService.detectDuplicate(
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
