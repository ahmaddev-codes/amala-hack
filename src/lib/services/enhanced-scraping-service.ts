import { AmalaLocation } from "@/types/location";
import puppeteer, { Browser, Page } from "puppeteer";
import axios from "axios";
import { randomUUID } from "node:crypto";

export interface ScrapingTarget {
  url: string;
  type: "blog" | "directory" | "social" | "review-site" | "maps" | "business-directory";
  selectors: {
    name?: string;
    address?: string;
    phone?: string;
    website?: string;
    rating?: string;
    reviews?: string;
    price?: string;
  };
  searchQueries?: string[];
  fallbackStrategy?: 'api' | 'alternative-scraper' | 'skip';
}

export interface ScrapingResult {
  success: boolean;
  locations: Partial<AmalaLocation>[];
  source: string;
  error?: string;
  strategy?: string;
}

export class EnhancedScrapingService {
  private static browser: Browser | null = null;
  private static readonly MAX_RETRIES = 3;
  private static readonly TIMEOUT = 30000;
  private static readonly DELAY_BETWEEN_REQUESTS = 2000;

  // Enhanced anti-detection user agents
  private static readonly USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
  ];

  private static async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-images', // Speed up loading
          '--disable-javascript', // For some sites, disable JS to avoid detection
        ],
      });
    }
    return this.browser;
  }

  static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private static getRandomUserAgent(): string {
    return this.USER_AGENTS[Math.floor(Math.random() * this.USER_AGENTS.length)];
  }

  /**
   * Main scraping method with multiple fallback strategies
   */
  static async scrapeWithFallbacks(target: ScrapingTarget): Promise<ScrapingResult> {
    console.log(`🎯 Starting enhanced scraping for: ${target.url}`);

    // Strategy 1: Standard Puppeteer scraping
    try {
      const result = await this.puppeteerScrape(target);
      if (result.success && result.locations.length > 0) {
        return { ...result, strategy: 'puppeteer' };
      }
    } catch (error) {
      console.log(`❌ Puppeteer strategy failed: ${error}`);
    }

    // Strategy 2: Axios-based scraping (for simple HTML)
    try {
      const result = await this.axiosScrape(target);
      if (result.success && result.locations.length > 0) {
        return { ...result, strategy: 'axios' };
      }
    } catch (error) {
      console.log(`❌ Axios strategy failed: ${error}`);
    }

    // Strategy 3: Alternative endpoints
    try {
      const result = await this.tryAlternativeEndpoints(target);
      if (result.success && result.locations.length > 0) {
        return { ...result, strategy: 'alternative' };
      }
    } catch (error) {
      console.log(`❌ Alternative endpoints failed: ${error}`);
    }

    return {
      success: false,
      locations: [],
      source: target.url,
      error: 'All scraping strategies failed',
      strategy: 'none'
    };
  }

  /**
   * Enhanced Puppeteer scraping with anti-detection
   */
  private static async puppeteerScrape(target: ScrapingTarget): Promise<ScrapingResult> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      // Enhanced anti-detection setup
      await this.setupAntiDetection(page);

      const searchUrl = this.buildSearchUrl(target);
      console.log(`🔍 Puppeteer scraping: ${searchUrl}`);

      // Load page with retry logic
      const loadResult = await this.loadPageWithRetry(page, searchUrl);
      if (!loadResult.success) {
        throw new Error(loadResult.error);
      }

      // Extract data
      const locations = await this.extractLocations(page, target.selectors);
      
      return {
        success: true,
        locations,
        source: target.url
      };

    } catch (error) {
      return {
        success: false,
        locations: [],
        source: target.url,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      await page.close();
    }
  }

  /**
   * Axios-based scraping for simple HTML sites
   */
  private static async axiosScrape(target: ScrapingTarget): Promise<ScrapingResult> {
    try {
      const searchUrl = this.buildSearchUrl(target);
      console.log(`📡 Axios scraping: ${searchUrl}`);

      const response = await axios.get(searchUrl, {
        timeout: this.TIMEOUT,
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
        }
      });

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Simple HTML parsing (you might want to use cheerio here)
      const locations = this.parseHTMLForLocations(response.data, target.selectors);

      return {
        success: true,
        locations,
        source: target.url
      };

    } catch (error) {
      return {
        success: false,
        locations: [],
        source: target.url,
        error: error instanceof Error ? error.message : 'Axios request failed'
      };
    }
  }

  /**
   * Try alternative endpoints or API approaches
   */
  private static async tryAlternativeEndpoints(target: ScrapingTarget): Promise<ScrapingResult> {
    const alternativeUrls = this.generateAlternativeUrls(target);
    
    for (const altUrl of alternativeUrls) {
      try {
        console.log(`🔄 Trying alternative: ${altUrl}`);
        
        const response = await axios.get(altUrl, {
          timeout: this.TIMEOUT / 2,
          headers: {
            'User-Agent': this.getRandomUserAgent(),
          }
        });

        if (response.status === 200) {
          const locations = this.parseHTMLForLocations(response.data, target.selectors);
          if (locations.length > 0) {
            return {
              success: true,
              locations,
              source: altUrl
            };
          }
        }
      } catch (error) {
        console.log(`❌ Alternative ${altUrl} failed: ${error}`);
        continue;
      }
    }

    throw new Error('No alternative endpoints worked');
  }

  /**
   * Enhanced anti-detection setup
   */
  private static async setupAntiDetection(page: Page): Promise<void> {
    // Set random user agent
    await page.setUserAgent(this.getRandomUserAgent());
    
    // Set realistic viewport
    const viewports = [
      { width: 1366, height: 768 },
      { width: 1920, height: 1080 },
      { width: 1440, height: 900 },
      { width: 1280, height: 720 }
    ];
    const viewport = viewports[Math.floor(Math.random() * viewports.length)];
    await page.setViewport(viewport);
    
    // Set comprehensive headers
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'max-age=0'
    });

    // Remove webdriver traces and add realistic browser properties
    await page.evaluateOnNewDocument(() => {
      // Remove webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
      
      // Mock plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          { name: 'Chrome PDF Plugin', length: 1 },
          { name: 'Chrome PDF Viewer', length: 1 },
          { name: 'Native Client', length: 1 }
        ],
      });
      
      // Mock languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });

      // Mock permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters: any) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ 
            state: (window as any).Notification?.permission || 'default',
            name: 'notifications',
            onchange: null,
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => true
          } as PermissionStatus) :
          originalQuery(parameters)
      );
    });
  }

  /**
   * Load page with retry logic and error detection
   */
  private static async loadPageWithRetry(
    page: Page, 
    url: string, 
    maxRetries: number = this.MAX_RETRIES
  ): Promise<{success: boolean, title?: string, error?: string}> {
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Loading attempt ${attempt}/${maxRetries}: ${url}`);
        
        // Different wait strategies for each attempt
        const waitUntil = attempt === 1 ? 'networkidle2' : 
                         attempt === 2 ? 'domcontentloaded' : 'load';
        
        await page.goto(url, { 
          waitUntil, 
          timeout: this.TIMEOUT 
        });

        // Wait for content to stabilize
        await this.delay(1000 + (attempt * 500));

        // Check if page loaded successfully
        const title = await page.title().catch(() => "Unknown");
        
        // Check for error indicators
        const pageInfo = await page.evaluate(() => {
          const text = document.body.textContent?.toLowerCase() || '';
          const title = document.title.toLowerCase();
          
          const errorIndicators = [
            '404', 'not found', 'page not found', 'error',
            'access denied', 'forbidden', 'blocked',
            'captcha', 'robot', 'bot detection'
          ];
          
          const hasError = errorIndicators.some(indicator => 
            text.includes(indicator) || title.includes(indicator)
          );
          
          return {
            hasError,
            bodyLength: document.body.textContent?.length || 0,
            title: document.title
          };
        });

        if (title && title !== "Unknown" && !pageInfo.hasError && pageInfo.bodyLength > 100) {
          console.log(`✅ Page loaded successfully: ${title}`);
          return { success: true, title };
        }
        
        if (attempt < maxRetries) {
          console.log(`⚠️ Page seems invalid (title: ${title}, hasError: ${pageInfo.hasError}, bodyLength: ${pageInfo.bodyLength}), retrying...`);
          await this.delay(2000 * attempt); // Exponential backoff
        }
        
      } catch (error) {
        console.log(`❌ Attempt ${attempt} failed:`, error);
        if (attempt < maxRetries) {
          await this.delay(3000 * attempt);
        }
      }
    }
    
    return { success: false, error: "Failed to load page after multiple attempts" };
  }

  /**
   * Extract locations from page
   */
  private static async extractLocations(page: Page, selectors: ScrapingTarget['selectors']): Promise<Partial<AmalaLocation>[]> {
    try {
      const locations = await page.evaluate((selectors) => {
        const results: any[] = [];
        
        // Try to find location containers
        const containers = document.querySelectorAll([
          '.restaurant', '.listing', '.place', '.business',
          '[data-testid*="restaurant"]', '[data-testid*="place"]',
          '.search-result', '.result-item'
        ].join(', '));

        containers.forEach((container, index) => {
          if (index >= 20) return; // Limit results
          
          const location: any = {
            id: `scraped-${Date.now()}-${index}`,
            submittedAt: new Date(),
            status: 'pending' as const
          };

          // Extract name
          const nameEl = container.querySelector(selectors.name || 'h1, h2, h3, .name, .title, [data-testid*="name"]');
          if (nameEl?.textContent) {
            location.name = nameEl.textContent.trim();
          }

          // Extract address
          const addressEl = container.querySelector(selectors.address || '.address, .location, [data-testid*="address"]');
          if (addressEl?.textContent) {
            location.address = addressEl.textContent.trim();
          }

          // Extract phone
          const phoneEl = container.querySelector(selectors.phone || '.phone, .tel, [href^="tel:"]');
          if (phoneEl?.textContent) {
            location.phone = phoneEl.textContent.trim();
          }

          // Extract website
          const websiteEl = container.querySelector(selectors.website || 'a[href^="http"], .website');
          if (websiteEl?.getAttribute('href')) {
            location.website = websiteEl.getAttribute('href')!;
          }

          // Only add if we have at least a name
          if (location.name && location.name.length > 2) {
            results.push(location);
          }
        });

        return results;
      }, selectors);

      return locations;
    } catch (error) {
      console.error('Error extracting locations:', error);
      return [];
    }
  }

  /**
   * Parse HTML for locations (for axios-based scraping)
   */
  private static parseHTMLForLocations(html: string, selectors: ScrapingTarget['selectors']): Partial<AmalaLocation>[] {
    // Simple regex-based parsing (you might want to use cheerio for better parsing)
    const locations: Partial<AmalaLocation>[] = [];
    
    // Look for common patterns in HTML
    const nameMatches = html.match(/<h[1-6][^>]*>([^<]*(?:amala|restaurant|food)[^<]*)<\/h[1-6]>/gi) || [];
    
    nameMatches.forEach((match, index) => {
      const name = match.replace(/<[^>]*>/g, '').trim();
      if (name.length > 2) {
        locations.push({
          id: `html-parsed-${Date.now()}-${index}`,
          name,
          submittedAt: new Date(),
          status: 'pending' as const
        });
      }
    });

    return locations.slice(0, 10); // Limit results
  }

  /**
   * Build search URL with query parameters
   */
  private static buildSearchUrl(target: ScrapingTarget): string {
    if (!target.searchQueries || target.searchQueries.length === 0) {
      return target.url;
    }

    const query = target.searchQueries[0];
    const separator = target.url.includes('?') ? '&' : '?';
    
    // Common query parameter names
    const queryParams = ['q', 'query', 'search', 'term', 'keyword'];
    const paramName = queryParams.find(param => target.url.includes(param)) || 'q';
    
    return `${target.url}${separator}${paramName}=${encodeURIComponent(query)}`;
  }

  /**
   * Generate alternative URLs to try
   */
  private static generateAlternativeUrls(target: ScrapingTarget): string[] {
    const alternatives: string[] = [];
    const baseUrl = new URL(target.url);
    
    // Try different paths
    alternatives.push(
      `${baseUrl.origin}/search`,
      `${baseUrl.origin}/restaurants`,
      `${baseUrl.origin}/places`,
      `${baseUrl.origin}/directory`,
      `${baseUrl.origin}/api/search`,
      `${baseUrl.origin}/api/places`
    );

    // Try with different query formats
    if (target.searchQueries && target.searchQueries.length > 0) {
      const query = target.searchQueries[0];
      alternatives.push(
        `${baseUrl.origin}/search?term=${encodeURIComponent(query)}`,
        `${baseUrl.origin}/search?keyword=${encodeURIComponent(query)}`,
        `${baseUrl.origin}/find?q=${encodeURIComponent(query)}`
      );
    }

    return alternatives;
  }

  /**
   * Batch scraping with concurrency control
   */
  static async scrapeMultipleTargets(
    targets: ScrapingTarget[], 
    maxConcurrent: number = 2
  ): Promise<ScrapingResult[]> {
    const results: ScrapingResult[] = [];
    
    console.log(`🚀 Starting batch scraping of ${targets.length} targets with max concurrency: ${maxConcurrent}`);
    
    for (let i = 0; i < targets.length; i += maxConcurrent) {
      const batch = targets.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(async (target) => {
        try {
          console.log(`🎯 Processing: ${target.url}`);
          const result = await this.scrapeWithFallbacks(target);
          await this.delay(this.DELAY_BETWEEN_REQUESTS); // Rate limiting
          return result;
        } catch (error) {
          console.error(`❌ Failed to process ${target.url}:`, error);
          return {
            success: false,
            locations: [],
            source: target.url,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`❌ Batch processing failed:`, result.reason);
        }
      });
      
      // Delay between batches
      if (i + maxConcurrent < targets.length) {
        console.log(`⏳ Waiting before next batch...`);
        await this.delay(5000);
      }
    }
    
    return results;
  }

  /**
   * Cleanup resources
   */
  static async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
