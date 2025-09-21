import { NextRequest, NextResponse } from "next/server";
import { verifyBearerToken, requireRole } from "@/lib/auth";
import { adminFirebaseOperations } from "@/lib/firebase/admin-database";
import { z } from "zod";

// Schema for flagged content creation
const FlagContentSchema = z.object({
  contentType: z.enum(["location", "review"]),
  contentId: z.string().min(1),
  reason: z.enum([
    "inappropriate_content",
    "spam",
    "fake_information",
    "offensive_language",
    "copyright_violation",
    "other"
  ]),
  description: z.string().optional(),
  reportedBy: z.string().min(1),
});

// Schema for flagged content moderation
const ModerateFlagSchema = z.object({
  flagId: z.string().min(1),
  action: z.enum(["dismiss", "uphold", "escalate"]),
  moderatorNotes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";
    
    console.log("🔍 Flagged content API called with status:", status);
    console.log("🔍 Authorization header:", request.headers.get("authorization")?.substring(0, 20) + "...");
    
    // Verify authentication and role
    const authResult = await verifyBearerToken(request.headers.get("authorization") || undefined);
    if (!authResult.success) {
      console.error("❌ Auth failed:", authResult.error);
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    console.log("✅ Auth successful for user:", authResult.user?.email);

    const roleCheck = requireRole(authResult.user!, ["mod", "admin"]);
    if (!roleCheck.success) {
      console.error("❌ Role check failed:", roleCheck.error, "User roles:", authResult.user?.roles);
      return NextResponse.json({ error: roleCheck.error }, { status: 403 });
    }

    console.log("✅ Role check passed for user:", authResult.user?.email);

    const flaggedContent = await adminFirebaseOperations.getFlaggedContent(status);
    
    console.log("✅ Flagged content fetched:", flaggedContent.length, "items");
    
    return NextResponse.json({
      success: true,
      data: flaggedContent,
      count: flaggedContent.length
    });
  } catch (error: any) {
    console.error("❌ Error fetching flagged content:", error);
    return NextResponse.json(
      { error: "Failed to fetch flagged content", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Check if this is a flag creation or moderation action
    if (body.action) {
      // This is a moderation action
      const authResult = await verifyBearerToken(request.headers.get("authorization") || undefined);
      if (!authResult.success) {
        return NextResponse.json({ error: authResult.error }, { status: 401 });
      }

      const roleCheck = requireRole(authResult.user!, ["mod", "admin"]);
      if (!roleCheck.success) {
        return NextResponse.json({ error: roleCheck.error }, { status: 403 });
      }

      const validatedData = ModerateFlagSchema.parse(body);
      
      const result = await adminFirebaseOperations.moderateFlaggedContent(
        validatedData.flagId,
        validatedData.action,
        authResult.user!.email!,
        validatedData.moderatorNotes
      );

      return NextResponse.json({
        success: true,
        message: `Flag ${validatedData.action}ed successfully`,
        data: result
      });
    } else {
      // This is a flag creation (requires authentication but any user can flag)
      const authResult = await verifyBearerToken(request.headers.get("authorization") || undefined);
      if (!authResult.success) {
        return NextResponse.json({ error: authResult.error }, { status: 401 });
      }

      const validatedData = FlagContentSchema.parse(body);
      
      const flaggedContent = await adminFirebaseOperations.createFlaggedContent({
        ...validatedData,
        reportedAt: new Date(),
        status: "pending"
      });

      return NextResponse.json({
        success: true,
        message: "Content flagged successfully",
        data: flaggedContent
      });
    }
  } catch (error: any) {
    console.error("❌ Error processing flagged content:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to process flagged content", details: error.message },
      { status: 500 }
    );
  }
}
