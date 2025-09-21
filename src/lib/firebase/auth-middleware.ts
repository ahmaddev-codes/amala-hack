import { NextRequest } from "next/server";
import { adminAuth, isFirebaseAdminInitialized } from "./admin";
import { DecodedIdToken } from "firebase-admin/auth";

export async function verifyFirebaseToken(
  request: NextRequest
): Promise<DecodedIdToken> {
  if (!isFirebaseAdminInitialized()) {
    throw new Error("Firebase Admin SDK not initialized");
  }

  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("No valid authorization header");
  }

  const token = authHeader.substring(7);

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    console.log("✅ Token verified for user:", decodedToken.uid);
    return decodedToken;
  } catch (error) {
    console.error("❌ Token verification failed:", error);
    throw new Error("Invalid token");
  }
}

export async function requireRole(
  request: NextRequest,
  requiredRoles: string[]
): Promise<DecodedIdToken> {
  const decodedToken = await verifyFirebaseToken(request);

  const userRoles = decodedToken.roles || ["user"];
  const hasRequiredRole = requiredRoles.some((role) =>
    userRoles.includes(role)
  );

  if (!hasRequiredRole) {
    throw new Error(
      `Insufficient permissions. Required: ${requiredRoles.join(" or ")}`
    );
  }

  return decodedToken;
}

export async function requireAdmin(
  request: NextRequest
): Promise<DecodedIdToken> {
  return requireRole(request, ["admin"]);
}

export async function requireModerator(
  request: NextRequest
): Promise<DecodedIdToken> {
  return requireRole(request, ["admin", "mod"]);
}

export async function requireScout(
  request: NextRequest
): Promise<DecodedIdToken> {
  return requireRole(request, ["admin", "mod", "scout"]);
}
