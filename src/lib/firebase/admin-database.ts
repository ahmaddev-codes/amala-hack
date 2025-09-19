import { adminDb } from './admin-config';
import { AmalaLocation, Review } from "@/types/location";
import { FieldValue } from 'firebase-admin/firestore';

// Admin database operations that bypass security rules
export const adminFirebaseOperations = {
  async createLocation(locationData: Omit<AmalaLocation, "id">): Promise<AmalaLocation> {
    try {
      const { reviews, ...locationDataClean } = locationData;
      
      // Sanitize data to remove undefined values (Firestore doesn't accept undefined)
      const sanitizedData = Object.fromEntries(
        Object.entries(locationDataClean).filter(([_, value]) => value !== undefined)
      );
      
      // Ensure required fields have default values
      const finalData = {
        ...sanitizedData,
        submittedAt: FieldValue.serverTimestamp(),
        status: "pending",
        reviewCount: reviews ? reviews.length : 0,
        // Provide defaults for commonly undefined fields
        phone: sanitizedData.phone || "",
        website: sanitizedData.website || "",
        rating: sanitizedData.rating || 0,
        description: sanitizedData.description || "",
        priceInfo: sanitizedData.priceInfo || "",
      };
      
      console.log("🔍 Admin: Creating location with sanitized data:", finalData);
      const docRef = await adminDb.collection('locations').add(finalData);

      // Handle reviews if present
      let finalReviews: Review[] | undefined = undefined;
      if (reviews && reviews.length > 0) {
        const batch = adminDb.batch();
        const reviewRefs = reviews.map(() => adminDb.collection('reviews').doc());
        
        reviews.forEach((review, index) => {
          const reviewRef = reviewRefs[index];
          batch.set(reviewRef, {
            ...review,
            location_id: docRef.id,
            date_posted: FieldValue.serverTimestamp(),
            status: "approved",
          });
        });

        await batch.commit();

        finalReviews = reviews.map((review, index) => {
          const { id: _, ...reviewClean } = review;
          return {
            id: reviewRefs[index].id,
            ...reviewClean,
            date_posted: new Date(),
          } as Review;
        });
      } else if (reviews !== undefined) {
        finalReviews = reviews;
      }

      const result = {
        id: docRef.id,
        ...locationDataClean,
        submittedAt: new Date(),
        status: "pending" as const,
        reviewCount: reviews ? reviews.length : 0,
        phone: sanitizedData.phone || "",
        website: sanitizedData.website || "",
        rating: sanitizedData.rating || 0,
        description: sanitizedData.description || "",
        priceInfo: sanitizedData.priceInfo || "",
        ...(finalReviews !== undefined ? { reviews: finalReviews } : {}),
      } as AmalaLocation;

      console.log("✅ Admin: Location created successfully:", result.id);
      return result;
    } catch (error) {
      console.error("❌ Admin: Error creating location:", error);
      console.error("🔍 Admin: Full error details:", JSON.stringify(error, null, 2));
      throw error;
    }
  },

  async getAllLocations(): Promise<AmalaLocation[]> {
    try {
      console.log("🗄️ Admin: Querying all locations...");
      const snapshot = await adminDb.collection('locations').get();
      const locations = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          submittedAt: data.submittedAt?.toDate() || new Date(),
          moderatedAt: data.moderatedAt?.toDate() || undefined,
        } as AmalaLocation;
      });
      
      console.log(`📥 Admin: Firebase returned ${locations.length} locations`);
      return locations;
    } catch (error) {
      console.error("❌ Admin: Error fetching locations:", error);
      return [];
    }
  },

  async updateLocationStatus(locationId: string, status: "approved" | "rejected" | "pending"): Promise<void> {
    try {
      await adminDb.collection('locations').doc(locationId).update({
        status,
        moderatedAt: FieldValue.serverTimestamp(),
      });
      console.log(`✅ Admin: Location ${locationId} status updated to ${status}`);
    } catch (error) {
      console.error(`❌ Admin: Error updating location ${locationId} status:`, error);
      throw error;
    }
  }
};
