import { NextRequest, NextResponse } from "next/server";
import { verifyBearerToken, requireRole } from "@/lib/auth";
import { adminFirebaseOperations } from "@/lib/firebase/admin-database";
import { z } from "zod";

// Schema for user role assignment
const AssignRoleSchema = z.object({
  email: z.string().email(),
  role: z.enum(["user", "scout", "mod", "admin"]),
  action: z.enum(["add", "remove"]),
});

// Schema for user search
const SearchUsersSchema = z.object({
  query: z.string().optional(),
  role: z.enum(["user", "scout", "mod", "admin", "all"]).optional(),
  limit: z.number().min(1).max(100).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";
    const role = searchParams.get("role") || "all";
    const limit = parseInt(searchParams.get("limit") || "50");
    
    // Verify authentication and admin role
    const authResult = await verifyBearerToken(request.headers.get("authorization") || undefined);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const roleCheck = requireRole(authResult.user!, ["admin"]);
    if (!roleCheck.success) {
      return NextResponse.json({ error: roleCheck.error }, { status: 403 });
    }

    const users = await adminFirebaseOperations.searchUsers({
      query,
      role: role === "all" ? undefined : role as any,
      limit
    });
    
    return NextResponse.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error: any) {
    console.error("❌ Error searching users:", error);
    return NextResponse.json(
      { error: "Failed to search users", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Verify authentication and admin role
    const authResult = await verifyBearerToken(request.headers.get("authorization") || undefined);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const roleCheck = requireRole(authResult.user!, ["admin"]);
    if (!roleCheck.success) {
      return NextResponse.json({ error: roleCheck.error }, { status: 403 });
    }

    const validatedData = AssignRoleSchema.parse(body);
    
    const result = await adminFirebaseOperations.manageUserRole(
      validatedData.email,
      validatedData.role,
      validatedData.action,
      authResult.user!.email!
    );

    return NextResponse.json({
      success: true,
      message: `User role ${validatedData.action}ed successfully`,
      data: result
    });
  } catch (error: any) {
    console.error("❌ Error managing user role:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to manage user role", details: error.message },
      { status: 500 }
    );
  }
}
