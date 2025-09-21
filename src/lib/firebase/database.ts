import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
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
  async getLocations(filters?: LocationFilter): Promise<AmalaLocation[]> {
    console.log("🗄️ Database: Querying locations collection...");
    console.log("📊 Filters applied:", filters);

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
      console.error("❌ Firebase query error:", error);
      throw error;
    }
  },

  async getAllLocations(filters?: LocationFilter): Promise<AmalaLocation[]> {
    console.log("🗄️ Database: Querying all locations (no status filter)...");

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
      console.error("❌ Firebase query error:", error);
      throw error;
    }
  },


  async createLocation(
    locationData: Omit<AmalaLocation, "id">
  ): Promise<AmalaLocation> {
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
      console.error("❌ Error creating location:", error);
      throw error;
    }
  },

  // Moderation
  async getPendingLocations(): Promise<AmalaLocation[]> {
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
      console.error("❌ Error fetching pending locations:", error);
      throw error;
    }
  },

  async getLocationsByStatus(
    status: "pending" | "approved" | "rejected"
  ): Promise<AmalaLocation[]> {
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
      console.error("❌ Error fetching locations by status:", error);
      throw error;
    }
  },

  async updateLocationStatus(
    locationId: string,
    status: "pending" | "approved" | "rejected"
  ): Promise<AmalaLocation> {
    console.log(`🔄 Updating location ${locationId} to status: ${status}`);

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
      console.error("❌ Database update error:", error);
      throw error;
    }
  },

  async moderateLocation(
    locationId: string,
    action: "approve" | "reject",
    moderatorId?: string
  ): Promise<AmalaLocation> {
    console.log(`🔄 Moderating location ${locationId}: ${action}`);

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
      console.error("❌ Moderation error:", error);
      throw error;
    }
  },

  // Reviews
  async getLocationById(locationId: string): Promise<AmalaLocation | null> {
    try {
      const locationRef = doc(db, "locations", locationId);
      const locationDoc = await getDoc(locationRef);

      if (!locationDoc.exists()) {
        console.error("Location not found:", locationId);
        return null;
      }

      return convertFirestoreLocation(locationDoc);
    } catch (error) {
      console.error("Error fetching location by ID:", error);
      return null;
    }
  },

  async createReview(reviewData: Omit<Review, "id">): Promise<Review> {
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
      console.error("Error creating review:", error);
      throw error;
    }
  },

  async getReviewsByLocation(locationId: string): Promise<Review[]> {
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
      console.error("Error fetching reviews by location:", error);
      throw error;
    }
  },

  async getReviewsByLocationAndUser(
    locationId: string,
    userId: string
  ): Promise<Review[]> {
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
      console.error("Error fetching reviews by location and user:", error);
      throw error;
    }
  },

  async updateLocationRating(locationId: string): Promise<void> {
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
      console.error("Error updating location rating:", error);
      throw error;
    }
  },

  async getLocationWithReviews(
    locationId: string
  ): Promise<AmalaLocation | null> {
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
      console.error("Error fetching location with reviews:", error);
      throw error;
    }
  },

  async getReviewsByLocationId(locationId: string): Promise<Review[]> {
    return this.getReviewsByLocation(locationId);
  },

  async getReviewsByStatus(status: string): Promise<Review[]> {
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
      console.error(`❌ Error fetching reviews by status ${status}:`, error);
      throw error;
    }
  },

  async updateReview(reviewId: string, updateData: Partial<Review>): Promise<Review | null> {
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
      console.error("Error updating review:", error);
      throw error;
    }
  },

  async deleteReviewsBySource(
    locationId: string,
    source: string
  ): Promise<void> {
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
      console.error("Error deleting reviews by source:", error);
      throw error;
    }
  },

  async updateLocation(
    locationId: string,
    updateData: Partial<AmalaLocation>
  ): Promise<AmalaLocation | null> {
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
      console.error("Error updating location:", error);
      throw error;
    }
  },
};
