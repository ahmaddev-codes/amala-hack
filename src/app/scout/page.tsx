"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ScoutDashboard } from "@/components/scout/scout-dashboard";

export default function ScoutPage() {
  return (
    <ProtectedRoute requiredRoles={["scout", "admin"]}>
      <div className="h-screen bg-gray-50">
        <ScoutDashboard />
      </div>
    </ProtectedRoute>
  );
}
