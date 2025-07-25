import { chromium, firefox, webkit, FullConfig } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import logger from '../config/logger.js';
import { ApiHelper } from '../helpers/ApiHelper.js';
import type { Environment, Cookie } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

/**
 * Global setup function that runs before all tests
 * @param config - Playwright full configuration
 */
async function globalSetup(config: FullConfig): Promise<void> {
  const setupStartTime = Date.now();
  
  logger.info('🚀 Starting Global Setup', {
    timestamp: new Date().toISOString(),
    workers: config.workers,
    projects: config.projects.map(p => p.name)
  });

  try {
    // 1. Create necessary directories
    await createDirectories();

    // 2. Validate environment variables
    await validateEnvironment();

    // 3. Setup browser instances and warm up
    await setupBrowsers();

    // 4. Verify test site availability
    await verifyTestSiteAvailability();

    // 5. Setup authentication and save state
    await setupAuthentication();

    // 6. Initialize test data
    await initializeTestData();

    // 7. Clean previous test artifacts
    await cleanPreviousArtifacts();

    // 8. Setup performance monitoring
    await setupPerformanceMonitoring();

    const setupEndTime = Date.now();
    const setupDuration = setupEndTime - setupStartTime;

    logger.info('✅ Global Setup Completed Successfully', {
      duration: `${setupDuration}ms`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const setupEndTime = Date.now();
    const setupDuration = setupEndTime - setupStartTime;
    
    logger.error('❌ Global Setup Failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${setupDuration}ms`,
      timestamp: new Date().toISOString()
    });
    
    // Perform cleanup on failure
    await emergencyCleanup();
    
    throw error;
  }
}

/**
 * Create necessary directories for the test framework
 */
async function createDirectories(): Promise<void> {
  const directories = [
    'logs',
    'test-results',
    'allure-results',
    'allure-report',
    'screenshots',
    'videos',
    'traces',
    'downloads',
    'auth'
  ];

  logger.info('📁 Creating necessary directories');

  for (const dir of directories) {
    try {
      await fs.mkdir(dir, { recursive: true });
      logger.debug(`Directory created: ${dir}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        logger.warn(`Failed to create directory ${dir}`, {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }
}

/**
 * Validate all required environment variables
 */
async function validateEnvironment(): Promise<void> {
  logger.info('🔍 Validating environment configuration');

  const requiredEnvVars: (keyof Environment)[] = [
    'BASE_URL',
    'API_BASE_URL',
    'USERNAME',
    'PASSWORD'
  ];

  const missingVars: string[] = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missingVars.push(envVar);
    }
  }

  if (missingVars.length > 0) {
    const errorMessage = `Missing required environment variables: ${missingVars.join(', ')}`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  // Validate URLs format
  const urls = [process.env.BASE_URL, process.env.API_BASE_URL];
  for (const url of urls) {
    if (url && !isValidUrl(url)) {
      const errorMessage = `Invalid URL format: ${url}`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  logger.info('✅ Environment validation passed', {
    baseUrl: process.env.BASE_URL,
    apiBaseUrl: process.env.API_BASE_URL,
    browser: process.env.BROWSER || 'chromium',
    headless: process.env.HEADLESS,
    testSuite: process.env.TEST_SUITE
  });
}

/**
 * Setup and warm up browser instances
 */
async function setupBrowsers(): Promise<void> {
  logger.info('🌐 Setting up browser instances');

  const browserType = process.env.BROWSER || 'chromium';
  const headless = process.env.HEADLESS === 'true';

  try {
    let browser;
    
    switch (browserType) {
      case 'firefox':
        browser = await firefox.launch({ headless });
        break;
      case 'webkit':
        browser = await webkit.launch({ headless });
        break;
      case 'chromium':
      default:
        browser = await chromium.launch({ 
          headless,
          args: ['--no-sandbox', '--disable-dev-shm-usage']
        });
        break;
    }

    // Warm up browser by creating a page and navigating to a simple page
    const context = await browser.newContext({
      viewport: {
        width: parseInt(process.env.VIEWPORT_WIDTH || '1280'),
        height: parseInt(process.env.VIEWPORT_HEIGHT || '720')
      }
    });

    const page = await context.newPage();
    await page.goto('about:blank');
    
    await page.close();
    await context.close();
    await browser.close();

    logger.info('✅ Browser setup completed', {
      browserType,
      headless
    });

  } catch (error) {
    logger.error('Failed to setup browser', {
      browserType,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Verify that the test site is available and responding
 */
async function verifyTestSiteAvailability(): Promise<void> {
  logger.info('🔗 Verifying test site availability');

  const apiHelper = new ApiHelper();
  await apiHelper.init();

  try {
    // Check main site
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const response = await page.goto(process.env.BASE_URL!, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    if (!response || !response.ok()) {
      throw new Error(`Test site not available. Status: ${response?.status()}`);
    }

    await page.close();
    await context.close();
    await browser.close();

    // Check API endpoints
    const healthCheckEndpoints = [
      '/web/index.php/auth/login',
      '/web/index.php/dashboard/index'
    ];

    for (const endpoint of healthCheckEndpoints) {
      try {
        const apiResponse = await apiHelper.get(endpoint);
        logger.debug('API endpoint check', {
          endpoint,
          status: apiResponse.status
        });
      } catch (error) {
        logger.warn('API endpoint not available', {
          endpoint,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    logger.info('✅ Test site verification completed');

  } catch (error) {
    logger.error('Test site verification failed', {
      baseUrl: process.env.BASE_URL,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  } finally {
    await apiHelper.dispose();
  }
}

/**
 * Setup authentication and save browser state
 */
async function setupAuthentication(): Promise<void> {
  logger.info('🔐 Setting up authentication');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: {
      width: parseInt(process.env.VIEWPORT_WIDTH || '1280'),
      height: parseInt(process.env.VIEWPORT_HEIGHT || '720')
    }
  });

  try {
    const page = await context.newPage();

    // Navigate to login page
    await page.goto(`${process.env.BASE_URL}/web/index.php/auth/login`);
    
    // Wait for login form
    await page.waitForSelector('[name="username"]', { timeout: 10000 });

    // Fill login credentials
    await page.fill('[name="username"]', process.env.USERNAME!);
    await page.fill('[name="password"]', process.env.PASSWORD!);

    // Submit login form
    await page.click('button[type="submit"]');

    // Wait for successful login (dashboard or any authenticated page)
    try {
      await page.waitForURL('**/dashboard/**', { timeout: 15000 });
    } catch {
      // Try alternative success indicators
      await page.waitForSelector('.oxd-topbar-header-breadcrumb', { timeout: 10000 });
    }

    // Save authentication state
    const authFile = path.join(__dirname, '../../auth/state.json');
    await context.storageState({ path: authFile });

    // Save cookies for API authentication
    const cookies = await context.cookies();
    const cookiesFile = path.join(__dirname, '../../auth/cookies.json');
    await fs.writeFile(cookiesFile, JSON.stringify(cookies, null, 2));

    logger.info('✅ Authentication setup completed', {
      authFile,
      cookiesFile,
      cookieCount: cookies.length
    });

  } catch (error) {
    logger.error('Authentication setup failed', {
      error: error instanceof Error ? error.message : String(error)
    });

    // Take screenshot for debugging
    try {
      const page = context.pages()[0];
      if (page) {
        await page.screenshot({ 
          path: 'test-results/auth-failure.png',
          fullPage: true 
        });
      }
    } catch (screenshotError) {
      logger.warn('Failed to take authentication failure screenshot');
    }

    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

/**
 * Initialize test data
 */
async function initializeTestData(): Promise<void> {
  logger.info('📊 Initializing test data');

  const testDataDir = path.join(__dirname, '../../test-data');
  await fs.mkdir(testDataDir, { recursive: true });

  // Create test data files
  const testData = {
    employees: [
      {
        firstName: 'Test',
        lastName: 'Employee',
        employeeId: 'EMP001',
        email: 'test.employee@orangehrm.com'
      },
      {
        firstName: 'Jane',
        lastName: 'Doe',
        employeeId: 'EMP002',
        email: 'jane.doe@orangehrm.com'
      }
    ],
    users: [
      {
        username: process.env.USERNAME!,
        password: process.env.PASSWORD!,
        role: 'Admin'
      }
    ],
    testUrls: {
      login: '/web/index.php/auth/login',
      dashboard: '/web/index.php/dashboard/index',
      pim: '/web/index.php/pim/viewEmployeeList',
      admin: '/web/index.php/admin/viewSystemUsers'
    },
    apiEndpoints: {
      employees: '/pim/employees',
      users: '/admin/users',
      auth: '/auth/login'
    }
  };

  const testDataFile = path.join(testDataDir, 'testData.json');
  await fs.writeFile(testDataFile, JSON.stringify(testData, null, 2));

  logger.info('✅ Test data initialized', {
    testDataFile,
    employeeCount: testData.employees.length,
    userCount: testData.users.length
  });
}

/**
 * Clean previous test artifacts
 */
async function cleanPreviousArtifacts(): Promise<void> {
  logger.info('🧹 Cleaning previous test artifacts');

  const artifactDirs = [
    'test-results',
    'allure-results',
    'screenshots',
    'videos',
    'traces'
  ];

  for (const dir of artifactDirs) {
    try {
      const files = await fs.readdir(dir).catch(() => []);
      
      for (const file of files) {
        if (file.endsWith('.png') || file.endsWith('.webm') || 
            file.endsWith('.zip') || file.endsWith('.json') ||
            file.endsWith('.xml') || file.endsWith('.html')) {
          await fs.unlink(path.join(dir, file));
        }
      }
      
      logger.debug(`Cleaned artifacts in: ${dir}`);
    } catch (error) {
      logger.warn(`Failed to clean artifacts in ${dir}`, {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

/**
 * Setup performance monitoring
 */
async function setupPerformanceMonitoring(): Promise<void> {
  logger.info('📈 Setting up performance monitoring');

  const performanceConfig = {
    pageLoadThreshold: parseInt(process.env.PAGE_LOAD_THRESHOLD || '5000'),
    apiResponseThreshold: parseInt(process.env.API_RESPONSE_THRESHOLD || '3000'),
    monitoringEnabled: true,
    metricsCollection: true
  };

  const configDir = path.join(__dirname, '../../config');
  await fs.mkdir(configDir, { recursive: true });
  
  const performanceConfigFile = path.join(configDir, 'performance.json');
  await fs.writeFile(performanceConfigFile, JSON.stringify(performanceConfig, null, 2));

  logger.info('✅ Performance monitoring configured', performanceConfig);
}

/**
 * Emergency cleanup on setup failure
 */
async function emergencyCleanup(): Promise<void> {
  logger.warn('⚠️ Performing emergency cleanup');

  try {
    // Remove partial auth files
    const authFiles = ['auth/state.json', 'auth/cookies.json'];
    for (const file of authFiles) {
      try {
        await fs.unlink(file);
      } catch {
        // Ignore if file doesn't exist
      }
    }

    // Clear any browser processes (this is platform specific)
    // For now, just log that we attempted cleanup
    logger.info('Emergency cleanup completed');
    
  } catch (error) {
    logger.error('Emergency cleanup failed', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Utility function to validate URL format
 * @param url - URL to validate
 * @returns True if URL is valid
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export default globalSetup;