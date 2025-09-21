"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/FirebaseAuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: Array<"scout" | "mod" | "admin">;
  fallbackPath?: string;
  loadingComponent?: React.ReactNode;
}

export function ProtectedRoute({
  children,
  requiredRoles = [],
  fallbackPath = "/",
  loadingComponent,
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated, hasRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log("🔐 ProtectedRoute check:", {
      isLoading,
      isAuthenticated,
      userEmail: user?.email,
      userRoles: user?.roles,
      requiredRoles,
    });

    // Don't redirect while still loading
    if (isLoading) {
      console.log("⏳ Still loading auth, waiting...");
      return;
    }

    // If not authenticated, redirect
    if (!isAuthenticated) {
      console.log("🚫 Not authenticated, redirecting to:", fallbackPath);
      router.push(fallbackPath);
      return;
    }

    // If roles are required, check them
    if (requiredRoles.length > 0) {
      const hasRequiredRole = requiredRoles.some((role) => hasRole(role));
      if (!hasRequiredRole) {
        console.log(
          "🚫 Missing required roles:",
          requiredRoles,
          "user has:",
          user?.roles
        );
        router.push(fallbackPath);
        return;
      }
    }

    console.log("✅ Access granted to protected route");
  }, [
    isLoading,
    isAuthenticated,
    user?.roles,
    requiredRoles,
    router,
    fallbackPath,
    hasRole,
  ]);

  // Show loading while auth is initializing
  if (isLoading) {
    return (
      loadingComponent || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Authenticating...</p>
          </div>
        </div>
      )
    );
  }

  // Don't render children if not authenticated or missing roles
  if (!isAuthenticated) {
    return null;
  }

  if (requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some((role) => hasRole(role));
    if (!hasRequiredRole) {
      return null;
    }
  }

  return <>{children}</>;
}
