/**
 * Image Service - Handles image fallbacks and alternative sources
 */

export class ImageService {
  /**
   * Get a fallback image URL for a location
   */
  static getFallbackImage(locationName: string, cuisine?: string[]): string {
    // Return local placeholder SVG instead of external API
    return "/placeholder-image.svg";
  }

  /**
   * Get multiple fallback images for a location
   */
  static getFallbackImages(
    locationName: string,
    cuisine?: string[],
    count: number = 3
  ): string[] {
    const images: string[] = [];

    // Use different food-related images from Unsplash
    const foodImages = [
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop&crop=center&auto=format&q=80",
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop&crop=center&auto=format&q=80",
      "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop&crop=center&auto=format&q=80",
      "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop&crop=center&auto=format&q=80",
      "https://images.unsplash.com/photo-1565299507177-b0ac667e28f2?w=400&h=300&fit=crop&crop=center&auto=format&q=80",
    ];

    // If we have cuisine information, try to get more specific images
    if (cuisine && cuisine.length > 0) {
      const cuisineImages: { [key: string]: string[] } = {
        nigerian: [
          "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop&crop=center&auto=format&q=80",
          "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop&crop=center&auto=format&q=80",
        ],
        african: [
          "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop&crop=center&auto=format&q=80",
          "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop&crop=center&auto=format&q=80",
        ],
        chinese: [
          "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop&crop=center&auto=format&q=80",
          "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop&crop=center&auto=format&q=80",
        ],
        italian: [
          "https://images.unsplash.com/photo-1565299507177-b0ac667e28f2?w=400&h=300&fit=crop&crop=center&auto=format&q=80",
          "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop&crop=center&auto=format&q=80",
        ],
      };

      const primaryCuisine = cuisine[0].toLowerCase();
      if (cuisineImages[primaryCuisine]) {
        images.push(...cuisineImages[primaryCuisine].slice(0, count));
      }
    }

    // Fill remaining slots with generic food images
    while (images.length < count) {
      const randomImage =
        foodImages[Math.floor(Math.random() * foodImages.length)];
      if (!images.includes(randomImage)) {
        images.push(randomImage);
      }
    }

    return images.slice(0, count);
  }

  /**
   * Check if an image URL is accessible
   */
  static async isImageAccessible(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: "HEAD" });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get the best available image for a location
   */
  static async getBestImage(
    locationName: string,
    cuisine?: string[]
  ): Promise<string> {
    // First try the fallback image
    const fallbackImage = this.getFallbackImage(locationName, cuisine);

    // Check if it's accessible
    const isAccessible = await this.isImageAccessible(fallbackImage);

    if (isAccessible) {
      return fallbackImage;
    }

    // If not accessible, return placeholder
    return "/placeholder-image.jpg";
  }
}
