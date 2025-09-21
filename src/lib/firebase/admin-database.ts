import { adminDb } from './admin';
import { AmalaLocation, Review } from "@/types/location";
import { FieldValue } from 'firebase-admin/firestore';
import { Timestamp } from 'firebase-admin/firestore';

// Admin database operations that bypass security rules
class AdminDatabase {
  // Convert Firestore timestamp to Date
  private convertTimestamp(timestamp: any): Date {
    if (timestamp?.toDate) {
      return timestamp.toDate();
    }
    if (timestamp?.seconds) {
      return new Date(timestamp.seconds * 1000);
    }
    return new Date(timestamp);
  }

  // Convert Firestore document to AmalaLocation
  private convertFirestoreLocation(doc: FirebaseFirestore.QueryDocumentSnapshot): AmalaLocation {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      submittedAt: this.convertTimestamp(data.submittedAt),
      moderatedAt: data.moderatedAt ? this.convertTimestamp(data.moderatedAt) : undefined,
    } as AmalaLocation;
  }

  // Convert Firestore document to Review
  private convertFirestoreReview(doc: FirebaseFirestore.QueryDocumentSnapshot): Review {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      date_posted: this.convertTimestamp(data.date_posted),
    } as Review;
  }

  // Moderate a location (approve/reject)
  async moderateLocation(
    locationId: string,
    action: 'approve' | 'reject',
    moderatorId: string
  ): Promise<AmalaLocation> {
    try {
      const locationRef = adminDb.collection('locations').doc(locationId);
      const updateData = {
        status: action === 'approve' ? 'approved' : 'rejected',
        moderatedAt: FieldValue.serverTimestamp(),
        moderatedBy: moderatorId,
      };

      await locationRef.update(updateData);
      const updatedDoc = await locationRef.get();

      return this.convertFirestoreLocation(updatedDoc as FirebaseFirestore.QueryDocumentSnapshot);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to moderate location: ${errorMessage}`);
    }
  }

  // Get all locations with optional filtering
  async getLocations(filters: { status?: string } = {}): Promise<AmalaLocation[]> {
    try {
      let query: FirebaseFirestore.Query = adminDb.collection('locations');

      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => this.convertFirestoreLocation(doc as FirebaseFirestore.QueryDocumentSnapshot));
    } catch (error) {
      throw error;
    }
  }

  // Get all locations regardless of status (for admin views)
  async getAllLocations(): Promise<AmalaLocation[]> {
    try {
      const locationsRef = adminDb.collection('locations');
      const snapshot = await locationsRef.get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AmalaLocation[];
    } catch (error) {
      return [];
    }
  }

  // PERFORMANCE OPTIMIZATION: Find similar locations using database queries
  // instead of loading all locations into memory
  async findSimilarLocations(name: string, address: string, threshold: number = 0.7): Promise<AmalaLocation[]> {
    try {
      const locationsRef = adminDb.collection('locations');

      // Use name-based query first (more efficient than loading all)
      const nameWords = name.toLowerCase().split(' ').filter(word => word.length > 2);
      const addressWords = address.toLowerCase().split(' ').filter(word => word.length > 2);

      // Query by first significant word in name
      if (nameWords.length > 0) {
        const firstWord = nameWords[0];
        const q = adminDb.collection('locations').where('name', '>=', firstWord).where('name', '<=', firstWord + '\uf8ff').limit(50);

        const snapshot = await q.get();
        const locations = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as AmalaLocation[];

        // Filter by similarity threshold
        return locations.filter(location => {
          const nameSim = this.calculateSimilarity(name.toLowerCase(), location.name.toLowerCase());
          const addrSim = this.calculateSimilarity(address.toLowerCase(), location.address.toLowerCase());
          return nameSim > threshold || addrSim > 0.85;
        });
      }

      return [];
    } catch (error) {
      console.error('Error finding similar locations:', error);
      return [];
    }
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    // Initialize matrix
    for (let i = 0; i <= len2; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len1; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    const maxLen = Math.max(len1, len2);
    return (maxLen - matrix[len2][len1]) / maxLen;
  }

  /**
   * PERFORMANCE: Get paginated locations regardless of status
   */
  async getLocationsPaginated(limit: number = 50, offset: number = 0): Promise<AmalaLocation[]> {
    try {
      const locationsRef = adminDb.collection('locations');
      const query = locationsRef.orderBy('submittedAt', 'desc').limit(limit).offset(offset);
      const snapshot = await query.get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AmalaLocation[];
    } catch (error) {
      console.error('Error getting paginated locations:', error);
      return [];
    }
  }

  /**
   * PERFORMANCE: Get paginated locations by status
   */
  async getLocationsByStatusPaginated(
    status: "pending" | "approved" | "rejected", 
    limit: number = 50, 
    offset: number = 0
  ): Promise<AmalaLocation[]> {
    try {
      const locationsRef = adminDb.collection('locations');
      const query = locationsRef
        .where('status', '==', status)
        .orderBy('submittedAt', 'desc')
        .limit(limit)
        .offset(offset);
      const snapshot = await query.get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AmalaLocation[];
    } catch (error) {
      console.error(`Error getting paginated ${status} locations:`, error);
      return [];
    }
  }

  // Get locations by specific status
  async getLocationsByStatus(status: "pending" | "approved" | "rejected"): Promise<AmalaLocation[]> {
    try {
      console.log(`🗄️ Admin: Querying locations with status: ${status}...`);
      return this.getLocations({ status });
    } catch (error) {
      console.error(`Error getting ${status} locations:`, error);
      throw error;
    }
  }

  // Get pending locations
  async getPendingLocations(): Promise<AmalaLocation[]> {
    return this.getLocations({ status: 'pending' });
  }

  // Get location by ID
  async getLocationById(locationId: string): Promise<AmalaLocation | null> {
    try {
      const doc = await adminDb.collection('locations').doc(locationId).get();
      if (!doc.exists) {
        return null;
      }
      return this.convertFirestoreLocation(doc as FirebaseFirestore.QueryDocumentSnapshot);
    } catch (error) {
      console.error(`Error getting location ${locationId}:`, error);
      throw error;
    }
  }

  /**
   * Update an existing location
   */
  async updateLocation(locationId: string, updateData: Partial<AmalaLocation>): Promise<void> {
    try {
      const locationRef = adminDb.collection('locations').doc(locationId);
      
      // Sanitize data to remove undefined values
      const sanitizedData = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== undefined)
      );
      
      await locationRef.update({
        ...sanitizedData,
        updatedAt: FieldValue.serverTimestamp()
      });
      
      console.log(`✅ Updated location ${locationId}`);
    } catch (error) {
      console.error(`Error updating location ${locationId}:`, error);
      throw error;
    }
  }

  // Create a new location
  async createLocation(locationData: Partial<Omit<AmalaLocation, "id">>): Promise<AmalaLocation> {
    try {
      const { reviews, ...locationDataClean } = locationData;
      
      // Set default values for all fields with proper type safety
      const defaults: Omit<AmalaLocation, "id"> = {
        // Required fields with defaults if not provided
        name: locationDataClean.name || "",
        address: locationDataClean.address || "",
        coordinates: locationDataClean.coordinates || { lat: 0, lng: 0 },
        isOpenNow: locationDataClean.isOpenNow ?? false,
        serviceType: locationDataClean.serviceType || "dine-in",
        cuisine: locationDataClean.cuisine || [],
        dietary: locationDataClean.dietary || [],
        features: locationDataClean.features || [],
        hours: locationDataClean.hours || {},
        status: "pending",
        submittedAt: FieldValue.serverTimestamp() as unknown as Date,
        reviewCount: reviews?.length || 0,
        
        // Optional fields with defaults
        phone: locationDataClean.phone || "",
        website: locationDataClean.website || "",
        email: locationDataClean.email || "",
        description: locationDataClean.description || "",
        priceInfo: locationDataClean.priceInfo || "",
        priceMin: locationDataClean.priceMin,
        priceMax: locationDataClean.priceMax,
        priceLevel: locationDataClean.priceLevel,
        currency: locationDataClean.currency || "NGN",
        city: locationDataClean.city || "",
        country: locationDataClean.country || "",
        specialFeatures: locationDataClean.specialFeatures || [],
        moderatedAt: locationDataClean.moderatedAt,
        moderatedBy: locationDataClean.moderatedBy,
        submittedBy: locationDataClean.submittedBy,
      };

      // Sanitize data to remove undefined values (Firestore doesn't accept undefined)
      const sanitizedData = Object.fromEntries(
        Object.entries(defaults).filter(([_, value]) => value !== undefined)
      ) as Omit<AmalaLocation, "id">;

      // Add the document to Firestore
      const docRef = await adminDb.collection("locations").add(sanitizedData);
      
      // Return the created location with the new ID
      return {
        id: docRef.id,
        ...sanitizedData,
        submittedAt: new Date(), // Use current time since we can't get the server timestamp back
      } as AmalaLocation;
    } catch (error) {
      console.error("Error creating location:", error);
      throw new Error(`Failed to create location: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Update location status
  async updateLocationStatus(
    locationId: string, 
    status: "approved" | "rejected" | "pending",
    moderatorId?: string
  ): Promise<AmalaLocation> {
    try {
      const updateData: any = {
        status,
        moderatedAt: FieldValue.serverTimestamp(),
      };
      
      if (moderatorId) {
        updateData.moderatedBy = moderatorId;
      }
      
      await adminDb.collection('locations').doc(locationId).update(updateData);
      
      // Return the updated location
      const doc = await adminDb.collection('locations').doc(locationId).get();
      return this.convertFirestoreLocation(doc as FirebaseFirestore.QueryDocumentSnapshot);
    } catch (error) {
      console.error(`Error updating location ${locationId} status to ${status}:`, error);
      throw error;
    }
  }

  // Update location status with action
  async updateLocationStatusWithAction(
    locationId: string, 
    action: 'approve' | 'reject',
    moderatorId?: string
  ): Promise<AmalaLocation> {
    const status = action === 'approve' ? 'approved' : 'rejected';
    return this.updateLocationStatus(locationId, status, moderatorId);
  }

  // Get reviews by status
  async getReviewsByStatus(status: string): Promise<Review[]> {
    try {
      const snapshot = await adminDb.collection('reviews')
        .where('status', '==', status)
        .get();
        
      return snapshot.docs.map(doc => this.convertFirestoreReview(doc as FirebaseFirestore.QueryDocumentSnapshot));
    } catch (error) {
      console.error(`Error getting ${status} reviews:`, error);
      throw error;
    }
  }

  // Update review status
  async updateReviewStatus(
    reviewId: string, 
    status: "approved" | "rejected" | "pending",
    moderatorId?: string
  ): Promise<Review> {
    try {
      const updateData: any = {
        status,
        reviewedAt: FieldValue.serverTimestamp(),
      };
      
      if (moderatorId) {
        updateData.reviewedBy = moderatorId;
      }
      
      await adminDb.collection('reviews').doc(reviewId).update(updateData);
      
      // Return the updated review
      const doc = await adminDb.collection('reviews').doc(reviewId).get();
      return this.convertFirestoreReview(doc as FirebaseFirestore.QueryDocumentSnapshot);
    } catch (error) {
      console.error(`Error updating review ${reviewId} status to ${status}:`, error);
      throw error;
    }
  }

  // Create a new review
  async createReview(reviewData: Partial<Review> & { user_name?: string; user_photo?: string | null }): Promise<Review> {
    try {
      // Set default values for review
      const defaults: Omit<Review, "id"> = {
        location_id: reviewData.location_id || "",
        user_id: reviewData.user_id || "",
        author: reviewData.user_name || reviewData.author || "Anonymous",
        rating: reviewData.rating || 1,
        text: reviewData.text || "",
        photos: reviewData.photos || [],
        date_posted: FieldValue.serverTimestamp() as unknown as Date,
        status: "pending",
      };

      // Sanitize data to remove undefined values
      const sanitizedData = Object.fromEntries(
        Object.entries(defaults).filter(([_, value]) => value !== undefined)
      ) as Omit<Review, "id">;

      // Add the document to Firestore
      const docRef = await adminDb.collection("reviews").add(sanitizedData);
      
      // Return the created review with the new ID
      return {
        id: docRef.id,
        ...sanitizedData,
        date_posted: new Date(), // Use current time since we can't get the server timestamp back
      } as Review;
    } catch (error) {
      console.error("Error creating review:", error);
      throw new Error(`Failed to create review: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Get reviews by location and user
  async getReviewsByLocationAndUser(locationId: string, userId: string): Promise<Review[]> {
    try {
      const snapshot = await adminDb.collection('reviews')
        .where('location_id', '==', locationId)
        .where('user_id', '==', userId)
        .get();
        
      return snapshot.docs.map(doc => this.convertFirestoreReview(doc as FirebaseFirestore.QueryDocumentSnapshot));
    } catch (error) {
      console.error(`Error getting reviews for location ${locationId} and user ${userId}:`, error);
      throw error;
    }
  }

  // Update location rating based on approved reviews
  async updateLocationRating(locationId: string): Promise<void> {
    try {
      // Get all approved reviews for this location
      const reviewsSnapshot = await adminDb.collection('reviews')
        .where('location_id', '==', locationId)
        .where('status', '==', 'approved')
        .get();

      const reviews = reviewsSnapshot.docs.map(doc => doc.data() as Review);
      
      if (reviews.length === 0) {
        // No reviews yet, set defaults
        await adminDb.collection('locations').doc(locationId).update({
          rating: 0,
          reviewCount: 0,
        });
        return;
      }

      // Calculate average rating
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalRating / reviews.length;

      // Update location with new rating and count
      await adminDb.collection('locations').doc(locationId).update({
        rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
        reviewCount: reviews.length,
      });
    } catch (error) {
      console.error(`Error updating location ${locationId} rating:`, error);
      throw error;
    }
  }

  // Flagged Content Management
  async getFlaggedContent(status: string = "pending"): Promise<any[]> {
    try {
      const snapshot = await adminDb.collection('flagged_content')
        .where('status', '==', status)
        .orderBy('reportedAt', 'desc')
        .get();
        
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        reportedAt: this.convertTimestamp(doc.data().reportedAt),
      }));
    } catch (error: any) {
      console.error(`Error getting flagged content with status ${status}:`, error);
      // Return empty array if collection doesn't exist yet
      if (error?.code === 'not-found' || error?.message?.includes('collection')) {
        return [];
      }
      throw error;
    }
  }

  async createFlaggedContent(flagData: any): Promise<any> {
    try {
      const docRef = await adminDb.collection('flagged_content').add({
        ...flagData,
        reportedAt: FieldValue.serverTimestamp(),
        status: 'pending',
      });
      
      return {
        id: docRef.id,
        ...flagData,
        reportedAt: new Date(),
      };
    } catch (error) {
      console.error("Error creating flagged content:", error);
      throw error;
    }
  }

  async moderateFlaggedContent(
    flagId: string,
    action: 'dismiss' | 'uphold' | 'escalate',
    moderatorEmail: string,
    notes?: string
  ): Promise<any> {
    try {
      const updateData = {
        status: action === 'dismiss' ? 'dismissed' : action === 'uphold' ? 'upheld' : 'escalated',
        moderatedAt: FieldValue.serverTimestamp(),
        moderatedBy: moderatorEmail,
        moderatorNotes: notes || '',
      };

      await adminDb.collection('flagged_content').doc(flagId).update(updateData);
      
      // Log the moderation action
      await adminDb.collection('moderation_logs').add({
        type: 'flag_moderation',
        flagId,
        action,
        moderatorEmail,
        notes,
        timestamp: FieldValue.serverTimestamp(),
      });

      const doc = await adminDb.collection('flagged_content').doc(flagId).get();
      return {
        id: doc.id,
        ...doc.data(),
        moderatedAt: new Date(),
      };
    } catch (error) {
      console.error(`Error moderating flagged content ${flagId}:`, error);
      throw error;
    }
  }

  // Moderation History
  async getModerationHistory(filters: {
    moderatorEmail?: string;
    days?: number;
    limit?: number;
  } = {}): Promise<any[]> {
    try {
      let query: FirebaseFirestore.Query = adminDb.collection('moderation_logs');
      
      if (filters.moderatorEmail) {
        query = query.where('moderatorEmail', '==', filters.moderatorEmail);
      }
      
      if (filters.days) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - filters.days);
        query = query.where('timestamp', '>=', cutoffDate);
      }
      
      query = query.orderBy('timestamp', 'desc');
      
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      
      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: this.convertTimestamp(doc.data().timestamp),
      }));
    } catch (error: any) {
      console.error("Error getting moderation history:", error);
      // Return empty array if collection doesn't exist yet
      if (error?.code === 'not-found' || error?.message?.includes('collection')) {
        return [];
      }
      throw error;
    }
  }

  // User Management
  async searchUsers(filters: {
    query?: string;
    role?: string;
    limit?: number;
  } = {}): Promise<any[]> {
    try {
      let query: FirebaseFirestore.Query = adminDb.collection('users');
      
      if (filters.role) {
        query = query.where('roles', 'array-contains', filters.role);
      }
      
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      
      const snapshot = await query.get();
      let users = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: this.convertTimestamp(data.createdAt),
        };
      });

      // Filter by query string if provided
      if (filters.query) {
        const queryLower = filters.query.toLowerCase();
        users = users.filter((user: any) => 
          user.email?.toLowerCase().includes(queryLower) ||
          user.name?.toLowerCase().includes(queryLower)
        );
      }
      
      return users;
    } catch (error) {
      console.error("Error searching users:", error);
      throw error;
    }
  }

  async manageUserRole(
    email: string,
    role: string,
    action: 'add' | 'remove',
    adminEmail: string
  ): Promise<any> {
    try {
      // First, find or create the user document
      const userQuery = await adminDb.collection('users').where('email', '==', email).get();
      
      let userDoc;
      if (userQuery.empty) {
        // Create new user document
        const newUserRef = await adminDb.collection('users').add({
          email,
          roles: action === 'add' ? [role] : [],
          createdAt: FieldValue.serverTimestamp(),
          managedBy: adminEmail,
        });
        userDoc = await newUserRef.get();
      } else {
        userDoc = userQuery.docs[0];
      }

      const userData = userDoc.data();
      const currentRoles = userData?.roles || [];
      
      let newRoles;
      if (action === 'add') {
        newRoles = [...new Set([...currentRoles, role])]; // Add role if not exists
      } else {
        newRoles = currentRoles.filter((r: string) => r !== role); // Remove role
      }

      await userDoc.ref.update({
        roles: newRoles,
        lastModified: FieldValue.serverTimestamp(),
        lastModifiedBy: adminEmail,
      });

      // Log the role change
      await adminDb.collection('moderation_logs').add({
        type: 'role_management',
        targetEmail: email,
        role,
        action,
        adminEmail,
        timestamp: FieldValue.serverTimestamp(),
      });

      return {
        id: userDoc.id,
        email,
        roles: newRoles,
        lastModified: new Date(),
      };
    } catch (error) {
      console.error(`Error managing user role for ${email}:`, error);
      throw error;
    }
  }

  // User Role Management Methods
  async getAllUsersWithRoles(): Promise<any[]> {
    try {
      const usersSnapshot = await adminDb.collection('users').get();
      const users: any[] = [];
      
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        users.push({
          id: doc.id,
          email: userData.email,
          displayName: userData.displayName || '',
          roles: userData.roles || ['user'],
          createdAt: this.convertTimestamp(userData.createdAt),
          updatedAt: this.convertTimestamp(userData.updatedAt),
          lastLoginAt: userData.lastLoginAt ? this.convertTimestamp(userData.lastLoginAt) : null,
        });
      });
      
      return users.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    } catch (error) {
      console.error('Error fetching users with roles:', error);
      throw error;
    }
  }

  async createOrUpdateUser(userData: {
    email: string;
    roles: string[];
    displayName?: string;
    createdAt: Date;
    updatedAt: Date;
  }): Promise<any> {
    try {
      const userRef = adminDb.collection('users').doc(userData.email);
      const userDoc = await userRef.get();
      
      const data = {
        email: userData.email,
        roles: userData.roles,
        displayName: userData.displayName || '',
        updatedAt: FieldValue.serverTimestamp(),
        ...(userDoc.exists ? {} : { createdAt: FieldValue.serverTimestamp() })
      };
      
      await userRef.set(data, { merge: true });
      
      return {
        id: userData.email,
        ...data,
        createdAt: userDoc.exists ? this.convertTimestamp(userDoc.data()?.createdAt) : new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error creating/updating user:', error);
      throw error;
    }
  }

  async checkUserExists(email: string): Promise<{ exists: boolean; user?: any }> {
    try {
      const userRef = adminDb.collection('users').doc(email);
      const userDoc = await userRef.get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        return {
          exists: true,
          user: {
            id: userDoc.id,
            ...userData,
            createdAt: this.convertTimestamp(userData?.createdAt),
            updatedAt: this.convertTimestamp(userData?.updatedAt)
          }
        };
      }
      
      return { exists: false };
    } catch (error) {
      console.error('Error checking user existence:', error);
      return { exists: false };
    }
  }

  async updateUserRole(email: string, role: string, add: boolean): Promise<{ success: boolean; error?: string; user?: any }> {
    try {
      const userRef = adminDb.collection('users').doc(email);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        return { 
          success: false, 
          error: `User with email ${email} does not exist. Users must register on the platform before roles can be assigned.` 
        };
      }
      
      const userData = userDoc.data();
      let currentRoles = userData?.roles || ['user'];
      
      // Ensure user role is always present
      if (!currentRoles.includes('user')) {
        currentRoles.push('user');
      }
      
      if (add) {
        if (!currentRoles.includes(role)) {
          currentRoles.push(role);
        }
      } else {
        if (role === 'user') {
          return { success: false, error: "Cannot remove the base 'user' role" };
        }
        currentRoles = currentRoles.filter((r: string) => r !== role);
      }
      
      const updatedData = {
        ...userData,
        roles: currentRoles,
        updatedAt: FieldValue.serverTimestamp()
      };
      
      await userRef.update(updatedData);
      
      return { 
        success: true, 
        user: { 
          ...updatedData, 
          id: email,
          updatedAt: new Date()
        } 
      };
    } catch (error) {
      console.error('Error updating user role:', error);
      return { success: false, error: 'Failed to update user role' };
    }
  }

  async getUserRoles(email: string): Promise<string[]> {
    const emailLower = email.toLowerCase();

    try {
      console.log(`🔍 [getUserRoles] Fetching roles for email: ${emailLower}`);
      const userDoc = await adminDb.collection('users').doc(emailLower).get();

      if (userDoc.exists) {
        const userData = userDoc.data();
        const roles = userData?.roles || ['user'];
        console.log(`✅ [getUserRoles] Found user ${emailLower} with roles:`, roles);
        return roles;
      } else {
        console.log(`⚠️ [getUserRoles] User ${emailLower} not found in database, trying environment fallback`);
        // Try environment fallback
        return this.getUserRolesWithFallback(emailLower);
      }
    } catch (error) {
      console.error(`❌ [getUserRoles] Error fetching user roles for ${emailLower}:`, error);
      console.log(`🔄 [getUserRoles] Falling back to environment variables due to database error`);
      // Try environment fallback on error
      return this.getUserRolesWithFallback(emailLower);
    }
  }

  async getUserRolesWithFallback(email: string): Promise<string[]> {
    const emailLower = email.toLowerCase();

    try {
      console.log(`🔍 [getUserRolesWithFallback] Attempting database lookup for: ${emailLower}`);

      // Try database first
      const dbRoles = await this.getUserRolesFromDatabase(emailLower);
      if (dbRoles && dbRoles.length > 0) {
        console.log(`✅ [getUserRolesWithFallback] Database roles found for ${emailLower}:`, dbRoles);
        return dbRoles;
      }

      console.log(`⚠️ [getUserRolesWithFallback] Database lookup failed or returned empty, trying environment fallback`);

    } catch (error) {
      console.error(`❌ [getUserRolesWithFallback] Database lookup failed for ${emailLower}:`, error);
      console.log(`🔄 [getUserRolesWithFallback] Falling back to environment variables`);
    }

    // Fallback to environment variables
    const envRoleMap = this.parseEnvRoles();
    const envRoles = envRoleMap.get(emailLower);

    if (envRoles) {
      console.log(`✅ [getUserRolesWithFallback] Environment fallback roles found for ${emailLower}:`, envRoles);
      return envRoles;
    }

    console.log(`⚠️ [getUserRolesWithFallback] No roles found for ${emailLower}, returning default`);
    return ['user']; // Default role
  }

  private async getUserRolesFromDatabase(email: string): Promise<string[]> {
    const userDoc = await adminDb.collection('users').doc(email).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      return userData?.roles || ['user'];
    }
    return [];
  }

  private parseEnvRoles(): Map<string, string[]> {
    const roleMap = new Map<string, string[]>();

    // Parse ADMIN_EMAILS
    const adminEmails = process.env.ADMIN_EMAILS;
    if (adminEmails) {
      const emails = adminEmails.split(',').map(email => email.trim().toLowerCase());
      emails.forEach(email => {
        const currentRoles = roleMap.get(email) || ['user'];
        if (!currentRoles.includes('admin')) {
          currentRoles.push('admin');
        }
        roleMap.set(email, currentRoles);
      });
    }

    // Parse MODERATOR_EMAILS
    const moderatorEmails = process.env.MODERATOR_EMAILS;
    if (moderatorEmails) {
      const emails = moderatorEmails.split(',').map(email => email.trim().toLowerCase());
      emails.forEach(email => {
        const currentRoles = roleMap.get(email) || ['user'];
        if (!currentRoles.includes('mod')) {
          currentRoles.push('mod');
        }
        roleMap.set(email, currentRoles);
      });
    }

    // Parse SCOUT_EMAILS
    const scoutEmails = process.env.SCOUT_EMAILS;
    if (scoutEmails) {
      const emails = scoutEmails.split(',').map(email => email.trim().toLowerCase());
      emails.forEach(email => {
        const currentRoles = roleMap.get(email) || ['user'];
        if (!currentRoles.includes('scout')) {
          currentRoles.push('scout');
        }
        roleMap.set(email, currentRoles);
      });
    }

    console.log('🔧 [parseEnvRoles] Environment role mapping loaded:', {
      adminCount: adminEmails ? adminEmails.split(',').length : 0,
      modCount: moderatorEmails ? moderatorEmails.split(',').length : 0,
      scoutCount: scoutEmails ? scoutEmails.split(',').length : 0,
      totalUniqueUsers: roleMap.size
    });

    return roleMap;
  }
}

// Export a singleton instance
export const adminFirebaseOperations = new AdminDatabase();
