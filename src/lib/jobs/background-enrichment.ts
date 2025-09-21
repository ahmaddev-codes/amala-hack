/**
 * Background job system for location enrichment
 * Moves expensive Google Places API calls off the main request path
 */

import { adminFirebaseOperations } from '@/lib/firebase/admin-database';
import { BatchedPlacesApiService } from '@/lib/services/places-api-batch';
import { AmalaLocation } from '@/types/location';

interface EnrichmentJob {
  locationId: string;
  address: string;
  priority: 'high' | 'medium' | 'low';
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  scheduledFor: Date;
}

export class BackgroundEnrichmentService {
  private static jobQueue: EnrichmentJob[] = [];
  private static isProcessing = false;
  private static readonly MAX_CONCURRENT_JOBS = 3;
  private static readonly JOB_RETRY_DELAY = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_ATTEMPTS = 3;

  // Job completion tracking
  private static completedJobsToday: number = 0;
  private static lastResetDate: string = new Date().toISOString().slice(0, 10);

  /**
   * Reset daily completion counter if needed
   */
  private static resetDailyCounterIfNeeded(): void {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== this.lastResetDate) {
      this.completedJobsToday = 0;
      this.lastResetDate = today;
      console.log(`📅 Reset daily job completion counter for ${today}`);
    }
  }

  /**
   * Record a completed job
   */
  private static recordJobCompletion(): void {
    this.resetDailyCounterIfNeeded();
    this.completedJobsToday++;
    console.log(`✅ Job completed. Today's total: ${this.completedJobsToday}`);
  }

  /**
   * Add location to enrichment queue
   */
  static async queueLocationForEnrichment(
    locationId: string,
    address: string,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<void> {
    const job: EnrichmentJob = {
      locationId,
      address,
      priority,
      attempts: 0,
      maxAttempts: this.MAX_ATTEMPTS,
      createdAt: new Date(),
      scheduledFor: new Date()
    };

    // Insert job based on priority
    if (priority === 'high') {
      this.jobQueue.unshift(job);
    } else {
      this.jobQueue.push(job);
    }

    console.log(`📋 Queued location ${locationId} for enrichment (priority: ${priority})`);
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.startProcessing();
    }
  }

  /**
   * Start background processing
   */
  private static async startProcessing(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    console.log('🚀 Starting background enrichment processing...');

    while (this.jobQueue.length > 0) {
      const currentJobs = this.jobQueue.splice(0, this.MAX_CONCURRENT_JOBS);
      
      // Process jobs in parallel
      await Promise.allSettled(
        currentJobs.map(job => this.processJob(job))
      );

      // Small delay between batches to prevent overwhelming the API
      if (this.jobQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    this.isProcessing = false;
    console.log('✅ Background enrichment processing completed');
  }

  /**
   * Process individual enrichment job
   */
  private static async processJob(job: EnrichmentJob): Promise<void> {
    try {
      console.log(`🔄 Processing enrichment job for location ${job.locationId}`);
      
      // Check if job should be processed now
      if (new Date() < job.scheduledFor) {
        // Re-queue for later
        this.jobQueue.push(job);
        return;
      }

      const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!googleApiKey) {
        console.warn('⚠️ Google API key not available for background enrichment');
        return;
      }

      // Get current location data
      const location = await adminFirebaseOperations.getLocationById(job.locationId);
      if (!location) {
        console.warn(`⚠️ Location ${job.locationId} not found, skipping enrichment`);
        return;
      }

      // Check if already enriched recently
      const ENRICHMENT_CACHE_DAYS = 7;
      const enrichmentCacheMs = ENRICHMENT_CACHE_DAYS * 24 * 60 * 60 * 1000;
      
      if (
        location.lastEnriched && 
        (Date.now() - new Date(location.lastEnriched).getTime()) < enrichmentCacheMs
      ) {
        console.log(`⚡ Location ${job.locationId} recently enriched, skipping`);
        return;
      }

      // Perform enrichment
      const placeId = await BatchedPlacesApiService.findPlaceId(job.address, googleApiKey);
      if (!placeId) {
        console.log(`❌ No place ID found for location ${job.locationId}`);
        return;
      }

      const details = await BatchedPlacesApiService.getPlaceDetails(placeId, googleApiKey);
      if (!details) {
        console.log(`❌ No place details found for location ${job.locationId}`);
        return;
      }

      // Update location with enriched data
      const enrichedData = {
        rating: details.rating || location.rating,
        reviewCount: details.userRatingCount || location.reviewCount,
        phone: details.nationalPhoneNumber || location.phone,
        website: details.websiteUri || location.website,
        images: details.photos ? details.photos.map((photo: any) =>
          `/api/proxy/google-photo?photoreference=${photo.name}&maxwidth=400`
        ) : location.images,
        lastEnriched: new Date(),
        enrichmentSource: 'background-job'
      };

      await adminFirebaseOperations.updateLocation(job.locationId, enrichedData);
      console.log(`✅ Successfully enriched location ${job.locationId}`);

      // Record job completion
      this.recordJobCompletion();

    } catch (error) {
      console.error(`❌ Error processing enrichment job for ${job.locationId}:`, error);
      
      // Retry logic
      job.attempts++;
      if (job.attempts < job.maxAttempts) {
        job.scheduledFor = new Date(Date.now() + this.JOB_RETRY_DELAY);
        this.jobQueue.push(job);
        console.log(`🔄 Retrying job for location ${job.locationId} (attempt ${job.attempts}/${job.maxAttempts})`);
      } else {
        console.error(`❌ Max attempts reached for location ${job.locationId}, giving up`);
      }
    }
  }

  /**
   * Queue multiple locations for enrichment
   */
  static async queueMultipleLocations(locations: AmalaLocation[]): Promise<void> {
    const unenrichedLocations = locations.filter(location => {
      const ENRICHMENT_CACHE_DAYS = 7;
      const enrichmentCacheMs = ENRICHMENT_CACHE_DAYS * 24 * 60 * 60 * 1000;
      
      return !location.lastEnriched || 
        (Date.now() - new Date(location.lastEnriched).getTime()) > enrichmentCacheMs;
    });

    console.log(`📋 Queueing ${unenrichedLocations.length} locations for background enrichment`);

    for (const location of unenrichedLocations) {
      await this.queueLocationForEnrichment(
        location.id,
        location.address,
        location.status === 'approved' ? 'high' : 'medium'
      );
    }
  }

  /**
   * Get queue statistics
   */
  static getQueueStats() {
    this.resetDailyCounterIfNeeded();

    return {
      queueLength: this.jobQueue.length,
      isProcessing: this.isProcessing,
      completedToday: this.completedJobsToday,
      priorityBreakdown: {
        high: this.jobQueue.filter(job => job.priority === 'high').length,
        medium: this.jobQueue.filter(job => job.priority === 'medium').length,
        low: this.jobQueue.filter(job => job.priority === 'low').length
      }
    };
  }

  /**
   * Clear the job queue (for testing)
   */
  static clearQueue(): void {
    this.jobQueue = [];
    console.log('🧹 Background enrichment queue cleared');
  }
}
