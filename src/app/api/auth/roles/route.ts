import { NextRequest, NextResponse } from "next/server";
import { parseEnvList } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // Check content type
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { success: false, error: 'Content-Type must be application/json' },
        { status: 400 }
      );
    }

    // Parse JSON body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    const { email, uid } = body;
    
    if (!email || !uid) {
      return NextResponse.json(
        { success: false, error: "Email and UID are required" },
        { status: 400 }
      );
    }

    // Get role lists from environment variables (server-side only)
    const adminEmails = parseEnvList("ADMIN_EMAILS");
    const moderatorEmails = parseEnvList("MODERATOR_EMAILS");
    const scoutEmails = parseEnvList("SCOUT_EMAILS");

    let roles: Array<"user" | "scout" | "mod" | "admin"> = ["user"];

    const emailLower = email.toLowerCase();

    if (adminEmails.has(emailLower)) {
      roles = ["user", "scout", "mod", "admin"];
    } else if (moderatorEmails.has(emailLower)) {
      roles = ["user", "scout", "mod"];
    } else if (scoutEmails.has(emailLower)) {
      roles = ["user", "scout"];
    }

    return NextResponse.json({
      success: true,
      roles,
      email: emailLower,
      uid,
    });
  } catch (error) {
    console.error("Role assignment error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to assign roles" },
      { status: 500 }
    );
  }
}