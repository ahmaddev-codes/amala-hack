import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
  DocumentData,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "./config";
import { AmalaLocation, LocationFilter, Review } from "@/types/location";
import { withRetry, logFirestoreError, diagnoseFirestoreIssues } from "./firestore-utils";

// Convert Firestore timestamp to Date
const convertTimestamp = (timestamp: any): Date => {
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  if (timestamp?.seconds) {
    return new Date(timestamp.seconds * 1000);
  }
  return new Date(timestamp);
};

// Convert location data from Firestore
const convertFirestoreLocation = (doc: DocumentData): AmalaLocation => {
  const data = doc.data();
  return {
    ...data,
    id: doc.id,
    submittedAt: convertTimestamp(data.submittedAt),
    moderatedAt: data.moderatedAt
      ? convertTimestamp(data.moderatedAt)
      : undefined,
  } as AmalaLocation;
};

// Convert review data from Firestore
const convertFirestoreReview = (doc: DocumentData): Review => {
  const data = doc.data();
  return {
    ...data,
    id: doc.id,
    date_posted: convertTimestamp(data.date_posted || data.datePosted),
  } as Review;
};

export const firebaseOperations = {
  // Locations
  async getLocations(filters?: LocationFilter & { limit?: number; offset?: number }): Promise<AmalaLocation[]> {
    console.log("🗄️ Database: Querying locations collection...");
    console.log("📊 Filters applied:", filters);

    return withRetry(async () => {
      try {
        const locationsRef = collection(db, "locations");
        const constraints: QueryConstraint[] = [
          where("status", "==", "approved"),
        ];

        if (filters?.isOpenNow) {
          constraints.push(where("isOpenNow", "==", true));
        }

        if (filters?.serviceType && filters.serviceType !== "all") {
          constraints.push(where("serviceType", "==", filters.serviceType));
        }

        // Only add sorting if not using limit (to avoid index requirements)
        if (!filters?.limit) {
          if (filters?.sortBy === "name_asc") {
            constraints.push(orderBy("name", "asc"));
          } else if (filters?.sortBy === "name_desc") {
            constraints.push(orderBy("name", "desc"));
          } else {
            constraints.push(orderBy("submittedAt", "desc"));
          }
        }

        // Add pagination support
        if (filters?.limit) {
          constraints.push(limit(filters.limit));
        }

        const q = query(locationsRef, ...constraints);
        const snapshot = await getDocs(q);

        const locations = snapshot.docs.map(convertFirestoreLocation);
        console.log(`📥 Firebase returned ${locations.length} locations (limit: ${filters?.limit || 'none'})`);

        return locations;
      } catch (error) {
        logFirestoreError("getLocations", error, { filters });
        throw error;
      }
    }, "getLocations query", 2); // Fewer retries for read operations
  },

  async getAllLocations(filters?: LocationFilter): Promise<AmalaLocation[]> {
    console.log("🗄️ Database: Querying all locations (no status filter)...");

    return withRetry(async () => {
      try {
        const locationsRef = collection(db, "locations");
        const constraints: QueryConstraint[] = [];

        if (filters?.isOpenNow) {
          constraints.push(where("isOpenNow", "==", true));
        }

        if (filters?.serviceType && filters.serviceType !== "all") {
          constraints.push(where("serviceType", "==", filters.serviceType));
        }

        if (filters?.sortBy === "name_asc") {
          constraints.push(orderBy("name", "asc"));
        } else if (filters?.sortBy === "name_desc") {
          constraints.push(orderBy("name", "desc"));
        }

        const q = query(locationsRef, ...constraints);
        const snapshot = await getDocs(q);

        const locations = snapshot.docs.map(convertFirestoreLocation);
        console.log(`📥 Firebase returned ${locations.length} locations`);

        return locations;
      } catch (error) {
        logFirestoreError("getAllLocations", error, { filters });
        throw error;
      }
    }, "getAllLocations query", 2);
  },

  async createLocation(
    locationData: Omit<AmalaLocation, "id">
  ): Promise<AmalaLocation> {
    return withRetry(async () => {
      try {
        const locationsRef = collection(db, "locations");
        const { reviews, ...locationDataClean } = locationData;

        // Sanitize data to remove undefined values (Firestore doesn't accept undefined)
        const sanitizedData = Object.fromEntries(
          Object.entries(locationDataClean).filter(([_, value]) => value !== undefined)
        );

        // Ensure required fields have default values
        const finalData = {
          ...sanitizedData,
          submittedAt: Timestamp.now(),
          status: "pending",
          reviewCount: reviews ? reviews.length : 0,
          // Provide defaults for commonly undefined fields
          phone: sanitizedData.phone || "",
          website: sanitizedData.website || "",
          rating: sanitizedData.rating || 0,
          description: sanitizedData.description || "",
          priceInfo: sanitizedData.priceInfo || "",
        };

        console.log("🔍 Creating location with sanitized data:", finalData);
        const docRef = await addDoc(locationsRef, finalData);

        let finalReviews: Review[] | undefined = undefined;
        if (reviews && reviews.length > 0) {
          const batch = writeBatch(db);
          const reviewRefs = reviews.map(() => doc(collection(db, "reviews")));
          reviews.forEach((review, index) => {
            const reviewRef = reviewRefs[index];
            batch.set(reviewRef, {
              ...review,
              location_id: docRef.id,
              date_posted: Timestamp.now(),
              status: "approved",
            });
          });

          await batch.commit();

          finalReviews = reviews.map((review, index) => {
            const { id: _, ...reviewClean } = review;
            return {
              id: reviewRefs[index].id,
              ...reviewClean,
              date_posted: Timestamp.now().toDate(),
            } as Review;
          });
        } else if (reviews !== undefined) {
          finalReviews = reviews;
        }

        const result = {
          id: docRef.id,
          ...locationDataClean,
          submittedAt: Timestamp.now().toDate(),
          ...(finalReviews !== undefined ? { reviews: finalReviews } : {}),
        };

        return result as AmalaLocation;
      } catch (error) {
        logFirestoreError("createLocation", error, { locationData });
        throw error;
      }
    }, "createLocation", 3); // More retries for write operations
  },

  // Moderation
  async getPendingLocations(): Promise<AmalaLocation[]> {
    return withRetry(async () => {
      try {
        const locationsRef = collection(db, "locations");
        const q = query(
          locationsRef,
          where("status", "==", "pending"),
          orderBy("submittedAt", "asc")
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(convertFirestoreLocation);
      } catch (error) {
        logFirestoreError("getPendingLocations", error);
        throw error;
      }
    }, "getPendingLocations", 2);
  },

  async getLocationsByStatus(
    status: "pending" | "approved" | "rejected"
  ): Promise<AmalaLocation[]> {
    return withRetry(async () => {
      try {
        const locationsRef = collection(db, "locations");
        const q = query(
          locationsRef,
          where("status", "==", status),
          orderBy("submittedAt", "asc")
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(convertFirestoreLocation);
      } catch (error) {
        logFirestoreError("getLocationsByStatus", error, { status });
        throw error;
      }
    }, "getLocationsByStatus", 2);
  },

  async updateLocationStatus(
    locationId: string,
    status: "pending" | "approved" | "rejected"
  ): Promise<AmalaLocation> {
    console.log(`🔄 Updating location ${locationId} to status: ${status}`);

    return withRetry(async () => {
      try {
        const locationRef = doc(db, "locations", locationId);
        await updateDoc(locationRef, {
          status,
          moderatedAt: Timestamp.now(),
        });

        const updatedDoc = await getDoc(locationRef);
        if (!updatedDoc.exists()) {
          throw new Error("Location not found after update");
        }

        const updatedLocation = convertFirestoreLocation(updatedDoc);
        console.log("✅ Location status updated successfully:", updatedLocation);
        return updatedLocation;
      } catch (error) {
        logFirestoreError("updateLocationStatus", error, { locationId, status });
        throw error;
      }
    }, "updateLocationStatus", 3);
  },

  async moderateLocation(
    locationId: string,
    action: "approve" | "reject",
    moderatorId?: string
  ): Promise<AmalaLocation> {
    console.log(`🔄 Moderating location ${locationId}: ${action}`);

    return withRetry(async () => {
      try {
        const batch = writeBatch(db);

        // Update location
        const locationRef = doc(db, "locations", locationId);
        batch.update(locationRef, {
          status: action === "approve" ? "approved" : "rejected",
          moderatedAt: Timestamp.now(),
          moderatedBy: moderatorId || "anonymous",
        });

        // Log moderation action
        const logRef = doc(collection(db, "moderation_logs"));
        batch.set(logRef, {
          location_id: locationId,
          moderator_id: moderatorId || "anonymous",
          action,
          created_at: Timestamp.now(),
        });

        await batch.commit();

        const updatedDoc = await getDoc(locationRef);
        if (!updatedDoc.exists()) {
          throw new Error("Location not found after moderation");
        }

        const moderatedLocation = convertFirestoreLocation(updatedDoc);
        console.log("✅ Location moderated successfully:", moderatedLocation);
        return moderatedLocation;
      } catch (error) {
        logFirestoreError("moderateLocation", error, { locationId, action, moderatorId });
        throw error;
      }
    }, "moderateLocation", 3);
  },

  // Reviews
  async getLocationById(locationId: string): Promise<AmalaLocation | null> {
    return withRetry(async () => {
      try {
        const locationRef = doc(db, "locations", locationId);
        const locationDoc = await getDoc(locationRef);

        if (!locationDoc.exists()) {
          console.error("Location not found:", locationId);
          return null;
        }

        return convertFirestoreLocation(locationDoc);
      } catch (error) {
        logFirestoreError("getLocationById", error, { locationId });
        return null;
      }
    }, "getLocationById", 2);
  },

  async createReview(reviewData: Omit<Review, "id">): Promise<Review> {
    return withRetry(async () => {
      try {
        const reviewsRef = collection(db, "reviews");
        const locationId = reviewData.location_id;
        const docRef = await addDoc(reviewsRef, {
          ...reviewData,
          date_posted: Timestamp.now(),
          status: "approved",
        });

        if (locationId) {
          await this.updateLocationRating(locationId);
        }

        return {
          id: docRef.id,
          ...reviewData,
          date_posted: Timestamp.now().toDate(),
        } as Review;
      } catch (error) {
        logFirestoreError("createReview", error, { reviewData });
        throw error;
      }
    }, "createReview", 3);
  },

  async getReviewsByLocation(locationId: string): Promise<Review[]> {
    return withRetry(async () => {
      try {
        const reviewsRef = collection(db, "reviews");
        const q = query(
          reviewsRef,
          where("location_id", "==", locationId),
          where("status", "==", "approved"),
          orderBy("date_posted", "desc")
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(convertFirestoreReview);
      } catch (error) {
        logFirestoreError("getReviewsByLocation", error, { locationId });
        throw error;
      }
    }, "getReviewsByLocation", 2);
  },

  async getReviewsByLocationAndUser(
    locationId: string,
    userId: string
  ): Promise<Review[]> {
    return withRetry(async () => {
      try {
        const reviewsRef = collection(db, "reviews");
        const q = query(
          reviewsRef,
          where("location_id", "==", locationId),
          where("status", "==", "approved"),
          where("user_id", "==", userId),
          orderBy("date_posted", "desc")
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(convertFirestoreReview);
      } catch (error) {
        logFirestoreError("getReviewsByLocationAndUser", error, { locationId, userId });
        throw error;
      }
    }, "getReviewsByLocationAndUser", 2);
  },

  async updateLocationRating(locationId: string): Promise<void> {
    return withRetry(async () => {
      try {
        // Get all approved reviews for this location
        const reviewsRef = collection(db, "reviews");
        const q = query(
          reviewsRef,
          where("location_id", "==", locationId),
          where("status", "==", "approved")
        );

        const snapshot = await getDocs(q);
        const reviews = snapshot.docs.map((doc) => doc.data());

        if (reviews.length === 0) {
          return;
        }

        // Calculate average rating
        const totalRating = reviews.reduce(
          (sum, review) => sum + review.rating,
          0
        );
        const averageRating = totalRating / reviews.length;
        const reviewCount = reviews.length;

        // Update location with new rating and review count
        const locationRef = doc(db, "locations", locationId);
        await updateDoc(locationRef, {
          rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
          reviewCount: reviewCount,
        });

        console.log(
          `✅ Updated location ${locationId} rating to ${averageRating} (${reviewCount} reviews)`
        );
      } catch (error) {
        logFirestoreError("updateLocationRating", error, { locationId });
        throw error;
      }
    }, "updateLocationRating", 3);
  },

  async getLocationWithReviews(
    locationId: string
  ): Promise<AmalaLocation | null> {
    return withRetry(async () => {
      try {
        const location = await this.getLocationById(locationId);
        if (!location) {
          return null;
        }

        const reviews = await this.getReviewsByLocation(locationId);

        return {
          ...location,
          reviews: reviews,
        };
      } catch (error) {
        logFirestoreError("getLocationWithReviews", error, { locationId });
        throw error;
      }
    }, "getLocationWithReviews", 2);
  },

  async getReviewsByLocationId(locationId: string): Promise<Review[]> {
    return this.getReviewsByLocation(locationId);
  },

  async getReviewsByStatus(status: string): Promise<Review[]> {
    return withRetry(async () => {
      try {
        console.log(`🔍 Fetching reviews with status: ${status}`);
        const reviewsRef = collection(db, "reviews");
        const q = query(
          reviewsRef,
          where("status", "==", status),
          orderBy("date_posted", "desc")
        );

        const snapshot = await getDocs(q);
        const reviews = snapshot.docs.map(convertFirestoreReview);

        console.log(`📥 Found ${reviews.length} reviews with status ${status}`);
        return reviews;
      } catch (error) {
        logFirestoreError("getReviewsByStatus", error, { status });
        throw error;
      }
    }, "getReviewsByStatus", 2);
  },

  async updateReview(reviewId: string, updateData: Partial<Review>): Promise<Review | null> {
    return withRetry(async () => {
      try {
        const reviewRef = doc(db, "reviews", reviewId);

        // Convert Date objects to Timestamps for Firebase
        const updatePayload: any = { ...updateData };
        if (updatePayload.date_posted instanceof Date) {
          updatePayload.date_posted = Timestamp.fromDate(updatePayload.date_posted);
        }
        if (updatePayload.moderatedAt instanceof Date) {
          updatePayload.moderatedAt = Timestamp.fromDate(updatePayload.moderatedAt);
        }

        await updateDoc(reviewRef, updatePayload);

        const updatedDoc = await getDoc(reviewRef);
        if (!updatedDoc.exists()) {
          return null;
        }

        return convertFirestoreReview(updatedDoc);
      } catch (error) {
        logFirestoreError("updateReview", error, { reviewId, updateData });
        throw error;
      }
    }, "updateReview", 3);
  },

  async deleteReviewsBySource(
    locationId: string,
    source: string
  ): Promise<void> {
    return withRetry(async () => {
      try {
        const reviewsRef = collection(db, "reviews");
        const q = query(
          reviewsRef,
          where("location_id", "==", locationId),
          where("source", "==", source)
        );

        const snapshot = await getDocs(q);
        const batch = writeBatch(db);

        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });

        await batch.commit();
        await this.updateLocationRating(locationId);
        console.log(
          `✅ Deleted ${snapshot.docs.length} reviews with source ${source} for location ${locationId}`
        );
      } catch (error) {
        logFirestoreError("deleteReviewsBySource", error, { locationId, source });
        throw error;
      }
    }, "deleteReviewsBySource", 3);
  },

  async updateLocation(
    locationId: string,
    updateData: Partial<AmalaLocation>
  ): Promise<AmalaLocation | null> {
    return withRetry(async () => {
      try {
        const locationRef = doc(db, "locations", locationId);

        // Convert Date objects to Timestamps for Firebase
        const updatePayload: any = { ...updateData };
        if (updatePayload.submittedAt instanceof Date) {
          updatePayload.submittedAt = Timestamp.fromDate(updatePayload.submittedAt);
        }
        if (updatePayload.moderatedAt instanceof Date) {
          updatePayload.moderatedAt = Timestamp.fromDate(updatePayload.moderatedAt);
        }

        await updateDoc(locationRef, updatePayload);

        const updatedDoc = await getDoc(locationRef);
        if (!updatedDoc.exists()) {
          return null;
        }

        return convertFirestoreLocation(updatedDoc);
      } catch (error) {
        logFirestoreError("updateLocation", error, { locationId, updateData });
        throw error;
      }
    }, "updateLocation", 3);
  },

  // Health check and diagnostics
  async checkHealth() {
    try {
      const health = await import('./firestore-utils').then(module => module.checkFirestoreHealth());
      return health;
    } catch (error) {
      console.error("Health check failed:", error);
      return {
        healthy: false,
        error: "Health check failed to execute",
      };
    }
  },

  async diagnoseIssues() {
    try {
      const diagnosis = await diagnoseFirestoreIssues();
      return diagnosis;
    } catch (error) {
      console.error("Issue diagnosis failed:", error);
      return {
        issues: ["Diagnosis system error"],
        recommendations: ["Contact support"],
      };
    }
  },
};
