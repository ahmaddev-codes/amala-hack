"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useToast } from "@/contexts/ToastContext";
import { StarIcon, CloudArrowUpIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
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
  const [isDragOver, setIsDragOver] = useState(false);
  const [userReviews, setUserReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  
  // Add ref to track if component is mounted to prevent state updates after unmount
  const isMountedRef = React.useRef(true);
  
  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fetch existing user reviews for this location
  React.useEffect(() => {
    const fetchUserReviews = async () => {
      if (!user?.id || !location.id) return;
      
      setLoadingReviews(true);
      try {
        const { auth } = await import("@/lib/firebase/config");
        const currentUser = auth.currentUser;
        let idToken = null;
        
        if (currentUser) {
          idToken = await currentUser.getIdToken();
        }

        const response = await fetch(`/api/reviews?location_id=${location.id}&user_id=${user.id}`, {
          headers: idToken ? { "Authorization": `Bearer ${idToken}` } : {},
        });
        
        if (response.ok) {
          const data = await response.json();
          if (isMountedRef.current) {
            setUserReviews(data.reviews || []);
          }
        }
      } catch (error) {
        console.error('Error fetching user reviews:', error);
      } finally {
        if (isMountedRef.current) {
          setLoadingReviews(false);
        }
      }
    };

    fetchUserReviews();
  }, [user?.id, location.id]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newImages = Array.from(e.target.files);
      addImages(newImages);
    }
  };

  const addImages = (newImages: File[]) => {
    // Filter for valid image files
    const validImages = newImages.filter(file => {
      if (!file.type.startsWith('image/')) {
        if (isMountedRef.current) {
          showError(`"${file.name}" is not a valid image file`, "Invalid File");
        }
        return false;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        if (isMountedRef.current) {
          showError(`"${file.name}" is too large (max 5MB)`, "File Too Large");
        }
        return false;
      }
      return true;
    });

    // Limit to 5 images total
    const remainingSlots = 5 - images.length;
    const imagesToAdd = validImages.slice(0, remainingSlots);
    
    if (validImages.length > remainingSlots && isMountedRef.current) {
      showError(
        `Only ${remainingSlots} more image(s) can be added (5 max total)`,
        "Upload Limit"
      );
    }

    if (imagesToAdd.length > 0) {
      setImages(prev => [...prev, ...imagesToAdd]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    addImages(files);
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
      let idToken = null;
      
      try {
        const { auth } = await import("@/lib/firebase/config");
        const currentUser = auth.currentUser;
        
        if (currentUser) {
          idToken = await currentUser.getIdToken();
          console.log("Current Firebase token:", idToken ? "exists" : "missing");
        } else {
          console.warn("No current user found in Firebase Auth");
        }
      } catch (authError) {
        console.error("Error getting Firebase auth token:", authError);
        showError("Authentication error. Please try signing in again.", "Auth Error");
        return;
      }

      // Upload images if any
      const imageUrls: string[] = [];
      let uploadErrors = 0;

      if (images.length > 0) {
        console.log(`Starting upload of ${images.length} images...`);
      }

      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        try {
          // Check file size before upload
          if (image.size > 5 * 1024 * 1024) {
            console.error(`Image ${image.name} is too large: ${image.size} bytes`);
            if (isMountedRef.current) {
              showError(`Image "${image.name}" is too large (max 5MB)`, "Upload Error");
            }
            uploadErrors++;
            continue;
          }

          const formData = new FormData();
          formData.append("file", image);
          formData.append("locationId", location.id);
          formData.append("userId", user.id);

          console.log(`Uploading image ${i + 1}/${images.length}:`, image.name, "Size:", image.size, "bytes");

          const uploadHeaders: Record<string, string> = {};
          if (idToken) {
            uploadHeaders["Authorization"] = `Bearer ${idToken}`;
          }

          // Add timeout to prevent hanging requests
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

          try {
            const uploadResponse = await fetch("/api/reviews/upload-image", {
              method: "POST",
              headers: uploadHeaders,
              body: formData,
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (uploadResponse.ok) {
              const uploadResult = await uploadResponse.json();
              console.log("✅ Image upload successful:", uploadResult);
              if (uploadResult.imageUrl) {
                imageUrls.push(uploadResult.imageUrl);
              }
            } else {
              const errorText = await uploadResponse.text();
              console.error("❌ Image upload failed:", uploadResponse.status, errorText);
              if (isMountedRef.current) {
                showError(`Failed to upload "${image.name}": ${uploadResponse.status} error`, "Upload Error");
              }
              uploadErrors++;
            }
          } catch (fetchError: any) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
              console.error("❌ Image upload timeout:", image.name);
              if (isMountedRef.current) {
                showError(`Upload timeout for "${image.name}" (30s limit)`, "Upload Timeout");
              }
            } else {
              console.error("❌ Image upload network error:", fetchError);
              if (isMountedRef.current) {
                showError(`Network error uploading "${image.name}"`, "Upload Error");
              }
            }
            uploadErrors++;
          }
        } catch (uploadError) {
          console.error("❌ Image upload error:", uploadError);
          if (isMountedRef.current) {
            showError(`Failed to upload "${image.name}": ${(uploadError as Error).message}`, "Upload Error");
          }
          uploadErrors++;
        }
      }

      // Show summary of upload results
      if (images.length > 0) {
        const successCount = imageUrls.length;
        console.log(`Upload summary: ${successCount}/${images.length} images uploaded successfully`);
        
        if (uploadErrors > 0 && successCount === 0) {
          // All uploads failed - show error and stop submission
          if (isMountedRef.current) {
            showError(
              `All ${images.length} image uploads failed. Please try uploading smaller images or check your connection.`,
              "Upload Failed"
            );
          }
          return; // Stop submission
        } else if (uploadErrors > 0) {
          // Some uploads failed - notify user but continue
          if (isMountedRef.current) {
            showError(
              `${uploadErrors} image(s) failed to upload. Continuing with ${successCount} image(s).`,
              "Partial Upload"
            );
          }
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

      // Reset form only if component is still mounted
      if (isMountedRef.current) {
        setRating(0);
        setReviewText("");
        setImages([]);
        success("Review submitted for moderation!", "Your review will be published after approval by Moderators");
        
        // Refresh user reviews to show the new one
        const fetchUserReviews = async () => {
          try {
            const { auth } = await import("@/lib/firebase/config");
            const currentUser = auth.currentUser;
            let idToken = null;
            
            if (currentUser) {
              idToken = await currentUser.getIdToken();
            }

            const response = await fetch(`/api/reviews?location_id=${location.id}&user_id=${user.id}`, {
              headers: idToken ? { "Authorization": `Bearer ${idToken}` } : {},
            });
            
            if (response.ok) {
              const data = await response.json();
              if (isMountedRef.current) {
                setUserReviews(data.reviews || []);
              }
            }
          } catch (error) {
            console.error('Error refreshing user reviews:', error);
          }
        };
        
        fetchUserReviews();
      }
      
      // Always call onSubmitted callback
      onSubmitted?.();
    } catch (error: any) {
      console.error("Review submission error:", error);
      if (isMountedRef.current) {
        showError(error.message || "Failed to submit review", "Submission Error");
      }
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
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
          onClick={() => {
            // Use Next.js router instead of window.location to prevent full page reload
            if (typeof window !== 'undefined') {
              window.location.href = "/login";
            }
          }}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg max-w-md mx-auto max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">Review {location.name}</h3>
          {userReviews.length > 0 && (
            <p className="text-sm text-gray-600">
              You have {userReviews.length} previous review{userReviews.length !== 1 ? 's' : ''} for this location
            </p>
          )}
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Show existing user reviews */}
      {userReviews.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Your Previous Reviews:</h4>
          <div className="space-y-3 max-h-32 overflow-y-auto">
            {userReviews.map((review, index) => (
              <div key={review.id || index} className="text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <StarSolidIcon
                        key={i}
                        className={`w-3 h-3 ${
                          i < review.rating ? 'text-yellow-400' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(review.date_posted || review.createdAt).toLocaleDateString()}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    review.status === 'approved' ? 'bg-green-100 text-green-700' :
                    review.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {review.status}
                  </span>
                </div>
                <p className="text-gray-600 text-xs line-clamp-2">{review.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              ✨ You can add another review to share a different experience or update your thoughts!
            </p>
          </div>
        </div>
      )}

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
                {star <= (hoverRating || rating) ? (
                  <StarSolidIcon className="w-6 h-6 text-yellow-400 transition-colors" />
                ) : (
                  <StarIcon className="w-6 h-6 text-gray-300 transition-colors" />
                )}
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
            <div 
              className={`border-2 border-dashed rounded-md p-6 text-center transition-all duration-200 ${
                isDragOver 
                  ? 'border-orange-400 bg-orange-50 scale-105' 
                  : 'border-gray-300 hover:border-orange-300 hover:bg-gray-50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload" className="cursor-pointer block">
                <CloudArrowUpIcon className={`w-10 h-10 mx-auto mb-3 transition-colors ${
                  isDragOver ? 'text-orange-500' : 'text-gray-400'
                }`} />
                <div className={`text-base font-medium mb-1 transition-colors ${
                  isDragOver ? 'text-orange-700' : 'text-gray-700'
                }`}>
                  {isDragOver ? 'Drop images here!' : 'Drag & drop images here'}
                </div>
                <div className="text-sm text-gray-500 mb-2">
                  or click to browse ({images.length}/5)
                </div>
                <div className="text-xs text-gray-400">
                  Supports: JPG, PNG, GIF (max 5MB each)
                </div>
              </label>
            </div>
          )}

          {/* Image Previews */}
          {images.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">
                  Selected Images ({images.length}/5)
                </span>
                {images.length < 5 && (
                  <span className="text-xs text-gray-500">
                    You can add {5 - images.length} more
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map((image, index) => (
                  <div key={index} className="relative group">
                    <Image
                      src={URL.createObjectURL(image)}
                      alt={`Preview ${index + 1}`}
                      width={100}
                      height={100}
                      className="w-full h-24 object-cover rounded-lg border-2 border-gray-200 group-hover:border-orange-300 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs hover:bg-red-600 transition-colors shadow-lg"
                      title="Remove image"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-1 left-1 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                      {(image.size / 1024 / 1024).toFixed(1)}MB
                    </div>
                  </div>
                ))}
                
                {/* Add more images slot */}
                {images.length < 5 && (
                  <div 
                    className="h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-orange-300 hover:bg-gray-50 transition-colors"
                    onClick={() => document.getElementById('image-upload')?.click()}
                  >
                    <div className="text-center">
                      <CloudArrowUpIcon className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                      <span className="text-xs text-gray-500">Add more</span>
                    </div>
                  </div>
                )}
              </div>
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
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="text-xs text-blue-700 text-center">
          <strong>📋 Moderation Notice:</strong> All reviews are reviewed by our team before publication to ensure quality and authenticity. You'll be able to see your review status in your submission history.
        </div>
      </div>
    </div>
  );
}
