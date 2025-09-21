import { NextResponse } from "next/server";
import { firebaseOperations } from "@/lib/firebase/database";

async function checkDatabaseHealth() {
  try {
    const approvedLocations = await firebaseOperations.getLocationsByStatus("approved");
    return {
      healthy: true,
      approvedCount: approvedLocations.length,
    };
  } catch (error) {
    console.error("Database health check failed:", error);
    return {
      healthy: false,
      approvedCount: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function GET() {
  try {
    // Check database health
    const healthCheck = await checkDatabaseHealth();

    return NextResponse.json({
      success: healthCheck.healthy,
      message: healthCheck.healthy
        ? "Database is healthy"
        : "Database health check failed",
      approvedLocations: healthCheck.approvedCount,
      error: healthCheck.error,
    });
  } catch (error) {
    console.error("Database health check error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const healthCheck = await checkDatabaseHealth();

    return NextResponse.json({
      success: true,
      message: "Firebase database is ready",
      approvedLocations: healthCheck.approvedCount,
    });
  } catch (error) {
    console.error("Database check error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
