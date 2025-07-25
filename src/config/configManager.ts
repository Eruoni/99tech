import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';
import type { Environment, FrameworkConfig } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

/**
 * Configuration Manager for handling environment-specific settings
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: FrameworkConfig;
  private environmentOverrides: Partial<Environment> = {};

  private constructor() {
    this.config = this.loadConfiguration();
    this.validateConfiguration();
  }

  /**
   * Get singleton instance of ConfigManager
   */
  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Load configuration from environment variables and config files
   */
  private loadConfiguration(): FrameworkConfig {
    logger.info('Loading framework configuration');

    const baseConfig: FrameworkConfig = {
      environment: {
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
      },
      browser: {
        name: process.env.BROWSER || 'chromium',
        headless: process.env.HEADLESS === 'true',
        viewport: {
          width: parseInt(process.env.VIEWPORT_WIDTH || '1280'),
          height: parseInt(process.env.VIEWPORT_HEIGHT || '720')
        },
        deviceScaleFactor: parseFloat(process.env.DEVICE_SCALE_FACTOR || '1'),
        isMobile: process.env.IS_MOBILE === 'true',
        hasTouch: process.env.HAS_TOUCH === 'true'
      },
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        toFile: process.env.LOG_TO_FILE === 'true',
        toConsole: process.env.LOG_TO_CONSOLE === 'true'
      },
      reporting: {
        allure: process.env.ALLURE_ENABLED !== 'false',
        html: process.env.HTML_REPORT_ENABLED !== 'false',
        json: process.env.JSON_REPORT_ENABLED !== 'false'
      },
      performance: {
        pageLoadThreshold: parseInt(process.env.PAGE_LOAD_THRESHOLD || '5000'),
        apiResponseThreshold: parseInt(process.env.API_RESPONSE_THRESHOLD || '3000')
      }
    };

    return baseConfig;
  }

  /**
   * Validate configuration values
   */
  private validateConfiguration(): void {
    logger.info('Validating configuration');

    const errors: string[] = [];

    // Validate required environment variables
    const requiredVars = ['BASE_URL', 'API_BASE_URL', 'USERNAME', 'PASSWORD'];
    for (const envVar of requiredVars) {
      if (!this.config.environment[envVar as keyof Environment]) {
        errors.push(`Missing required environment variable: ${envVar}`);
      }
    }

    // Validate URLs
    if (this.config.environment.BASE_URL && !this.isValidUrl(this.config.environment.BASE_URL)) {
      errors.push(`Invalid BASE_URL: ${this.config.environment.BASE_URL}`);
    }

    if (this.config.environment.API_BASE_URL && !this.isValidUrl(this.config.environment.API_BASE_URL)) {
      errors.push(`Invalid API_BASE_URL: ${this.config.environment.API_BASE_URL}`);
    }

    // Validate numeric values
    if (this.config.environment.TIMEOUT && this.config.environment.TIMEOUT < 1000) {
      errors.push('TIMEOUT must be at least 1000ms');
    }

    if (this.config.environment.WORKERS && this.config.environment.WORKERS < 1) {
      errors.push('WORKERS must be at least 1');
    }

    // Validate viewport dimensions
    if (this.config.browser.viewport.width < 320 || this.config.browser.viewport.height < 240) {
      errors.push('Viewport dimensions must be at least 320x240');
    }

    if (errors.length > 0) {
      const errorMessage = `Configuration validation failed:\n${errors.join('\n')}`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    logger.info('Configuration validation passed');
  }

  /**
   * Get complete configuration
   */
  getConfig(): FrameworkConfig {
    return { ...this.config };
  }

  /**
   * Get environment configuration
   */
  getEnvironment(): Environment {
    return { ...this.config.environment, ...this.environmentOverrides } as Environment;
  }

  /**
   * Get browser configuration
   */
  getBrowserConfig(): FrameworkConfig['browser'] {
    return { ...this.config.browser };
  }

  /**
   * Get specific environment variable
   */
  get<K extends keyof Environment>(key: K): Environment[K] {
    const overrideValue = this.environmentOverrides[key];
    if (overrideValue !== undefined) {
      return overrideValue as Environment[K];
    }
    
    const configValue = this.config.environment[key];
    if (configValue === undefined) {
      throw new Error(`Configuration value for '${String(key)}' is not defined`);
    }
    
    return configValue as Environment[K];
  }

  /**
   * Set environment override
   */
  set<K extends keyof Environment>(key: K, value: Environment[K]): void {
    this.environmentOverrides[key] = value;
    logger.debug('Environment override set', { key, value });
  }

  /**
   * Clear environment overrides
   */
  clearOverrides(): void {
    this.environmentOverrides = {};
    logger.debug('Environment overrides cleared');
  }

  /**
   * Load configuration from file
   */
  async loadConfigFromFile(configPath: string): Promise<void> {
    try {
      const configData = await fs.readFile(configPath, 'utf-8');
      const fileConfig = JSON.parse(configData);
      
      // Merge file config with current config
      this.config = this.mergeConfigs(this.config, fileConfig);
      this.validateConfiguration();
      
      logger.info('Configuration loaded from file', { configPath });
    } catch (error) {
      logger.error('Failed to load configuration from file', {
        configPath,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Save current configuration to file
   */
  async saveConfigToFile(configPath: string): Promise<void> {
    try {
      await fs.mkdir(path.dirname(configPath), { recursive: true });
      await fs.writeFile(configPath, JSON.stringify(this.config, null, 2));
      
      logger.info('Configuration saved to file', { configPath });
    } catch (error) {
      logger.error('Failed to save configuration to file', {
        configPath,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get environment-specific test data path
   */
  getTestDataPath(): string {
    const environment = this.getEnvironmentName();
    return path.join(__dirname, '../../test-data', `${environment}.json`);
  }

  /**
   * Get environment name based on configuration
   */
  getEnvironmentName(): string {
    const baseUrl = this.get('BASE_URL');
    
    if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
      return 'local';
    } else if (baseUrl.includes('staging') || baseUrl.includes('stg')) {
      return 'staging';
    } else if (baseUrl.includes('demo') || baseUrl.includes('opensource-demo')) {
      return 'demo';
    } else if (baseUrl.includes('prod') || baseUrl.includes('production')) {
      return 'production';
    }
    
    return 'unknown';
  }

  /**
   * Check if running in CI environment
   */
  isCI(): boolean {
    return !!(
      process.env.CI ||
      process.env.GITHUB_ACTIONS ||
      process.env.JENKINS_URL ||
      process.env.BUILDKITE ||
      process.env.CIRCLECI
    );
  }

  /**
   * Get retry configuration based on environment
   */
  getRetryConfig(): { retries: number; timeout: number } {
    if (this.isCI()) {
      return {
        retries: 3,
        timeout: this.get('TIMEOUT') * 2 // Double timeout in CI
      };
    }
    
    return {
      retries: 1,
      timeout: this.get('TIMEOUT')
    };
  }

  /**
   * Get parallel workers configuration
   */
  getWorkersConfig(): number {
    if (this.isCI()) {
      return 1; // Run sequentially in CI to avoid resource issues
    }
    
    return this.get('WORKERS');
  }

  /**
   * Get browser launch options
   */
  getBrowserLaunchOptions(): any {
    const options: any = {
      headless: this.getBrowserConfig().headless,
      viewport: this.getBrowserConfig().viewport
    };

    if (this.isCI()) {
      // CI-specific browser options
      options.args = [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ];
    }

    return options;
  }

  /**
   * Get test timeout based on test type
   */
  getTestTimeout(testType: 'ui' | 'api' | 'performance' = 'ui'): number {
    const baseTimeout = this.get('TIMEOUT');
    
    switch (testType) {
      case 'api':
        return this.get('API_TIMEOUT');
      case 'performance':
        return baseTimeout * 2; // Performance tests need more time
      case 'ui':
      default:
        return baseTimeout;
    }
  }

  /**
   * Get reporting configuration
   */
  getReportingConfig(): {
    allureEnabled: boolean;
    htmlEnabled: boolean;
    jsonEnabled: boolean;
    outputDirs: {
      allure: string;
      html: string;
      json: string;
    };
  } {
    return {
      allureEnabled: this.config.reporting.allure,
      htmlEnabled: this.config.reporting.html,
      jsonEnabled: this.config.reporting.json,
      outputDirs: {
        allure: this.get('ALLURE_RESULTS_DIR'),
        html: 'playwright-report',
        json: 'test-results'
      }
    };
  }

  /**
   * Get performance thresholds
   */
  getPerformanceThresholds(): {
    pageLoad: number;
    apiResponse: number;
  } {
    return {
      pageLoad: this.get('PAGE_LOAD_THRESHOLD'),
      apiResponse: this.get('API_RESPONSE_THRESHOLD')
    };
  }

  /**
   * Get database configuration (if applicable)
   */
  getDatabaseConfig(): {
    enabled: boolean;
    connectionString?: string;
    timeout: number;
  } {
    return {
      enabled: !!process.env.DATABASE_URL,
      connectionString: process.env.DATABASE_URL,
      timeout: parseInt(process.env.DATABASE_TIMEOUT || '5000')
    };
  }

  /**
   * Get notification configuration
   */
  getNotificationConfig(): {
    email: boolean;
    slack: boolean;
    teams: boolean;
    webhookUrl?: string;
  } {
    return {
      email: process.env.EMAIL_NOTIFICATIONS === 'true',
      slack: process.env.SLACK_NOTIFICATIONS === 'true',
      teams: process.env.TEAMS_NOTIFICATIONS === 'true',
      webhookUrl: process.env.WEBHOOK_URL
    };
  }

  /**
   * Generate configuration summary for logging
   */
  getConfigSummary(): Record<string, any> {
    return {
      environment: this.getEnvironmentName(),
      browser: this.get('BROWSER'),
      headless: this.getBrowserConfig().headless,
      baseUrl: this.get('BASE_URL'),
      workers: this.getWorkersConfig(),
      timeout: this.get('TIMEOUT'),
      testSuite: this.get('TEST_SUITE'),
      isCI: this.isCI(),
      retries: this.getRetryConfig().retries
    };
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Deep merge two configuration objects
   */
  private mergeConfigs(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.mergeConfigs(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }
}

// Export singleton instance
export const configManager = ConfigManager.getInstance();