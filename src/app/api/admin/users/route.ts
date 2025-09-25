import { NextRequest, NextResponse } from "next/server";
import { verifyBearerToken, requireRole } from "@/lib/auth";
import { adminFirebaseOperations } from "@/lib/firebase/admin-database";

export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      );
    }

    // Verify admin authentication
    const authResult = await verifyBearerToken(authHeader);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Require admin role
    const roleCheck = await requireRole(authResult.user, ["admin"]);
    if (!roleCheck.success) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Get all users from the system
    const users = await adminFirebaseOperations.getAllUsers();

    return NextResponse.json({
      success: true,
      users,
      count: users.length,
    });

  } catch (error: any) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users", details: error.message },
      { status: 500 }
    );
  }
}
