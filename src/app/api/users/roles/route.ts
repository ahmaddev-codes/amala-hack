import { NextRequest, NextResponse } from "next/server";
import { adminFirebaseOperations } from "@/lib/firebase/admin-database";
import { verifyBearerToken, requireRole } from "@/lib/auth";
import { z } from "zod";

const UserRoleSchema = z.object({
  email: z.string().email(),
  roles: z.array(z.enum(["user", "scout", "mod", "admin"])),
  displayName: z.string().optional(),
});

const UpdateRoleSchema = z.object({
  email: z.string().email(),
  action: z.enum(["add", "remove"]),
  role: z.enum(["scout", "mod", "admin"]),
});

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyBearerToken(request.headers.get("authorization") || undefined);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const roleCheck = await requireRole(authResult.user!, ["admin"]);
    if (!roleCheck.success) {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search');

    // Get all users with roles
    const users = await adminFirebaseOperations.getAllUsersWithRoles();
    
    // Filter by search query if provided
    let filteredUsers = users;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredUsers = users.filter((user: any) => 
        user.email?.toLowerCase().includes(query) ||
        user.displayName?.toLowerCase().includes(query)
      );
    }
    
    return NextResponse.json({
      success: true,
      users: filteredUsers
    });

  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyBearerToken(request.headers.get("authorization") || undefined);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const roleCheck = await requireRole(authResult.user!, ["admin"]);
    if (!roleCheck.success) {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, action, role } = UpdateRoleSchema.parse(body);

    // Update user role
    const result = await adminFirebaseOperations.updateUserRole(email, role, action === "add");
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully ${action === "add" ? "added" : "removed"} ${role} role ${action === "add" ? "to" : "from"} ${email}`,
      user: result.user
    });

  } catch (error: any) {
    console.error("Failed to update user role:", error);
    
    if (error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to update user role" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyBearerToken(request.headers.get("authorization") || undefined);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const roleCheck = await requireRole(authResult.user!, ["admin"]);
    if (!roleCheck.success) {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, roles, displayName } = UserRoleSchema.parse(body);

    // Create or update user with roles
    const result = await adminFirebaseOperations.createOrUpdateUser({
      email,
      roles,
      displayName,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return NextResponse.json({
      success: true,
      message: `Successfully updated user ${email}`,
      user: result
    });

  } catch (error: any) {
    console.error("Failed to create/update user:", error);
    
    if (error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to create/update user" },
      { status: 500 }
    );
  }
}
