import { allure } from 'allure-playwright';
import { Page } from '@playwright/test';
import logger from '../config/logger.js';

export class AllureHelper {
  private logger = logger;

  /**
   * Add a simple step to the current test
   * @param stepName - Name of the step
   * @param status - Status of the step (passed, failed, broken, skipped)
   */
  addStep(stepName: string, status: 'passed' | 'failed' | 'broken' | 'skipped' = 'passed'): void {
    try {
      this.logger.test.step(stepName, 'allure_step', { status });
      
      allure.step(stepName, async () => {
        if (status === 'failed') {
          throw new Error(`Step failed: ${stepName}`);
        }
      });
    } catch (error) {
      this.logger.error('Failed to add Allure step', {
        stepName,
        status,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Add an attachment to the current test
   * @param name - Name of the attachment
   * @param content - Content to attach
   * @param type - MIME type of the attachment
   */
  addAttachment(name: string, content: string | Buffer, type: string = 'text/plain'): void {
    try {
      allure.attachment(name, content, type);
      this.logger.debug('Allure attachment added', {
        name,
        type,
        contentLength: typeof content === 'string' ? content.length : content.length
      });
    } catch (error) {
      this.logger.error('Failed to add Allure attachment', {
        name,
        type,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Attach JSON data to the current test
   * @param name - Name of the attachment
   * @param data - JSON data to attach
   */
  attachJSON(name: string, data: any): void {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      this.addAttachment(name, jsonString, 'application/json');
    } catch (error) {
      this.logger.error('Failed to attach JSON data', {
        name,
        error: error instanceof Error ? error.message : String(error)
      });
      // Fallback: attach as text
      try {
        this.addAttachment(name, String(data), 'text/plain');
      } catch (fallbackError) {
        this.logger.error('Failed to attach data as fallback text', {
          name,
          error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
        });
      }
    }
  }

  /**
   * Attach screenshot to the current test
   * @param name - Name of the screenshot
   * @param screenshot - Screenshot buffer or page object
   */
  async attachScreenshot(name: string, screenshot: Buffer | Page): Promise<void> {
    try {
      let screenshotBuffer: Buffer;
      
      if (Buffer.isBuffer(screenshot)) {
        screenshotBuffer = screenshot;
      } else {
        // Take screenshot from page
        screenshotBuffer = await screenshot.screenshot({ fullPage: true });
      }
      
      this.addAttachment(name, screenshotBuffer, 'image/png');
      this.logger.test.screenshot(name, `attachment_${Date.now()}.png`);
    } catch (error) {
      this.logger.error('Failed to attach screenshot', {
        name,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Attach text to the current test
   * @param name - Name of the attachment
   * @param text - Text content
   */
  attachText(name: string, text: string): void {
    this.addAttachment(name, text, 'text/plain');
  }

  /**
   * Attach HTML content to the current test
   * @param name - Name of the attachment
   * @param html - HTML content
   */
  attachHTML(name: string, html: string): void {
    this.addAttachment(name, html, 'text/html');
  }

  /**
   * Attach XML content to the current test
   * @param name - Name of the attachment
   * @param xml - XML content
   */
  attachXML(name: string, xml: string): void {
    this.addAttachment(name, xml, 'application/xml');
  }

  /**
   * Set test description
   * @param description - Test description
   */
  setDescription(description: string): void {
    try {
      allure.description(description);
      this.logger.debug('Allure description set', { description });
    } catch (error) {
      this.logger.error('Failed to set Allure description', {
        description,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Set test description in HTML format
   * @param html - HTML description
   */
  setDescriptionHtml(html: string): void {
    try {
      allure.descriptionHtml(html);
      this.logger.debug('Allure HTML description set');
    } catch (error) {
      this.logger.error('Failed to set Allure HTML description', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Add a tag to the current test
   * @param tag - Tag to add
   */
  addTag(tag: string): void {
    try {
      allure.tag(tag);
      this.logger.debug('Allure tag added', { tag });
    } catch (error) {
      this.logger.error('Failed to add Allure tag', {
        tag,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Add multiple tags to the current test
   * @param tags - Array of tags to add
   */
  addTags(tags: string[]): void {
    tags.forEach(tag => this.addTag(tag));
  }

  /**
   * Set test severity
   * @param severity - Severity level (blocker, critical, normal, minor, trivial)
   */
  setSeverity(severity: 'blocker' | 'critical' | 'normal' | 'minor' | 'trivial'): void {
    try {
      allure.severity(severity);
      this.logger.debug('Allure severity set', { severity });
    } catch (error) {
      this.logger.error('Failed to set Allure severity', {
        severity,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Set test owner
   * @param owner - Owner name
   */
  setOwner(owner: string): void {
    try {
      allure.owner(owner);
      this.logger.debug('Allure owner set', { owner });
    } catch (error) {
      this.logger.error('Failed to set Allure owner', {
        owner,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Add a link to the current test
   * @param url - URL
   * @param name - Link name
   * @param type - Link type (issue, tms, etc.)
   */
  addLink(url: string, name: string, type: 'issue' | 'tms' | 'link' = 'link'): void {
    try {
      allure.link(url, name, type);
      this.logger.debug('Allure link added', { url, name, type });
    } catch (error) {
      this.logger.error('Failed to add Allure link', {
        url,
        name,
        type,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Add an issue link
   * @param url - Issue URL
   * @param name - Issue name/ID
   */
  addIssue(url: string, name: string): void {
    this.addLink(url, name, 'issue');
  }

  /**
   * Add a test management system link
   * @param url - TMS URL
   * @param name - Test case ID
   */
  addTmsLink(url: string, name: string): void {
    this.addLink(url, name, 'tms');
  }

  /**
   * Set test feature
   * @param feature - Feature name
   */
  setFeature(feature: string): void {
    try {
      allure.feature(feature);
      this.logger.debug('Allure feature set', { feature });
    } catch (error) {
      this.logger.error('Failed to set Allure feature', {
        feature,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Set test story
   * @param story - Story name
   */
  setStory(story: string): void {
    try {
      allure.story(story);
      this.logger.debug('Allure story set', { story });
    } catch (error) {
      this.logger.error('Failed to set Allure story', {
        story,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Set test epic
   * @param epic - Epic name
   */
  setEpic(epic: string): void {
    try {
      allure.epic(epic);
      this.logger.debug('Allure epic set', { epic });
    } catch (error) {
      this.logger.error('Failed to set Allure epic', {
        epic,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Add environment information
   * @param key - Environment key
   * @param value - Environment value
   */
  addEnvironment(key: string, value: string): void {
    try {
      allure.parameter(key, value, { mode: 'hidden' });
      this.logger.debug('Allure environment parameter added', { key, value });
    } catch (error) {
      this.logger.error('Failed to add Allure environment parameter', {
        key,
        value,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Add a parameter to the current test
   * @param name - Parameter name
   * @param value - Parameter value
   * @param options - Parameter options
   */
  addParameter(name: string, value: any, options: { mode?: 'default' | 'hidden' | 'masked' } = {}): void {
    try {
      // Convert value to string if it's not already
      const stringValue = typeof value === 'string' ? value : String(value);
      allure.parameter(name, stringValue, options);
      this.logger.debug('Allure parameter added', { name, value: stringValue, options });
    } catch (error) {
      this.logger.error('Failed to add Allure parameter', {
        name,
        value,
        options,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Mark test as flaky
   */
  markAsFlaky(): void {
    this.addTag('flaky');
    this.addParameter('Test Status', 'Flaky Test - May fail intermittently');
  }

  /**
   * Mark test as known issue
   * @param reason - Reason for known issue
   */
  markAsKnownIssue(reason: string): void {
    this.addTag('known_issue');
    this.addParameter('Known Issue Reason', reason);
  }

  /**
   * Log test execution time
   * @param action - Action being timed
   * @param startTime - Start timestamp
   * @param endTime - End timestamp
   */
  logExecutionTime(action: string, startTime: number, endTime: number): void {
    const duration = endTime - startTime;
    this.addParameter(`${action} Duration (ms)`, duration.toString());
    this.attachText(`${action} Timing`, `
Action: ${action}
Start Time: ${new Date(startTime).toISOString()}
End Time: ${new Date(endTime).toISOString()}
Duration: ${duration}ms
    `.trim());
    
    this.logger.test.performance(action, duration, parseInt(process.env.PAGE_LOAD_THRESHOLD || '5000'));
  }

  /**
   * Create a test suite structure
   * @param suiteName - Name of the test suite
   * @param suiteFunction - Function containing the test suite
   */
  createSuite<T>(suiteName: string, suiteFunction: () => T): T {
    try {
      allure.parentSuite(suiteName);
      this.logger.debug('Allure parent suite set', { suiteName });
      return suiteFunction();
    } catch (error) {
      this.logger.error('Failed to create Allure suite', {
        suiteName,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Create a sub-suite structure
   * @param subSuiteName - Name of the sub-suite
   * @param subSuiteFunction - Function containing the sub-suite
   */
  createSubSuite<T>(subSuiteName: string, subSuiteFunction: () => T): T {
    try {
      allure.suite(subSuiteName);
      this.logger.debug('Allure suite set', { subSuiteName });
      return subSuiteFunction();
    } catch (error) {
      this.logger.error('Failed to create Allure sub-suite', {
        subSuiteName,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Add test result labels for better categorization
   * @param labels - Object containing label key-value pairs
   */
  addLabels(labels: Record<string, string>): void {
    try {
      Object.entries(labels).forEach(([key, value]) => {
        allure.label(key, value);
      });
      this.logger.debug('Allure labels added', { labels });
    } catch (error) {
      this.logger.error('Failed to add Allure labels', {
        labels,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Add test case ID
   * @param testCaseId - Test case identifier
   */
  setTestCaseId(testCaseId: string): void {
    try {
      allure.label('testId', testCaseId);
      this.addParameter('Test Case ID', testCaseId);
      this.logger.debug('Test case ID set', { testCaseId });
    } catch (error) {
      this.logger.error('Failed to set test case ID', {
        testCaseId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Set test suite
   * @param suiteName - Test suite name
   */
  setTestSuite(suiteName: string): void {
    try {
      allure.suite(suiteName);
      this.logger.debug('Test suite set', { suiteName });
    } catch (error) {
      this.logger.error('Failed to set test suite', {
        suiteName,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Execute a step with proper Allure step reporting and timing
   * @param stepName - Name of the step
   * @param stepFunction - Function to execute in the step
   * @returns Result of the step function
   */
  async timedStep<T>(stepName: string, stepFunction: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    
    try {
      this.logger.test.step(stepName, 'start', { startTime });
      const result = await stepFunction();
      const endTime = Date.now();
      
      this.logExecutionTime(stepName, startTime, endTime);
      this.logger.test.step(stepName, 'completed', { 
        duration: endTime - startTime,
        status: 'passed'
      });
      
      allure.step(stepName, async () => {});
      return result;
    } catch (error) {
      const endTime = Date.now();
      
      this.logExecutionTime(stepName, startTime, endTime);
      this.logger.test.error(error instanceof Error ? error : new Error(String(error)), {
        step: stepName,
        duration: endTime - startTime
      });
      
      // Attach error details
      if (error instanceof Error) {
        this.attachText('Error Details', `
Step: ${stepName}
Error: ${error.message}
Stack: ${error.stack || 'No stack trace available'}
Duration: ${endTime - startTime}ms
        `.trim());
      }
      
      allure.step(stepName, async () => {
        throw error;
      });
      
      throw error;
    }
  }

  /**
   * Add API response as attachment
   * @param response - API response data
   * @param requestData - Request data (optional)
   * @param endpoint - API endpoint (optional)
   */
  attachApiResponse(response: any, requestData?: any, endpoint?: string): void {
    try {
      if (requestData) {
        this.attachJSON('API Request', {
          endpoint: endpoint || 'Unknown',
          timestamp: new Date().toISOString(),
          data: requestData
        });
      }
      
      this.attachJSON('API Response', {
        endpoint: endpoint || 'Unknown',
        timestamp: new Date().toISOString(),
        data: response
      });
      
      if (endpoint) {
        this.addParameter('API Endpoint', endpoint);
      }
    } catch (error) {
      this.logger.error('Failed to attach API response', {
        endpoint,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Add browser console logs as attachment
   * @param consoleLogs - Console log messages
   */
  attachConsoleLogs(consoleLogs: string[]): void {
    try {
      if (consoleLogs.length > 0) {
        this.attachText('Browser Console Logs', consoleLogs.join('\n'));
      }
    } catch (error) {
      this.logger.error('Failed to attach console logs', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Add performance metrics as attachment
   * @param metrics - Performance metrics object
   */
  attachPerformanceMetrics(metrics: Record<string, number>): void {
    try {
      this.attachJSON('Performance Metrics', metrics);
      
      // Also add individual metrics as parameters
      Object.entries(metrics).forEach(([key, value]) => {
        this.addParameter(`Performance: ${key}`, `${value}ms`);
      });
    } catch (error) {
      this.logger.error('Failed to attach performance metrics', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Add test environment info
   * @param environmentInfo - Environment information
   */
  addEnvironmentInfo(environmentInfo: Record<string, string>): void {
    try {
      Object.entries(environmentInfo).forEach(([key, value]) => {
        this.addEnvironment(key, value);
      });
    } catch (error) {
      this.logger.error('Failed to add environment info', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Add test retry information
   * @param retryCount - Current retry attempt
   * @param maxRetries - Maximum retry attempts
   */
  addRetryInfo(retryCount: number, maxRetries: number): void {
    try {
      this.addParameter('Retry Count', retryCount.toString());
      this.addParameter('Max Retries', maxRetries.toString());
      
      if (retryCount > 0) {
        this.addTag('retry');
        this.addParameter('Test Status', `Retry attempt ${retryCount} of ${maxRetries}`);
      }
    } catch (error) {
      this.logger.error('Failed to add retry info', {
        retryCount,
        maxRetries,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Add browser information
   * @param browserInfo - Browser information object
   */
  addBrowserInfo(browserInfo: {
    name: string;
    version?: string;
    platform?: string;
    viewport?: { width: number; height: number };
  }): void {
    try {
      this.addParameter('Browser', browserInfo.name);
      
      if (browserInfo.version) {
        this.addParameter('Browser Version', browserInfo.version);
      }
      
      if (browserInfo.platform) {
        this.addParameter('Platform', browserInfo.platform);
      }
      
      if (browserInfo.viewport) {
        this.addParameter('Viewport', `${browserInfo.viewport.width}x${browserInfo.viewport.height}`);
      }
    } catch (error) {
      this.logger.error('Failed to add browser info', {
        browserInfo,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Create singleton instance
   */
  private static instance: AllureHelper;
  
  static getInstance(): AllureHelper {
    if (!AllureHelper.instance) {
      AllureHelper.instance = new AllureHelper();
    }
    return AllureHelper.instance;
  }
}