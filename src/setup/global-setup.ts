import { chromium, firefox, webkit, FullConfig } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import logger from '../config/logger.js';
import type { Environment } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

/**
 * Global setup function that runs before all tests
 * Optimized for OAuth applications - no stored authentication
 * @param config - Playwright full configuration
 */
async function globalSetup(config: FullConfig): Promise<void> {
  const setupStartTime = Date.now();
  
  logger.info('🚀 Starting Global Setup', {
    timestamp: new Date().toISOString(),
    workers: config.workers,
    projects: config.projects.map(p => p.name),
    testSuite: process.env.TEST_SUITE || 'all'
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

    // 5. Verify basic application endpoints
    await verifyApplicationEndpoints();

    // 6. Clean previous test artifacts
    await cleanPreviousArtifacts();

    // 7. Setup performance monitoring
    await setupPerformanceMonitoring();

    // 8. Setup test environment info
    await setupTestEnvironmentInfo();

    const setupEndTime = Date.now();
    const setupDuration = setupEndTime - setupStartTime;

    logger.info('✅ Global Setup Completed Successfully', {
      duration: `${setupDuration}ms`,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'test'
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
    'test-results/reports',
    'allure-results',
    'allure-report', 
    'screenshots',
    'videos',
    'traces',
    'downloads',
    'test-data',
    'config'
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

  logger.info('✅ Directory structure created');
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

  const optionalEnvVars: (keyof Environment)[] = [
    'BROWSER',
    'HEADLESS',
    'VIEWPORT_WIDTH',
    'VIEWPORT_HEIGHT',
    'TIMEOUT',
    'API_TIMEOUT',
    'WORKERS'
  ];

  const missingVars: string[] = [];
  const configuredVars: Record<string, any> = {};

  // Check required variables
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missingVars.push(envVar);
    } else {
      configuredVars[envVar] = process.env[envVar];
    }
  }

  // Check optional variables
  for (const envVar of optionalEnvVars) {
    if (process.env[envVar]) {
      configuredVars[envVar] = process.env[envVar];
    }
  }

  if (missingVars.length > 0) {
    const errorMessage = `Missing required environment variables: ${missingVars.join(', ')}`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  // Validate URL formats
  const urls = [
    { name: 'BASE_URL', value: process.env.BASE_URL },
    { name: 'API_BASE_URL', value: process.env.API_BASE_URL }
  ];

  for (const url of urls) {
    if (url.value && !isValidUrl(url.value)) {
      const errorMessage = `Invalid URL format for ${url.name}: ${url.value}`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  // Validate numeric values
  const numericVars = [
    { name: 'TIMEOUT', value: process.env.TIMEOUT, min: 1000 },
    { name: 'API_TIMEOUT', value: process.env.API_TIMEOUT, min: 1000 },
    { name: 'WORKERS', value: process.env.WORKERS, min: 1 },
    { name: 'VIEWPORT_WIDTH', value: process.env.VIEWPORT_WIDTH, min: 320 },
    { name: 'VIEWPORT_HEIGHT', value: process.env.VIEWPORT_HEIGHT, min: 240 }
  ];

  for (const numVar of numericVars) {
    if (numVar.value) {
      const numValue = parseInt(numVar.value);
      if (isNaN(numValue) || numValue < numVar.min) {
        const errorMessage = `Invalid ${numVar.name} value: ${numVar.value} (minimum: ${numVar.min})`;
        logger.error(errorMessage);
        throw new Error(errorMessage);
      }
    }
  }

  logger.info('✅ Environment validation passed', {
    requiredVars: requiredEnvVars.length,
    configuredVars: Object.keys(configuredVars).length,
    config: {
      baseUrl: configuredVars.BASE_URL,
      browser: configuredVars.BROWSER || 'chromium',
      headless: configuredVars.HEADLESS || 'true',
      testSuite: process.env.TEST_SUITE || 'all'
    }
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
    const launchOptions = {
      headless,
      args: process.env.CI ? [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security'
      ] : []
    };
    
    switch (browserType) {
      case 'firefox':
        browser = await firefox.launch(launchOptions);
        break;
      case 'webkit':
        browser = await webkit.launch(launchOptions);
        break;
      case 'chromium':
      default:
        browser = await chromium.launch(launchOptions);
        break;
    }

    // Warm up browser by creating a context and page
    const context = await browser.newContext({
      viewport: {
        width: parseInt(process.env.VIEWPORT_WIDTH || '1280'),
        height: parseInt(process.env.VIEWPORT_HEIGHT || '720')
      },
      userAgent: 'OrangeHRM-TestFramework/1.0 (Playwright)'
    });

    const page = await context.newPage();
    
    // Test basic navigation
    await page.goto('about:blank');
    await page.evaluate(() => document.readyState);
    
    await page.close();
    await context.close();
    await browser.close();

    logger.info('✅ Browser setup completed', {
      browserType,
      headless,
      ciMode: !!process.env.CI
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

  try {
    // Check main site using browser
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const navigationStart = Date.now();
    const response = await page.goto(process.env.BASE_URL!, {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    const navigationTime = Date.now() - navigationStart;

    if (!response || !response.ok()) {
      throw new Error(`Test site not available. Status: ${response?.status()} ${response?.statusText()}`);
    }

    // Get page title for verification
    const pageTitle = await page.title();
    
    await page.close();
    await context.close();
    await browser.close();

    logger.info('✅ Test site verification completed', {
      url: process.env.BASE_URL,
      status: response.status(),
      navigationTime: `${navigationTime}ms`,
      title: pageTitle
    });

  } catch (error) {
    logger.error('Test site verification failed', {
      baseUrl: process.env.BASE_URL,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Verify basic application endpoints are accessible
 */
async function verifyApplicationEndpoints(): Promise<void> {
  logger.info('🔗 Verifying application endpoints');

  try {
    // Use browser to check endpoints since API might require authentication
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Basic endpoints to check (should be accessible without auth)
    const endpointsToCheck = [
      { path: '/web/index.php/auth/login', description: 'Login page', expectAuth: false },
    ];

    const endpointResults: Array<{ path: string; status: number; accessible: boolean; description: string }> = [];

    for (const endpoint of endpointsToCheck) {
      try {
        const fullUrl = `${process.env.BASE_URL}${endpoint.path}`;
        const response = await page.goto(fullUrl, { 
          waitUntil: 'networkidle',
          timeout: 10000 
        });
        
        const status = response?.status() || 0;
        // For auth-required endpoints, redirects to login (302/200) are acceptable
        const accessible = endpoint.expectAuth ? 
          (status === 200 || status === 302) : 
          status === 200;
        
        endpointResults.push({
          path: endpoint.path,
          status,
          accessible,
          description: endpoint.description
        });

        logger.debug(`${endpoint.description} check`, {
          path: endpoint.path,
          status,
          accessible,
          finalUrl: page.url()
        });

      } catch (error) {
        endpointResults.push({
          path: endpoint.path,
          status: 0,
          accessible: false,
          description: endpoint.description
        });

        logger.debug(`${endpoint.description} check failed`, {
          path: endpoint.path,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    await page.close();
    await context.close();
    await browser.close();

    const accessibleCount = endpointResults.filter(e => e.accessible).length;
    
    logger.info('✅ Application endpoints verification completed', {
      totalChecked: endpointsToCheck.length,
      accessible: accessibleCount,
      results: endpointResults
    });

    // Only fail if login page is not accessible
    const loginPageAccessible = endpointResults.find(e => e.path.includes('/auth/login'))?.accessible;
    if (!loginPageAccessible) {
      throw new Error('Login page is not accessible - application may be down');
    }

  } catch (error) {
    logger.error('Application endpoints verification failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}
/**
 * Clean previous test artifacts
 */
async function cleanPreviousArtifacts(): Promise<void> {
  logger.info('🧹 Cleaning previous test artifacts');

  const artifactDirs = [
    { dir: 'test-results', patterns: ['.json', '.xml', '.html'] },
    { dir: 'allure-results', patterns: ['.json', '.txt', '.properties'] },
    { dir: 'screenshots', patterns: ['.png', '.jpg'] },
    { dir: 'videos', patterns: ['.webm', '.mp4'] },
    { dir: 'traces', patterns: ['.zip'] },
    { dir: 'downloads', patterns: ['.*'] } // Clean all downloads
  ];

  let totalCleaned = 0;

  for (const { dir, patterns } of artifactDirs) {
    try {
      const files = await fs.readdir(dir).catch(() => []);
      let cleanedInDir = 0;
      
      for (const file of files) {
        const shouldClean = patterns.some(pattern => 
          pattern === '.*' || file.endsWith(pattern)
        );
        
        if (shouldClean) {
          await fs.unlink(path.join(dir, file));
          cleanedInDir++;
          totalCleaned++;
        }
      }
      
      if (cleanedInDir > 0) {
        logger.debug(`Cleaned ${cleanedInDir} files from: ${dir}`);
      }
    } catch (error) {
      logger.warn(`Failed to clean artifacts in ${dir}`, {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  logger.info('✅ Artifact cleanup completed', {
    totalFilesRemoved: totalCleaned,
    directoriesCleaned: artifactDirs.length
  });
}

/**
 * Setup performance monitoring configuration
 */
async function setupPerformanceMonitoring(): Promise<void> {
  logger.info('📈 Setting up performance monitoring');

  const performanceConfig = {
    enabled: true,
    thresholds: {
      pageLoadThreshold: parseInt(process.env.PAGE_LOAD_THRESHOLD || '5000'),
      apiResponseThreshold: parseInt(process.env.API_RESPONSE_THRESHOLD || '3000'),
      memoryUsageThreshold: 100 * 1024 * 1024, // 100MB
      networkIdleThreshold: 2000 // 2 seconds
    },
    monitoring: {
      collectNetworkMetrics: true,
      collectMemoryMetrics: true,
      collectTimingMetrics: true,
      collectConsoleErrors: true
    },
    reporting: {
      generatePerformanceReport: true,
      includeResourceTiming: true,
      includeUserTiming: true,
      trackLongTasks: true
    },
    timestamp: new Date().toISOString()
  };

  const configDir = path.join(__dirname, '../../config');
  await fs.mkdir(configDir, { recursive: true });
  
  const performanceConfigFile = path.join(configDir, 'performance.json');
  await fs.writeFile(performanceConfigFile, JSON.stringify(performanceConfig, null, 2));

  logger.info('✅ Performance monitoring configured', {
    configFile: performanceConfigFile,
    pageLoadThreshold: performanceConfig.thresholds.pageLoadThreshold,
    apiResponseThreshold: performanceConfig.thresholds.apiResponseThreshold,
    monitoringEnabled: performanceConfig.enabled
  });
}

/**
 * Setup test environment information
 */
async function setupTestEnvironmentInfo(): Promise<void> {
  logger.info('ℹ️ Setting up test environment information');

  const environmentInfo = {
    framework: {
      name: 'Playwright',
      version: '1.54.1',
      language: 'TypeScript',
      testRunner: 'Jasmine'
    },
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      ci: !!process.env.CI,
      ciProvider: getCIProvider()
    },
    configuration: {
      browser: process.env.BROWSER || 'chromium',
      headless: process.env.HEADLESS === 'true',
      workers: parseInt(process.env.WORKERS || '4'),
      timeout: parseInt(process.env.TIMEOUT || '30000'),
      testSuite: process.env.TEST_SUITE || 'all'
    },
    urls: {
      baseUrl: process.env.BASE_URL,
      apiBaseUrl: process.env.API_BASE_URL
    },
    timestamp: new Date().toISOString(),
    setupDuration: 0 // Will be updated later
  };

  const envInfoFile = path.join(__dirname, '../../test-results/environment-info.json');
  await fs.writeFile(envInfoFile, JSON.stringify(environmentInfo, null, 2));

  logger.info('✅ Test environment information saved', {
    envInfoFile,
    framework: environmentInfo.framework.name,
    platform: environmentInfo.environment.platform,
    ci: environmentInfo.environment.ci
  });
}

/**
 * Emergency cleanup on setup failure
 */
async function emergencyCleanup(): Promise<void> {
  logger.warn('⚠️ Performing emergency cleanup');

  try {
    // Clear any temporary files
    const tempDirs = ['temp', '.temp', 'tmp'];
    for (const dir of tempDirs) {
      try {
        await fs.rmdir(dir, { recursive: true });
      } catch {
        // Ignore if directory doesn't exist
      }
    }

    // Clear any partial artifacts
    const partialFiles = [
      'test-results/environment-info.json',
      'config/performance.json'
    ];

    for (const file of partialFiles) {
      try {
        await fs.unlink(file);
      } catch {
        // Ignore if file doesn't exist
      }
    }

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

/**
 * Detect CI provider
 * @returns CI provider name or 'unknown'
 */
function getCIProvider(): string {
  if (process.env.GITHUB_ACTIONS) return 'GitHub Actions';
  if (process.env.JENKINS_URL) return 'Jenkins';
  if (process.env.BUILDKITE) return 'Buildkite';
  if (process.env.CIRCLECI) return 'CircleCI';
  if (process.env.TRAVIS) return 'Travis CI';
  if (process.env.CI) return 'Generic CI';
  return 'Local';
}

export default globalSetup;