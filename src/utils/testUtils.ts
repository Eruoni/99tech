import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Browser, BrowserContext, Page } from '@playwright/test';
import logger from '../config/logger.js';
import type { Cookie, TestData, UserCredentials } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Utility class for common test operations
 */
export class TestUtils {
  /**
   * Load authentication state from file
   * @param authFile - Path to authentication state file
   * @returns Authentication state object
   */
  static async loadAuthState(authFile: string = 'auth/state.json'): Promise<any> {
    try {
      const authData = await fs.readFile(authFile, 'utf-8');
      return JSON.parse(authData);
    } catch (error) {
      logger.warn('Failed to load authentication state', {
        authFile,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Load cookies from file
   * @param cookiesFile - Path to cookies file
   * @returns Array of cookies
   */
  static async loadCookies(cookiesFile: string = 'auth/cookies.json'): Promise<Cookie[]> {
    try {
      const cookiesData = await fs.readFile(cookiesFile, 'utf-8');
      return JSON.parse(cookiesData);
    } catch (error) {
      logger.warn('Failed to load cookies', {
        cookiesFile,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Load test data from file
   * @param testDataFile - Path to test data file
   * @returns Test data object
   */
  static async loadTestData(testDataFile: string = 'test-data/testData.json'): Promise<TestData> {
    try {
      const testDataContent = await fs.readFile(testDataFile, 'utf-8');
      return JSON.parse(testDataContent);
    } catch (error) {
      logger.warn('Failed to load test data', {
        testDataFile,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Return default test data
      return {
        users: [{
          username: process.env.USERNAME || 'Admin',
          password: process.env.PASSWORD || 'admin123',
          role: 'Admin'
        }],
        employees: [],
        testUrls: {
          login: '/web/index.php/auth/login',
          dashboard: '/web/index.php/dashboard/index'
        },
        apiEndpoints: {
          employees: '/pim/employees',
          users: '/admin/users'
        }
      };
    }
  }

  /**
   * Save authentication state to file
   * @param context - Browser context
   * @param authFile - Path to save authentication state
   */
  static async saveAuthState(context: BrowserContext, authFile: string = 'auth/state.json'): Promise<void> {
    try {
      await fs.mkdir(path.dirname(authFile), { recursive: true });
      await context.storageState({ path: authFile });
      
      logger.info('Authentication state saved', { authFile });
    } catch (error) {
      logger.error('Failed to save authentication state', {
        authFile,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Save cookies to file
   * @param context - Browser context
   * @param cookiesFile - Path to save cookies
   */
  static async saveCookies(context: BrowserContext, cookiesFile: string = 'auth/cookies.json'): Promise<void> {
    try {
      await fs.mkdir(path.dirname(cookiesFile), { recursive: true });
      const cookies = await context.cookies();
      await fs.writeFile(cookiesFile, JSON.stringify(cookies, null, 2));
      
      logger.info('Cookies saved', { cookiesFile, cookieCount: cookies.length });
    } catch (error) {
      logger.error('Failed to save cookies', {
        cookiesFile,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Create browser context with authentication
   * @param browser - Browser instance
   * @param authFile - Path to authentication state file
   * @returns Authenticated browser context
   */
  static async createAuthenticatedContext(
    browser: Browser, 
    authFile: string = 'auth/state.json'
  ): Promise<BrowserContext> {
    try {
      const authState = await this.loadAuthState(authFile);
      
      const context = await browser.newContext({
        storageState: authState,
        viewport: {
          width: parseInt(process.env.VIEWPORT_WIDTH || '1280'),
          height: parseInt(process.env.VIEWPORT_HEIGHT || '720')
        },
        recordVideo: {
          dir: 'test-results/videos',
          size: { width: 1280, height: 720 }
        },
        recordHar: {
          path: 'test-results/network.har'
        }
      });

      logger.debug('Authenticated context created');
      return context;
    } catch (error) {
      logger.error('Failed to create authenticated context', {
        authFile,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Generate unique test identifier
   * @param testName - Base test name
   * @returns Unique test identifier
   */
  static generateTestId(testName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${testName.replace(/\s+/g, '_').toLowerCase()}_${timestamp}_${random}`;
  }

  /**
   * Generate random string
   * @param length - Length of random string
   * @returns Random string
   */
  static generateRandomString(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate test employee data
   * @param overrides - Optional data overrides
   * @returns Employee test data
   */
  static generateEmployeeData(overrides: any = {}): any {
    const randomId = this.generateRandomString(6);
    return {
      firstName: `Test${randomId}`,
      lastName: 'Employee',
      employeeId: `EMP${randomId}`,
      email: `test.${randomId}@orangehrm.com`,
      phone: `555-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      ...overrides
    };
  }

  /**
   * Wait for element with retry logic
   * @param page - Page instance
   * @param selector - Element selector
   * @param options - Wait options
   */
  static async waitForElementWithRetry(
    page: Page, 
    selector: string, 
    options: { timeout?: number; retries?: number } = {}
  ): Promise<void> {
    const { timeout = 30000, retries = 3 } = options;
    let lastError: Error | null = null;

    for (let i = 0; i < retries; i++) {
      try {
        await page.waitForSelector(selector, { timeout: timeout / retries });
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.debug(`Retry ${i + 1}/${retries} for selector: ${selector}`, {
          error: lastError.message
        });
        
        if (i < retries - 1) {
          await page.waitForTimeout(1000); // Wait 1 second between retries
        }
      }
    }

    throw lastError || new Error(`Element not found after ${retries} retries: ${selector}`);
  }

  /**
   * Take screenshot with automatic naming
   * @param page - Page instance
   * @param testName - Test name for screenshot naming
   * @param step - Optional step name
   * @returns Screenshot path
   */
  static async takeScreenshot(page: Page, testName: string, step?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const stepSuffix = step ? `_${step.replace(/\s+/g, '_')}` : '';
    const fileName = `${testName}${stepSuffix}_${timestamp}.png`;
    const screenshotPath = path.join('screenshots', fileName);

    await fs.mkdir('screenshots', { recursive: true });
    await page.screenshot({ 
      path: screenshotPath, 
      fullPage: true,
      type: 'png'
    });

    logger.debug('Screenshot captured', {
      testName,
      step,
      screenshotPath
    });

    return screenshotPath;
  }

  /**
   * Get page performance metrics
   * @param page - Page instance
   * @returns Performance metrics
   */
  static async getPerformanceMetrics(page: Page): Promise<any> {
    try {
      const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
          firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
          totalLoadTime: navigation.loadEventEnd - navigation.fetchStart
        };
      });

      logger.debug('Performance metrics collected', metrics);
      return metrics;
    } catch (error) {
      logger.warn('Failed to collect performance metrics', {
        error: error instanceof Error ? error.message : String(error)
      });
      return {};
    }
  }

  /**
   * Check if element exists without waiting
   * @param page - Page instance
   * @param selector - Element selector
   * @returns True if element exists
   */
  static async elementExists(page: Page, selector: string): Promise<boolean> {
    try {
      const element = await page.$(selector);
      return element !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get element count
   * @param page - Page instance
   * @param selector - Element selector
   * @returns Number of matching elements
   */
  static async getElementCount(page: Page, selector: string): Promise<number> {
    try {
      return await page.locator(selector).count();
    } catch {
      return 0;
    }
  }

  /**
   * Wait for page to be idle (no network activity)
   * @param page - Page instance
   * @param timeout - Timeout in milliseconds
   */
  static async waitForPageIdle(page: Page, timeout: number = 30000): Promise<void> {
    try {
      await page.waitForLoadState('networkidle', { timeout });
    } catch (error) {
      logger.warn('Page idle wait timed out', {
        timeout,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Scroll element into view
   * @param page - Page instance
   * @param selector - Element selector
   */
  static async scrollIntoView(page: Page, selector: string): Promise<void> {
    try {
      await page.locator(selector).scrollIntoViewIfNeeded();
    } catch (error) {
      logger.warn('Failed to scroll element into view', {
        selector,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Handle file download
   * @param page - Page instance
   * @param triggerAction - Function that triggers the download
   * @param expectedFileName - Expected file name (optional)
   * @returns Download path
   */
  static async handleDownload(
    page: Page, 
    triggerAction: () => Promise<void>,
    expectedFileName?: string
  ): Promise<string> {
    const downloadPromise = page.waitForEvent('download');
    
    await triggerAction();
    
    const download = await downloadPromise;
    const fileName = expectedFileName || download.suggestedFilename();
    const downloadPath = path.join('downloads', fileName);
    
    await fs.mkdir('downloads', { recursive: true });
    await download.saveAs(downloadPath);
    
    logger.info('File downloaded', {
      fileName,
      downloadPath,
      size: await fs.stat(downloadPath).then(stats => stats.size).catch(() => 0)
    });

    return downloadPath;
  }

  /**
   * Clear browser data
   * @param context - Browser context
   */
  static async clearBrowserData(context: BrowserContext): Promise<void> {
    try {
      await context.clearCookies();
      await context.clearPermissions();
      
      // Clear localStorage and sessionStorage
      const pages = context.pages();
      for (const page of pages) {
        await page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
        });
      }

      logger.debug('Browser data cleared');
    } catch (error) {
      logger.warn('Failed to clear browser data', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Get console messages from page
   * @param page - Page instance
   * @returns Array of console messages
   */
  static getConsoleMessages(page: Page): string[] {
    const messages: string[] = [];
    
    page.on('console', msg => {
      messages.push(`[${msg.type()}] ${msg.text()}`);
    });

    page.on('pageerror', error => {
      messages.push(`[error] ${error.message}`);
    });

    return messages;
  }

  /**
   * Validate URL format
   * @param url - URL to validate
   * @returns True if URL is valid
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Format duration in human-readable format
   * @param milliseconds - Duration in milliseconds
   * @returns Formatted duration string
   */
  static formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Create directory if it doesn't exist
   * @param dirPath - Directory path
   */
  static async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      logger.warn('Failed to create directory', {
        dirPath,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Cleanup old files in directory
   * @param dirPath - Directory path
   * @param maxAge - Maximum age in milliseconds
   * @param filePattern - File pattern to match (optional)
   */
  static async cleanupOldFiles(
    dirPath: string, 
    maxAge: number = 7 * 24 * 60 * 60 * 1000, // 7 days
    filePattern?: RegExp
  ): Promise<void> {
    try {
      const files = await fs.readdir(dirPath);
      const cutoffTime = Date.now() - maxAge;

      for (const file of files) {
        if (filePattern && !filePattern.test(file)) {
          continue;
        }

        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filePath);
          logger.debug('Cleaned up old file', {
            file,
            age: Date.now() - stats.mtime.getTime()
          });
        }
      }
    } catch (error) {
      logger.warn('Failed to cleanup old files', {
        dirPath,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Retry function with exponential backoff
   * @param fn - Function to retry
   * @param maxRetries - Maximum number of retries
   * @param baseDelay - Base delay in milliseconds
   * @returns Result of the function
   */
  static async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === maxRetries) {
          break;
        }

        const delay = baseDelay * Math.pow(2, attempt - 1);
        logger.debug(`Retry attempt ${attempt}/${maxRetries} failed, waiting ${delay}ms`, {
          error: lastError.message
        });

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Extract error details from various error types
   * @param error - Error object
   * @returns Formatted error details
   */
  static extractErrorDetails(error: any): {
    message: string;
    stack?: string;
    type: string;
    timestamp: string;
  } {
    return {
      message: error?.message || String(error),
      stack: error?.stack,
      type: error?.constructor?.name || 'Unknown',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Compare two objects for equality (deep comparison)
   * @param obj1 - First object
   * @param obj2 - Second object
   * @returns True if objects are equal
   */
  static deepEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) {
      return true;
    }

    if (obj1 == null || obj2 == null) {
      return false;
    }

    if (typeof obj1 !== typeof obj2) {
      return false;
    }

    if (typeof obj1 !== 'object') {
      return obj1 === obj2;
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) {
      return false;
    }

    for (const key of keys1) {
      if (!keys2.includes(key)) {
        return false;
      }

      if (!this.deepEqual(obj1[key], obj2[key])) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get environment-specific configuration
   * @returns Environment configuration object
   */
  static getEnvironmentConfig(): {
    baseUrl: string;
    apiBaseUrl: string;
    browser: string;
    headless: boolean;
    timeout: number;
    workers: number;
  } {
    return {
      baseUrl: process.env.BASE_URL || 'https://opensource-demo.orangehrmlive.com',
      apiBaseUrl: process.env.API_BASE_URL || 'https://opensource-demo.orangehrmlive.com/web/api/v1',
      browser: process.env.BROWSER || 'chromium',
      headless: process.env.HEADLESS === 'true',
      timeout: parseInt(process.env.TIMEOUT || '30000'),
      workers: parseInt(process.env.WORKERS || '4')
    };
  }

  /**
   * Validate test data structure
   * @param testData - Test data to validate
   * @returns Validation result
   */
  static validateTestData(testData: any): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!testData) {
      errors.push('Test data is null or undefined');
      return { isValid: false, errors };
    }

    // Check required properties
    const requiredProperties = ['users', 'testUrls', 'apiEndpoints'];
    for (const prop of requiredProperties) {
      if (!testData[prop]) {
        errors.push(`Missing required property: ${prop}`);
      }
    }

    // Validate users array
    if (testData.users && Array.isArray(testData.users)) {
      for (let i = 0; i < testData.users.length; i++) {
        const user = testData.users[i];
        if (!user.username || !user.password) {
          errors.push(`User at index ${i} missing username or password`);
        }
      }
    }

    // Validate URLs
    if (testData.testUrls) {
      for (const [key, url] of Object.entries(testData.testUrls)) {
        if (typeof url === 'string' && url.startsWith('http') && !this.isValidUrl(url)) {
          errors.push(`Invalid URL for ${key}: ${url}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate test report metadata
   * @param testName - Test name
   * @param startTime - Test start time
   * @param endTime - Test end time
   * @param status - Test status
   * @returns Test metadata object
   */
  static generateTestMetadata(
    testName: string,
    startTime: number,
    endTime: number,
    status: 'passed' | 'failed' | 'skipped'
  ): {
    testName: string;
    duration: number;
    status: string;
    timestamp: string;
    environment: any;
  } {
    return {
      testName,
      duration: endTime - startTime,
      status,
      timestamp: new Date(startTime).toISOString(),
      environment: this.getEnvironmentConfig()
    };
  }

  /**
   * Sanitize filename for safe file operations
   * @param filename - Original filename
   * @returns Sanitized filename
   */
  static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .toLowerCase();
  }

  /**
   * Calculate file hash for integrity checking
   * @param filePath - Path to file
   * @returns File hash (MD5)
   */
  static async calculateFileHash(filePath: string): Promise<string> {
    try {
      const crypto = await import('crypto');
      const data = await fs.readFile(filePath);
      return crypto.createHash('md5').update(data).digest('hex');
    } catch (error) {
      logger.warn('Failed to calculate file hash', {
        filePath,
        error: error instanceof Error ? error.message : String(error)
      });
      return '';
    }
  }
}