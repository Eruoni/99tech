import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import logger from './src/config/logger.js';
import type { Environment } from './src/types/index.js';

// Load environment variables
dotenv.config();

// Type-safe environment variables
const env: Partial<Environment> = {
  BROWSER: (process.env.BROWSER as Environment['BROWSER']) || 'chromium',
  BASE_URL: process.env.BASE_URL || 'https://opensource-demo.orangehrmlive.com',
  API_BASE_URL: process.env.API_BASE_URL || 'https://opensource-demo.orangehrmlive.com/web/api/v1',
  USERNAME: process.env.USERNAME || 'Admin',
  PASSWORD: process.env.PASSWORD || 'admin123',
  HEADLESS: process.env.HEADLESS === 'true',
  VIEWPORT_WIDTH: parseInt(process.env.VIEWPORT_WIDTH || '1280'),
  VIEWPORT_HEIGHT: parseInt(process.env.VIEWPORT_HEIGHT || '720'),
  TIMEOUT: parseInt(process.env.TIMEOUT || '30000'),
  API_TIMEOUT: parseInt(process.env.API_TIMEOUT || '10000'),
  WORKERS: parseInt(process.env.WORKERS || '4'),
  ALLURE_RESULTS_DIR: process.env.ALLURE_RESULTS_DIR || 'allure-results',
  ALLURE_REPORT_DIR: process.env.ALLURE_REPORT_DIR || 'allure-report',
  LOG_LEVEL: (process.env.LOG_LEVEL as Environment['LOG_LEVEL']) || 'info',
  LOG_TO_FILE: process.env.LOG_TO_FILE === 'true',
  LOG_TO_CONSOLE: process.env.LOG_TO_CONSOLE === 'true',
  PAGE_LOAD_THRESHOLD: parseInt(process.env.PAGE_LOAD_THRESHOLD || '5000'),
  API_RESPONSE_THRESHOLD: parseInt(process.env.API_RESPONSE_THRESHOLD || '3000'),
  TEST_SUITE: (process.env.TEST_SUITE as Environment['TEST_SUITE']) || 'all'
};

// Log configuration startup
logger.info('Playwright Configuration Loading', {
  browser: env.BROWSER,
  headless: env.HEADLESS,
  baseURL: env.BASE_URL,
  workers: env.WORKERS,
  testSuite: env.TEST_SUITE
});

const config = defineConfig({
  // Test directory
  testDir: './tests',
  
  // Test timeout
  timeout: env.TIMEOUT!,
  
  // Expect timeout
  expect: {
    timeout: 10000
  },

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry configuration
  retries: process.env.CI ? 2 : 1,

  // Parallel workers
  workers: process.env.CI ? 1 : env.WORKERS!,

  // Reporter configuration with Allure
  reporter: [
    ['list'],
    ['allure-playwright', {
      detail: true,
      outputFolder: env.ALLURE_RESULTS_DIR!,
      suiteTitle: true,
      categories: [
        {
          name: 'Outdated tests',
          messageRegex: '.*cucumber.*',
        },
        {
          name: 'Product defects',
          messageRegex: '.*assert.*',
        },
        {
          name: 'Test defects',
          messageRegex: '.*timeout.*',
        },
        {
          name: 'Infrastructure issues',
          messageRegex: '.*network.*|.*timeout.*|.*connection.*',
        }
      ],
      environmentInfo: {
        framework: 'Playwright',
        language: 'TypeScript',
        node_version: process.version,
        os: process.platform,
        browser: env.BROWSER!,
        logger: 'Winston',
        test_suite: env.TEST_SUITE!
      }
    }],
    ['html', { 
      outputFolder: 'playwright-report',
      open: 'never' 
    }],
    ['json', {
      outputFile: 'test-results/results.json'
    }],
    ['junit', {
      outputFile: 'test-results/junit.xml'
    }]
  ],

  // Global setup and teardown
  globalSetup: './src/setup/global-setup.ts',
  globalTeardown: './src/setup/global-teardown.ts',

  // Shared settings for all projects
  use: {
    // Browser context options
    viewport: { 
      width: env.VIEWPORT_WIDTH!, 
      height: env.VIEWPORT_HEIGHT! 
    },
    
    // API request timeout (removed - not a valid Playwright option)

    // Screenshots and videos
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',

    // Base URL
    baseURL: env.BASE_URL!,

    // Browser context options
    ignoreHTTPSErrors: true,
    acceptDownloads: true,
    
    // Custom properties for our framework
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9'
    },

    // Locale
    locale: 'en-US',
    
    // Timezone
    timezoneId: 'America/New_York'
  },

  // Project configuration based on browser
  projects: [
    // Chromium Desktop
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        headless: env.HEADLESS,
        channel: 'chrome'
      },
      testMatch: ['chromium', undefined].includes(env.BROWSER) ? '**/*.spec.ts' : []
    },

    // Firefox Desktop
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        headless: env.HEADLESS
      },
      testMatch: env.BROWSER === 'firefox' ? '**/*.spec.ts' : []
    },

    // WebKit Desktop
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        headless: env.HEADLESS
      },
      testMatch: env.BROWSER === 'webkit' ? '**/*.spec.ts' : []
    },

    // Mobile Chrome
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 8'],
        headless: env.HEADLESS
      },
      testMatch: env.BROWSER === 'mobile' ? '**/*.spec.ts' : []
    },

    // Mobile Safari
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 15'],
        headless: env.HEADLESS
      },
      testMatch: env.BROWSER === 'mobile-safari' ? '**/*.spec.ts' : []
    },

    // High DPI
    {
      name: 'Desktop Chrome HiDPI',
      use: {
        ...devices['Desktop Chrome HiDPI'],
        headless: env.HEADLESS
      },
      testMatch: env.BROWSER === 'chromium' ? '**/*.spec.ts' : []
    }
  ],

  // Output directory
  outputDir: 'test-results',

  // Test result metadata
  metadata: {
    framework: 'Playwright + TypeScript',
    version: '1.0.0',
    author: 'Test Automation Team',
    environment: env.TEST_SUITE,
    browser: env.BROWSER,
    headless: env.HEADLESS
  },

  // Test filtering based on tags
  grep: (() => {
    switch (env.TEST_SUITE) {
      case 'ui':
        return /@ui/;
      case 'api':
        return /@api/;
      case 'regression':
        return /@regression/;
      case 'performance':
        return /@performance/;
      default:
        return undefined; // Run all tests
    }
  })(),

  // Web server for local development (optional)
  webServer: process.env.CI ? undefined : {
    command: 'echo "No local server needed - testing against demo site"',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  }
});

// Log final configuration
logger.info('Playwright Configuration Loaded Successfully', {
  testDir: config.testDir,
  timeout: config.timeout,
  workers: config.workers,
  projects: config.projects?.map(p => p.name),
  reporters: Array.isArray(config.reporter) ? config.reporter.map((r: any) => Array.isArray(r) ? r[0] : r) : [config.reporter],
  baseURL: config.use?.baseURL,
  testSuite: env.TEST_SUITE
});

export default config;