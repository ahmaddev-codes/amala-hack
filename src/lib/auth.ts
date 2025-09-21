import { adminAuth, isFirebaseAdminInitialized } from './firebase/admin';
import { adminFirebaseOperations } from './firebase/admin-database';
import { DecodedIdToken } from 'firebase-admin/auth';

export interface AuthUserInfo {
  id: string;
  email?: string;
  roles: Array<"user" | "scout" | "mod" | "admin">;
}

// Type guard to validate roles array
const validRoles = ['user', 'scout', 'mod', 'admin'];
function isValidRoles(roles: string[]): roles is Array<"user" | "scout" | "mod" | "admin"> {
  return roles.every(role => validRoles.includes(role));
}

export async function verifyBearerToken(
  authorizationHeader?: string
): Promise<{ success: boolean; user?: AuthUserInfo; error?: string }> {
  if (!authorizationHeader) {
    return { success: false, error: "Authorization header missing" };
  }
  if (!isFirebaseAdminInitialized()) {
    console.error('Firebase Admin SDK not initialized - check environment variables');
    return { success: false, error: "Server authentication not available" };
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (!token || scheme.toLowerCase() !== "bearer") {
    console.error('Invalid authorization format:', { scheme, hasToken: !!token });
    return { success: false, error: "Invalid authorization format" };
  }

  // Log token format for debugging (first and last 10 chars only)
  console.log('Verifying token format:', {
    length: token.length,
    starts: token.substring(0, 10),
    ends: token.substring(token.length - 10)
  });

  try {
    const decodedToken: DecodedIdToken = await adminAuth.verifyIdToken(token);
    
    const email = (decodedToken.email || "").toLowerCase();
    
    // Get roles with database fallback to environment variables
    const roles = await adminFirebaseOperations.getUserRolesWithFallback(email);
    
    // Validate and cast roles to the specific type
    const validatedRoles: Array<"user" | "scout" | "mod" | "admin"> = 
      isValidRoles(roles) ? roles : ['user'];

    console.log('✅ Auth successful for user:', email);
    console.log('✅ User roles from database:', roles);
    
    return { 
      success: true, 
      user: { id: decodedToken.uid, email, roles: validatedRoles } 
    };
  } catch (error) {
    console.error('❌ Token verification failed:', error);
    return { success: false, error: "Invalid or expired token" };
  }
}

export function requireRole(
  user: AuthUserInfo | null,
  allowed: Array<"mod" | "admin">
): { success: boolean; error?: string } {
  if (!user) {
    console.log('❌ Role check failed: No user provided');
    return { success: false, error: "Authentication required" };
  }
  
  const hasRole = allowed.some((r) => user.roles.includes(r));
  
  if (!hasRole) {
    console.log('❌ Role check failed: Insufficient permissions', {
      userEmail: user.email,
      userRoles: user.roles,
      requiredRoles: allowed
    });
    return { success: false, error: "Insufficient permissions" };
  }
  
  console.log('✅ Role check passed:', {
    userEmail: user.email,
    userRoles: user.roles,
    requiredRoles: allowed
  });
  
  return { success: true };
}

// Simple in-memory rate limiter per route+IP
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  max: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, resetAt: now + windowMs };
  }
  if (bucket.count >= max) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }
  bucket.count += 1;
  return {
    allowed: true,
    remaining: max - bucket.count,
    resetAt: bucket.resetAt,
  };
}
