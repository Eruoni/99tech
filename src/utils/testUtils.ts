import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Browser, BrowserContext, Page } from '@playwright/test';
import logger from '../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Utility class for common test operations
 */
export class TestUtils {
  /**
   * Load test data from file with generic type support
   * @param testDataFile - Path to test data file
   * @returns Test data object of specified type
   */
  static async loadTestData<T = any>(testDataFile: string = 'test-data/testData.json'): Promise<T> {
    try {
      const testDataContent = await fs.readFile(testDataFile, 'utf-8');
      const parsedData = JSON.parse(testDataContent);
      
      logger.info('Test data loaded successfully', {
        file: testDataFile,
        dataKeys: Object.keys(parsedData),
        fileSize: testDataContent.length
      });
      
      return parsedData as T;
    } catch (error) {
      logger.error('Failed to load test data', {
        testDataFile,
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw new Error(`Failed to load test data from ${testDataFile}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Load specific section from test data file
   * @param section - Section name to extract
   * @param testDataFile - Path to test data file
   * @returns Specific section data
   */
  static async loadTestDataSection<T = any>(section: string, testDataFile: string = 'test-data/testData.json'): Promise<T> {
    try {
      const fullData = await this.loadTestData(testDataFile);
      
      if (!fullData[section]) {
        throw new Error(`Section '${section}' not found in test data`);
      }
      
      logger.debug('Test data section loaded', {
        file: testDataFile,
        section,
        sectionType: typeof fullData[section]
      });
      
      return fullData[section] as T;
    } catch (error) {
      logger.error('Failed to load test data section', {
        testDataFile,
        section,
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw error;
    }
  }

  /**
   * Load environment-specific test data
   * @param environment - Environment name (e.g., 'dev', 'staging', 'prod')
   * @param fallbackFile - Fallback file if environment-specific file doesn't exist
   * @returns Environment-specific test data
   */
  static async loadEnvironmentTestData<T = any>(
    environment: string = 'default',
    fallbackFile: string = 'test-data/testData.json'
  ): Promise<T> {
    const envSpecificFile = `test-data/${environment}.json`;
    
    try {
      // Try to load environment-specific file first
      return await this.loadTestData<T>(envSpecificFile);
    } catch (error) {
      logger.warn('Environment-specific test data not found, using fallback', {
        environment,
        envSpecificFile,
        fallbackFile,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Fall back to default file
      return await this.loadTestData<T>(fallbackFile);
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
   * Clear browser data (for OAuth 2.0 apps)
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