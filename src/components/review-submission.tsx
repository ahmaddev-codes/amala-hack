"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useToast } from "@/contexts/ToastContext";
import { Star, CloudUpload, X } from "@mui/icons-material";
import { AmalaLocation } from "@/types/location";

interface ReviewSubmissionProps {
  location: AmalaLocation;
  onSubmitted?: () => void;
  onCancel?: () => void;
}

export function ReviewSubmission({
  location,
  onSubmitted,
  onCancel,
}: ReviewSubmissionProps) {
  const { user, isLoading } = useAuth();
  const { success, error: showError } = useToast();
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newImages = Array.from(e.target.files);
      // Limit to 5 images total
      const totalImages = [...images, ...newImages].slice(0, 5);
      setImages(totalImages);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("Review submission started", {
      user: user ? { id: user.id, email: user.email } : null,
      isLoading,
      locationId: location.id,
      rating,
      reviewTextLength: reviewText.length
    });

    if (!user || isLoading) {
      console.error("Authentication check failed", { user: !!user, isLoading });
      showError(
        "You must be logged in to submit a review",
        "Authentication Required"
      );
      return;
    }

    if (rating === 0) {
      showError("Please select a rating", "Rating Required");
      return;
    }

    if (reviewText.trim().length < 10) {
      showError(
        "Please write a review with at least 10 characters",
        "Review Too Short"
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Get Firebase auth token
      const { auth } = await import("@/lib/firebase/config");
      const currentUser = auth.currentUser;
      let idToken = null;
      
      if (currentUser) {
        idToken = await currentUser.getIdToken();
        console.log("Current Firebase token:", idToken ? "exists" : "missing");
      }

      // Upload images if any
      const imageUrls: string[] = [];

      for (const image of images) {
        try {
          const formData = new FormData();
          formData.append("file", image);
          formData.append("locationId", location.id);
          formData.append("userId", user.id);

          console.log("Uploading image:", image.name, "for location:", location.id);

          const uploadHeaders: Record<string, string> = {};
          if (idToken) {
            uploadHeaders["Authorization"] = `Bearer ${idToken}`;
          }

          const uploadResponse = await fetch("/api/reviews/upload-image", {
            method: "POST",
            headers: uploadHeaders,
            body: formData,
          });

          if (uploadResponse.ok) {
            const uploadResult = await uploadResponse.json();
            console.log("Image upload result:", uploadResult);
            if (uploadResult.imageUrl) {
              imageUrls.push(uploadResult.imageUrl);
            }
          } else {
            const errorText = await uploadResponse.text();
            console.error("Image upload failed:", errorText);
            showError(`Failed to upload image: ${image.name}`, "Upload Error");
          }
        } catch (uploadError) {
          console.error("Image upload error:", uploadError);
          showError(`Failed to upload image: ${image.name}`, "Upload Error");
        }
      }

      console.log("Submitting review with images:", imageUrls);

      // Submit the review
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Add authorization header if we have a token
      if (idToken) {
        headers["Authorization"] = `Bearer ${idToken}`;
        console.log("Added Firebase auth header with token");
      }

      const reviewResponse = await fetch("/api/reviews", {
        method: "POST",
        headers,
        body: JSON.stringify({
          location_id: location.id,
          rating,
          text: reviewText,
          photos: imageUrls, // Use 'photos' field as per existing API
        }),
      });

      if (!reviewResponse.ok) {
        const errorData = await reviewResponse.json();
        console.error("Review submission failed:", errorData);
        throw new Error(errorData.error || "Failed to submit review");
      }

      const reviewResult = await reviewResponse.json();
      console.log("Review submitted successfully:", reviewResult);

      // Reset form
      setRating(0);
      setReviewText("");
      setImages([]);

      success("Review submitted successfully!", "Thank you for your feedback");
      onSubmitted?.();
    } catch (error: any) {
      console.error("Review submission error:", error);
      showError(error.message || "Failed to submit review", "Submission Error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-4 text-center">
        <div className="text-gray-600 mb-4">
          Please sign in to submit a review
        </div>
        <button
          onClick={() => (window.location.href = "/login")}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Review {location.name}</h3>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            <X />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Rating Stars */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Rating *
          </label>
          <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="text-2xl focus:outline-none"
              >
                <Star
                  className={`${
                    star <= (hoverRating || rating)
                      ? "text-yellow-400"
                      : "text-gray-300"
                  } transition-colors`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Review Text */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Review *
          </label>
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Share your experience at this Amala spot..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            minLength={10}
          />
          <div className="text-xs text-gray-500 mt-1">
            {reviewText.length}/500 characters (minimum 10)
          </div>
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Photos (Optional)
          </label>

          {images.length < 5 && (
            <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center hover:border-primary transition-colors">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload" className="cursor-pointer">
                <CloudUpload className="mx-auto text-gray-400 mb-2" />
                <div className="text-sm text-gray-600">
                  Click to upload photos ({images.length}/5)
                </div>
              </label>
            </div>
          )}

          {/* Image Previews */}
          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {images.map((image, index) => (
                <div key={index} className="relative">
                  <Image
                    src={URL.createObjectURL(image)}
                    alt={`Preview ${index + 1}`}
                    width={80}
                    height={80}
                    className="w-full h-20 object-cover rounded-md"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex space-x-3 pt-4">
          <button
            type="submit"
            disabled={
              isSubmitting || rating === 0 || reviewText.trim().length < 10
            }
            className="flex-1 bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? "Submitting..." : "Submit Review"}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Terms Notice */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        By submitting a review, you agree that your review may be moderated
        before being published.
      </div>
    </div>
  );
}
