import { adminAuth, isFirebaseAdminInitialized } from './firebase/admin';
import { DecodedIdToken } from 'firebase-admin/auth';

export interface AuthUserInfo {
  id: string;
  email?: string;
  roles: Array<"user" | "scout" | "mod" | "admin">;
}

export function parseEnvList(name: string): Set<string> {
  const raw = process.env[name] || "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

const ADMIN_EMAILS = parseEnvList("ADMIN_EMAILS");
const MODERATOR_EMAILS = parseEnvList("MODERATOR_EMAILS");
const SCOUT_EMAILS = parseEnvList("SCOUT_EMAILS");

export async function verifyBearerToken(
  authorizationHeader?: string
): Promise<AuthUserInfo | null> {
  if (!authorizationHeader) return null;
  if (!isFirebaseAdminInitialized()) {
    console.error('Firebase Admin SDK not initialized');
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (!token || scheme.toLowerCase() !== "bearer") return null;

  try {
    const decodedToken: DecodedIdToken = await adminAuth.verifyIdToken(token);
    
    const email = (decodedToken.email || "").toLowerCase();
    const roles: AuthUserInfo["roles"] = ["user"]; // default baseline
    if (SCOUT_EMAILS.has(email)) roles.push("scout");
    if (MODERATOR_EMAILS.has(email)) roles.push("mod");
    if (ADMIN_EMAILS.has(email)) roles.push("admin");

    return { id: decodedToken.uid, email, roles };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export function requireRole(
  user: AuthUserInfo | null,
  allowed: Array<"mod" | "admin">
) {
  if (!user) return false;
  return allowed.some((r) => user.roles.includes(r));
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
