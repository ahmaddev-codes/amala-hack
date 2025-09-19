import { NextRequest, NextResponse } from "next/server";
import { ImageService } from "@/lib/services/image-service";
import path from "path";
import fs from "fs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const photoReference = searchParams.get("photoreference");
    const maxwidth = searchParams.get("maxwidth") || "400";
    const locationName = searchParams.get("locationName") || "Restaurant";
    const cuisine = searchParams.get("cuisine")
      ? searchParams.get("cuisine")!.split(",")
      : undefined;

    if (!photoReference) {
      return NextResponse.json(
        { error: "Photo reference is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error("Google Maps API key not configured");
      // Return fallback image instead of placeholder
      const fallbackImage = await ImageService.getBestImage(
        locationName,
        cuisine
      );
      return NextResponse.redirect(fallbackImage);
    }

    // Fetch the image from Google Places API (New)
    // The photoReference is actually the photo name in Places API (New)
    const googleUrl = `https://places.googleapis.com/v1/${photoReference}/media?maxWidthPx=${maxwidth}&key=${apiKey}`;

    const response = await fetch(googleUrl);

    if (!response.ok) {
      console.error(
        `Google Places Photo API error: ${response.status} ${response.statusText}`
      );
      console.error(`Failed URL: ${googleUrl.replace(apiKey, "[REDACTED]")}`);

      // Try to get more details about the error
      try {
        const errorText = await response.text();
        console.error(`Error response: ${errorText}`);

        // Check if it's a specific API error
        if (response.status === 403) {
          console.error("403 Forbidden - This usually means:");
          console.error("1. Places API (New) is not enabled for this API key");
          console.error(
            "2. API key has restrictions that prevent photo access"
          );
          console.error("3. API key has exceeded quota or is invalid");
          console.error(
            "4. Photo reference format is incorrect for Places API (New)"
          );
        }
      } catch (e) {
        console.error("Could not read error response");
      }

      // Return a fallback image instead of trying to redirect
      console.log("Google Places Photo not found, serving fallback image");

      // Serve the local SVG file directly
      try {
        const svgPath = path.join(
          process.cwd(),
          "public",
          "placeholder-image.svg"
        );
        const svgContent = fs.readFileSync(svgPath, "utf-8");

        return new NextResponse(svgContent, {
          headers: {
            "Content-Type": "image/svg+xml",
            "Cache-Control": "public, max-age=86400",
          },
        });
      } catch (error) {
        console.error("Failed to read fallback SVG:", error);
        return new NextResponse("Image not found", { status: 404 });
      }
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";

    // Return the image with proper headers
    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400", // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error("Error proxying Google photo:", error);

    // Serve the local SVG file directly
    try {
      const svgPath = path.join(
        process.cwd(),
        "public",
        "placeholder-image.svg"
      );
      const svgContent = fs.readFileSync(svgPath, "utf-8");

      return new NextResponse(svgContent, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=86400",
        },
      });
    } catch (svgError) {
      console.error("Failed to read fallback SVG:", svgError);
      return new NextResponse("Image not found", { status: 404 });
    }
  }
}
