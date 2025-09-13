import { NextResponse } from "next/server";
import { initializeDatabase, checkDatabaseHealth } from "@/lib/database/init";

export async function GET() {
  try {
    // Check database health first
    const healthCheck = await checkDatabaseHealth();

    if (healthCheck.healthy) {
      return NextResponse.json({
        success: true,
        message: "Database is healthy",
        approvedLocations: healthCheck.approvedCount,
      });
    }

    // If not healthy, try to initialize
    const initResult = await initializeDatabase();

    return NextResponse.json({
      success: initResult.success,
      message: initResult.success
        ? "Database initialized successfully"
        : "Database initialization failed",
      error: initResult.error,
    });
  } catch (error) {
    console.error("Database initialization error:", error);
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
    const result = await initializeDatabase();

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? "Database reinitialized successfully"
        : "Database initialization failed",
      error: result.error,
    });
  } catch (error) {
    console.error("Database reinitialization error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
