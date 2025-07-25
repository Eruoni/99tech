import { Page, expect, Locator } from '@playwright/test';
import { AllureHelper } from '../helpers/AllureHelper.js';
import logger, { type ExtendedLogger } from '../config/logger';
import type { 
  ClickOptions, 
  FillOptions, 
  TypeOptions, 
  SelectOption, 
  NavigationOptions,
  WaitCondition,
  ElementState 
} from '../types/index.js';

export class BasePage {
  protected page: Page;
  protected allure: AllureHelper;
  protected logger: ExtendedLogger = logger;
  protected timeout: number;
  protected baseURL: string;

  constructor(page: Page) {
    this.page = page;
    this.allure = new AllureHelper();
    this.timeout = 30000;
    this.baseURL = process.env.BASE_URL || 'https://opensource-demo.orangehrmlive.com';
    
    this.logger.debug('BasePage initialized', {
      baseURL: this.baseURL,
      timeout: this.timeout
    });
  }

  /**
   * Navigate to a specific URL
   * @param url - URL to navigate to
   * @param options - Navigation options
   */
  async navigateTo(url: string, options: NavigationOptions = {}): Promise<void> {
    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;
    
    await this.allure.timedStep(`Navigate to: ${fullUrl}`, async () => {
      const startTime = Date.now();
      
      await this.page.goto(fullUrl, {
        waitUntil: 'networkidle',
        timeout: this.timeout,
        ...options
      });
      
      const endTime = Date.now();
      const loadTime = endTime - startTime;
      
      this.logger.test.performance('Page Navigation', loadTime, 
        parseInt(process.env.PAGE_LOAD_THRESHOLD || '5000'));
      
      this.allure.addParameter('Navigation URL', fullUrl);
      this.allure.addParameter('Load Time (ms)', loadTime);
    });
    
    await this.waitForPageLoad();
  }

  /**
   * Wait for page to load completely
   */
  async waitForPageLoad(): Promise<void> {
    await this.allure.timedStep('Wait for page load', async () => {
      await Promise.all([
        this.page.waitForLoadState('networkidle'),
        this.page.waitForLoadState('domcontentloaded')
      ]);
      
      this.logger.debug('Page load completed');
    });
  }

  /**
   * Wait for an element to be in a specific state
   * @param selector - Element selector
   * @param state - Element state to wait for
   * @param timeout - Timeout in milliseconds
   */
  async waitForElement(selector: string, state: WaitCondition = 'visible', timeout: number = this.timeout): Promise<void> {
    await this.allure.timedStep(`Wait for element '${selector}' to be ${state}`, async () => {
      await this.page.waitForSelector(selector, { 
        state, 
        timeout 
      });
      
      this.logger.debug('Element state achieved', {
        selector,
        state,
        timeout
      });
    });
  }

  /**
   * Wait for an element to be hidden
   * @param selector - Element selector
   * @param timeout - Timeout in milliseconds
   */
  async waitForElementToBeHidden(selector: string, timeout: number = this.timeout): Promise<void> {
    await this.waitForElement(selector, 'hidden', timeout);
  }

  /**
   * Get locator for an element
   * @param selector - Element selector
   * @returns Locator object
   */
  getLocator(selector: string): Locator {
    return this.page.locator(selector);
  }

  /**
   * Click on an element
   * @param selector - Element selector
   * @param options - Click options
   */
  async click(selector: string, options: ClickOptions = {}): Promise<void> {
    await this.allure.timedStep(`Click on: ${selector}`, async () => {
      await this.waitForElement(selector);
      await this.page.click(selector, {
        timeout: this.timeout,
        ...options
      });
      
      this.logger.test.step('Click Action', 'click', {
        selector,
        options
      });
    });
  }

  /**
   * Double click on an element
   * @param selector - Element selector
   * @param options - Click options
   */
  async doubleClick(selector: string, options: ClickOptions = {}): Promise<void> {
    await this.allure.timedStep(`Double click on: ${selector}`, async () => {
      await this.waitForElement(selector);
      await this.page.dblclick(selector, {
        timeout: this.timeout,
        ...options
      });
      
      this.logger.test.step('Double Click Action', 'dblclick', {
        selector,
        options
      });
    });
  }

  /**
   * Right click on an element
   * @param selector - Element selector
   * @param options - Click options
   */
  async rightClick(selector: string, options: ClickOptions = {}): Promise<void> {
    await this.allure.timedStep(`Right click on: ${selector}`, async () => {
      await this.waitForElement(selector);
      await this.page.click(selector, {
        button: 'right',
        timeout: this.timeout,
        ...options
      });
      
      this.logger.test.step('Right Click Action', 'rightclick', {
        selector,
        options
      });
    });
  }

  /**
   * Fill an input field
   * @param selector - Element selector
   * @param value - Value to fill
   * @param options - Fill options
   */
  async fill(selector: string, value: string, options: FillOptions = {}): Promise<void> {
    await this.allure.timedStep(`Fill '${selector}' with: ${value}`, async () => {
      await this.waitForElement(selector);
      await this.page.fill(selector, value, {
        timeout: this.timeout,
        ...options
      });
      
      this.logger.test.step('Fill Action', 'fill', {
        selector,
        value: value.includes('password') ? '***' : value,
        options
      });
    });
  }

  /**
   * Clear and fill an input field
   * @param selector - Element selector
   * @param value - Value to fill
   */
  async clearAndFill(selector: string, value: string): Promise<void> {
    await this.allure.timedStep(`Clear and fill '${selector}' with: ${value}`, async () => {
      await this.waitForElement(selector);
      await this.page.locator(selector).clear();
      await this.page.fill(selector, value);
      
      this.logger.test.step('Clear and Fill Action', 'clearAndFill', {
        selector,
        value: value.includes('password') ? '***' : value
      });
    });
  }

  /**
   * Type text into an element
   * @param selector - Element selector
   * @param text - Text to type
   * @param options - Type options
   */
  async type(selector: string, text: string, options: TypeOptions = {}): Promise<void> {
    await this.allure.timedStep(`Type '${text}' into: ${selector}`, async () => {
      await this.waitForElement(selector);
      await this.page.type(selector, text, {
        timeout: this.timeout,
        delay: 100,
        ...options
      });
      
      this.logger.test.step('Type Action', 'type', {
        selector,
        text: text.includes('password') ? '***' : text,
        options
      });
    });
  }

  /**
   * Select an option from dropdown
   * @param selector - Select element selector
   * @param option - Option value, label, or index
   */
  async selectOption(selector: string, option: string | SelectOption): Promise<void> {
    await this.allure.timedStep(`Select option '${JSON.stringify(option)}' from: ${selector}`, async () => {
      await this.waitForElement(selector);
      await this.page.selectOption(selector, option);
      
      this.logger.test.step('Select Option Action', 'selectOption', {
        selector,
        option
      });
    });
  }

  /**
   * Check a checkbox or radio button
   * @param selector - Element selector
   */
  async check(selector: string): Promise<void> {
    await this.allure.timedStep(`Check: ${selector}`, async () => {
      await this.waitForElement(selector);
      await this.page.check(selector);
      
      this.logger.test.step('Check Action', 'check', { selector });
    });
  }

  /**
   * Uncheck a checkbox
   * @param selector - Element selector
   */
  async uncheck(selector: string): Promise<void> {
    await this.allure.timedStep(`Uncheck: ${selector}`, async () => {
      await this.waitForElement(selector);
      await this.page.uncheck(selector);
      
      this.logger.test.step('Uncheck Action', 'uncheck', { selector });
    });
  }

  /**
   * Get text content of an element
   * @param selector - Element selector
   * @returns Text content
   */
  async getText(selector: string): Promise<string> {
    return await this.allure.timedStep(`Get text from: ${selector}`, async () => {
      await this.waitForElement(selector);
      const text = await this.page.textContent(selector) || '';
      
      this.allure.addParameter('Retrieved Text', text);
      this.logger.test.step('Get Text Action', 'getText', {
        selector,
        text
      });
      
      return text;
    });
  }

  /**
   * Get inner text of an element
   * @param selector - Element selector
   * @returns Inner text
   */
  async getInnerText(selector: string): Promise<string> {
    return await this.allure.timedStep(`Get inner text from: ${selector}`, async () => {
      await this.waitForElement(selector);
      const text = await this.page.innerText(selector);
      
      this.allure.addParameter('Retrieved Inner Text', text);
      this.logger.test.step('Get Inner Text Action', 'getInnerText', {
        selector,
        text
      });
      
      return text;
    });
  }

  /**
   * Get attribute value of an element
   * @param selector - Element selector
   * @param attribute - Attribute name
   * @returns Attribute value
   */
  async getAttribute(selector: string, attribute: string): Promise<string | null> {
    return await this.allure.timedStep(`Get '${attribute}' attribute from: ${selector}`, async () => {
      await this.waitForElement(selector);
      const value = await this.page.getAttribute(selector, attribute);
      
      this.allure.addParameter(`${attribute} Value`, value);
      this.logger.test.step('Get Attribute Action', 'getAttribute', {
        selector,
        attribute,
        value
      });
      
      return value;
    });
  }

  /**
   * Get value of an input element
   * @param selector - Element selector
   * @returns Input value
   */
  async getValue(selector: string): Promise<string> {
    return await this.allure.timedStep(`Get value from: ${selector}`, async () => {
      await this.waitForElement(selector);
      const value = await this.page.inputValue(selector);
      
      this.allure.addParameter('Retrieved Value', value);
      this.logger.test.step('Get Value Action', 'getValue', {
        selector,
        value
      });
      
      return value;
    });
  }

  /**
   * Check if element is visible
   * @param selector - Element selector
   * @returns Visibility status
   */
  async isVisible(selector: string): Promise<boolean> {
    return await this.allure.timedStep(`Check if visible: ${selector}`, async () => {
      const isVisible = await this.page.isVisible(selector);
      
      this.allure.addParameter('Is Visible', isVisible);
      this.logger.test.step('Is Visible Check', 'isVisible', {
        selector,
        isVisible
      });
      
      return isVisible;
    });
  }

  /**
   * Check if element is enabled
   * @param selector - Element selector
   * @returns Enabled status
   */
  async isEnabled(selector: string): Promise<boolean> {
    return await this.allure.timedStep(`Check if enabled: ${selector}`, async () => {
      const isEnabled = await this.page.isEnabled(selector);
      
      this.allure.addParameter('Is Enabled', isEnabled);
      this.logger.test.step('Is Enabled Check', 'isEnabled', {
        selector,
        isEnabled
      });
      
      return isEnabled;
    });
  }

  /**
   * Check if checkbox/radio is checked
   * @param selector - Element selector
   * @returns Checked status
   */
  async isChecked(selector: string): Promise<boolean> {
    return await this.allure.timedStep(`Check if checked: ${selector}`, async () => {
      const isChecked = await this.page.isChecked(selector);
      
      this.allure.addParameter('Is Checked', isChecked);
      this.logger.test.step('Is Checked Check', 'isChecked', {
        selector,
        isChecked
      });
      
      return isChecked;
    });
  }

  /**
   * Get element state information
   * @param selector - Element selector
   * @returns Element state object
   */
  async getElementState(selector: string): Promise<ElementState> {
    return await this.allure.timedStep(`Get element state: ${selector}`, async () => {
      const [visible, enabled, checked, focused] = await Promise.all([
        this.page.isVisible(selector),
        this.page.isEnabled(selector).catch(() => false),
        this.page.isChecked(selector).catch(() => undefined),
        this.page.locator(selector).evaluate((el: HTMLElement) => el === document.activeElement).catch(() => false)
      ]);

      const state: ElementState = {
        visible,
        enabled,
        checked,
        focused
      };

      this.allure.attachJSON('Element State', state);
      this.logger.test.step('Get Element State', 'getElementState', {
        selector,
        state
      });

      return state;
    });
  }

  /**
   * Take a screenshot
   * @param name - Screenshot name
   * @param fullPage - Whether to capture full page
   * @returns Screenshot buffer
   */
  async takeScreenshot(name: string = 'screenshot', fullPage: boolean = false): Promise<Buffer> {
    return await this.allure.timedStep(`Take screenshot: ${name}`, async () => {
      const screenshot = await this.page.screenshot({
        fullPage,
        type: 'png'
      });
      
      this.allure.attachScreenshot(name, screenshot);
      this.logger.test.screenshot(name, `${name}_${Date.now()}.png`);
      
      return screenshot;
    });
  }

  /**
   * Hover over an element
   * @param selector - Element selector
   */
  async hover(selector: string): Promise<void> {
    await this.allure.timedStep(`Hover over: ${selector}`, async () => {
      await this.waitForElement(selector);
      await this.page.hover(selector);
      
      this.logger.test.step('Hover Action', 'hover', { selector });
    });
  }

  /**
   * Focus on an element
   * @param selector - Element selector
   */
  async focus(selector: string): Promise<void> {
    await this.allure.timedStep(`Focus on: ${selector}`, async () => {
      await this.waitForElement(selector);
      await this.page.focus(selector);
      
      this.logger.test.step('Focus Action', 'focus', { selector });
    });
  }

  /**
   * Blur an element (remove focus)
   * @param selector - Element selector
   */
  async blur(selector: string): Promise<void> {
    await this.allure.timedStep(`Blur: ${selector}`, async () => {
      await this.page.locator(selector).blur();
      
      this.logger.test.step('Blur Action', 'blur', { selector });
    });
  }

  /**
   * Scroll element into view
   * @param selector - Element selector
   */
  async scrollIntoView(selector: string): Promise<void> {
    await this.allure.timedStep(`Scroll into view: ${selector}`, async () => {
      await this.page.locator(selector).scrollIntoViewIfNeeded();
      
      this.logger.test.step('Scroll Into View Action', 'scrollIntoView', { selector });
    });
  }

  /**
   * Wait for a specific amount of time
   * @param milliseconds - Time to wait in milliseconds
   */
  async wait(milliseconds: number): Promise<void> {
    await this.allure.timedStep(`Wait for ${milliseconds}ms`, async () => {
      await this.page.waitForTimeout(milliseconds);
      
      this.logger.test.step('Wait Action', 'wait', { milliseconds });
    });
  }

  /**
   * Get page title
   * @returns Page title
   */
  async getTitle(): Promise<string> {
    return await this.allure.timedStep('Get page title', async () => {
      const title = await this.page.title();
      
      this.allure.addParameter('Page Title', title);
      this.logger.test.step('Get Title Action', 'getTitle', { title });
      
      return title;
    });
  }

  /**
   * Get current URL
   * @returns Current URL
   */
  async getCurrentUrl(): Promise<string> {
    return await this.allure.timedStep('Get current URL', async () => {
      const url = this.page.url();
      
      this.allure.addParameter('Current URL', url);
      this.logger.test.step('Get Current URL Action', 'getCurrentUrl', { url });
      
      return url;
    });
  }

  /**
   * Refresh the page
   */
  async refresh(): Promise<void> {
    await this.allure.timedStep('Refresh page', async () => {
      await this.page.reload();
      await this.waitForPageLoad();
      
      this.logger.test.step('Refresh Action', 'refresh', {});
    });
  }

  /**
   * Go back in browser history
   */
  async goBack(): Promise<void> {
    await this.allure.timedStep('Go back', async () => {
      await this.page.goBack();
      await this.waitForPageLoad();
      
      this.logger.test.step('Go Back Action', 'goBack', {});
    });
  }

  /**
   * Go forward in browser history
   */
  async goForward(): Promise<void> {
    await this.allure.timedStep('Go forward', async () => {
      await this.page.goForward();
      await this.waitForPageLoad();
      
      this.logger.test.step('Go Forward Action', 'goForward', {});
    });
  }

  /**
   * Execute JavaScript in the browser context
   * @param script - JavaScript code to execute
   * @param args - Arguments to pass to the script
   * @returns Evaluation result
   */
  async executeScript<T = any>(script: string, ...args: any[]): Promise<T> {
    return await this.allure.timedStep(`Execute script: ${script.substring(0, 50)}...`, async () => {
      const result = await this.page.evaluate(script, ...args) as T;
      
      this.allure.addParameter('Script', script);
      this.allure.addParameter('Arguments', args);
      this.allure.addParameter('Result', result);
      
      this.logger.test.step('Execute Script Action', 'executeScript', {
        script: script.substring(0, 100),
        args,
        result
      });
      
      return result;
    });
  }

  /**
   * Get count of elements matching selector
   * @param selector - Element selector
   * @returns Count of matching elements
   */
  async getElementCount(selector: string): Promise<number> {
    return await this.allure.timedStep(`Get element count: ${selector}`, async () => {
      const count = await this.page.locator(selector).count();
      
      this.allure.addParameter('Element Count', count);
      this.logger.test.step('Get Element Count Action', 'getElementCount', {
        selector,
        count
      });
      
      return count;
    });
  }

  /**
   * Expect element to be visible
   * @param selector - Element selector
   * @param timeout - Timeout in milliseconds
   */
  async expectToBeVisible(selector: string, timeout: number = this.timeout): Promise<void> {
    await this.allure.timedStep(`Expect '${selector}' to be visible`, async () => {
      await expect(this.page.locator(selector)).toBeVisible({ timeout });
      
      this.logger.test.assertion('Element Visibility', 'visible', 'visible', true);
    });
  }

  /**
   * Expect element to have text
   * @param selector - Element selector
   * @param expectedText - Expected text
   * @param timeout - Timeout in milliseconds
   */
  async expectToHaveText(selector: string, expectedText: string, timeout: number = this.timeout): Promise<void> {
    await this.allure.timedStep(`Expect '${selector}' to have text: ${expectedText}`, async () => {
      await expect(this.page.locator(selector)).toHaveText(expectedText, { timeout });
      
      this.logger.test.assertion('Element Text', expectedText, expectedText, true);
    });
  }

  /**
   * Expect element to contain text
   * @param selector - Element selector
   * @param expectedText - Expected text to contain
   * @param timeout - Timeout in milliseconds
   */
  async expectToContainText(selector: string, expectedText: string, timeout: number = this.timeout): Promise<void> {
    await this.allure.timedStep(`Expect '${selector}' to contain text: ${expectedText}`, async () => {
      await expect(this.page.locator(selector)).toContainText(expectedText, { timeout });
      
      this.logger.test.assertion('Element Contains Text', expectedText, expectedText, true);
    });
  }

  /**
   * Expect element to have value
   * @param selector - Element selector
   * @param expectedValue - Expected value
   * @param timeout - Timeout in milliseconds
   */
  async expectToHaveValue(selector: string, expectedValue: string, timeout: number = this.timeout): Promise<void> {
    await this.allure.timedStep(`Expect '${selector}' to have value: ${expectedValue}`, async () => {
      await expect(this.page.locator(selector)).toHaveValue(expectedValue, { timeout });
      
      this.logger.test.assertion('Element Value', expectedValue, expectedValue, true);
    });
  }

  /**
   * Expect element to have attribute
   * @param selector - Element selector
   * @param attribute - Attribute name
   * @param expectedValue - Expected attribute value
   * @param timeout - Timeout in milliseconds
   */
  async expectToHaveAttribute(selector: string, attribute: string, expectedValue: string, timeout: number = this.timeout): Promise<void> {
    await this.allure.timedStep(`Expect '${selector}' to have attribute '${attribute}': ${expectedValue}`, async () => {
      await expect(this.page.locator(selector)).toHaveAttribute(attribute, expectedValue, { timeout });
      
      this.logger.test.assertion('Element Attribute', expectedValue, expectedValue, true);
    });
  }

  /**
   * Expect element to be enabled
   * @param selector - Element selector
   * @param timeout - Timeout in milliseconds
   */
  async expectToBeEnabled(selector: string, timeout: number = this.timeout): Promise<void> {
    await this.allure.timedStep(`Expect '${selector}' to be enabled`, async () => {
      await expect(this.page.locator(selector)).toBeEnabled({ timeout });
      
      this.logger.test.assertion('Element Enabled', 'enabled', 'enabled', true);
    });
  }

  /**
   * Expect element to be disabled
   * @param selector - Element selector
   * @param timeout - Timeout in milliseconds
   */
  async expectToBeDisabled(selector: string, timeout: number = this.timeout): Promise<void> {
    await this.allure.timedStep(`Expect '${selector}' to be disabled`, async () => {
      await expect(this.page.locator(selector)).toBeDisabled({ timeout });
      
      this.logger.test.assertion('Element Disabled', 'disabled', 'disabled', true);
    });
  }

  /**
   * Expect element to be checked
   * @param selector - Element selector
   * @param timeout - Timeout in milliseconds
   */
  async expectToBeChecked(selector: string, timeout: number = this.timeout): Promise<void> {
    await this.allure.timedStep(`Expect '${selector}' to be checked`, async () => {
      await expect(this.page.locator(selector)).toBeChecked({ timeout });
      
      this.logger.test.assertion('Element Checked', 'checked', 'checked', true);
    });
  }

  /**
   * Expect page to have title
   * @param expectedTitle - Expected page title
   * @param timeout - Timeout in milliseconds
   */
  async expectToHaveTitle(expectedTitle: string, timeout: number = this.timeout): Promise<void> {
    await this.allure.timedStep(`Expect page to have title: ${expectedTitle}`, async () => {
      await expect(this.page).toHaveTitle(expectedTitle, { timeout });
      
      this.logger.test.assertion('Page Title', expectedTitle, expectedTitle, true);
    });
  }

  /**
   * Expect page to have URL
   * @param expectedUrl - Expected URL (can be string or regex)
   * @param timeout - Timeout in milliseconds
   */
  async expectToHaveUrl(expectedUrl: string | RegExp, timeout: number = this.timeout): Promise<void> {
    await this.allure.timedStep(`Expect page to have URL: ${expectedUrl}`, async () => {
      await expect(this.page).toHaveURL(expectedUrl, { timeout });
      
      this.logger.test.assertion('Page URL', expectedUrl, expectedUrl, true);
    });
  }

  /**
   * Drag and drop from source to target
   * @param sourceSelector - Source element selector
   * @param targetSelector - Target element selector
   */
  async dragAndDrop(sourceSelector: string, targetSelector: string): Promise<void> {
    await this.allure.timedStep(`Drag '${sourceSelector}' to '${targetSelector}'`, async () => {
      await this.waitForElement(sourceSelector);
      await this.waitForElement(targetSelector);
      
      await this.page.dragAndDrop(sourceSelector, targetSelector);
      
      this.logger.test.step('Drag and Drop Action', 'dragAndDrop', {
        source: sourceSelector,
        target: targetSelector
      });
    });
  }

  /**
   * Upload file to file input
   * @param selector - File input selector
   * @param filePath - Path to file to upload
   */
  async uploadFile(selector: string, filePath: string): Promise<void> {
    await this.allure.timedStep(`Upload file '${filePath}' to '${selector}'`, async () => {
      await this.waitForElement(selector);
      await this.page.setInputFiles(selector, filePath);
      
      this.logger.test.step('Upload File Action', 'uploadFile', {
        selector,
        filePath
      });
    });
  }

  /**
   * Handle alert dialog
   * @param action - Action to take ('accept' or 'dismiss')
   * @param text - Text to enter in prompt (optional)
   */
  async handleAlert(action: 'accept' | 'dismiss' = 'accept', text?: string): Promise<void> {
    await this.allure.timedStep(`Handle alert: ${action}`, async () => {
      this.page.on('dialog', async dialog => {
        this.logger.debug('Alert dialog appeared', {
          type: dialog.type(),
          message: dialog.message()
        });
        
        if (text && dialog.type() === 'prompt') {
          await dialog.accept(text);
        } else if (action === 'accept') {
          await dialog.accept();
        } else {
          await dialog.dismiss();
        }
      });
      
      this.logger.test.step('Handle Alert Action', 'handleAlert', {
        action,
        text
      });
    });
  }

  /**
   * Switch to frame
   * @param frameSelector - Frame selector or name
   */
  async switchToFrame(frameSelector: string): Promise<void> {
    await this.allure.timedStep(`Switch to frame: ${frameSelector}`, async () => {
      const frame = await this.page.frame(frameSelector);
      if (!frame) {
        throw new Error(`Frame '${frameSelector}' not found`);
      }
      
      this.logger.test.step('Switch to Frame Action', 'switchToFrame', {
        frameSelector
      });
    });
  }

  /**
   * Get all text content from elements matching selector
   * @param selector - Element selector
   * @returns Array of text content
   */
  async getAllText(selector: string): Promise<string[]> {
    return await this.allure.timedStep(`Get all text from: ${selector}`, async () => {
      const elements = await this.page.locator(selector).all();
      const texts = await Promise.all(elements.map(el => el.textContent()));
      
      const filteredTexts = texts.filter(text => text !== null) as string[];
      
      this.allure.addParameter('All Text Content', filteredTexts);
      this.logger.test.step('Get All Text Action', 'getAllText', {
        selector,
        count: filteredTexts.length,
        texts: filteredTexts
      });
      
      return filteredTexts;
    });
  }

  /**
   * Press keyboard key
   * @param key - Key to press
   */
  async pressKey(key: string): Promise<void> {
    await this.allure.timedStep(`Press key: ${key}`, async () => {
      await this.page.keyboard.press(key);
      
      this.logger.test.step('Press Key Action', 'pressKey', { key });
    });
  }

  /**
   * Type text using keyboard
   * @param text - Text to type
   * @param delay - Delay between keystrokes
   */
  async typeText(text: string, delay: number = 100): Promise<void> {
    await this.allure.timedStep(`Type text: ${text}`, async () => {
      await this.page.keyboard.type(text, { delay });
      
      this.logger.test.step('Type Text Action', 'typeText', {
        text: text.includes('password') ? '***' : text,
        delay
      });
    });
  }

  /**
   * Get browser console logs
   * @returns Array of console messages
   */
  getConsoleLogs(): string[] {
    const logs: string[] = [];
    
    this.page.on('console', msg => {
      logs.push(`${msg.type()}: ${msg.text()}`);
    });
    
    return logs;
  }

  /**
   * Monitor network requests
   * @param urlPattern - URL pattern to monitor
   * @returns Promise that resolves with request details
   */
  async monitorNetworkRequest(urlPattern: string | RegExp): Promise<any> {
    return new Promise((resolve) => {
      this.page.on('request', request => {
        const url = request.url();
        const matches = typeof urlPattern === 'string' 
          ? url.includes(urlPattern)
          : urlPattern.test(url);
          
        if (matches) {
          resolve({
            url: request.url(),
            method: request.method(),
            headers: request.headers(),
            postData: request.postData()
          });
        }
      });
    });
  }

  /**
   * Wait for network response
   * @param urlPattern - URL pattern to wait for
   * @param timeout - Timeout in milliseconds
   * @returns Response object
   */
  async waitForResponse(urlPattern: string | RegExp, timeout: number = this.timeout): Promise<any> {
    return await this.allure.timedStep(`Wait for response: ${urlPattern}`, async () => {
      const response = await this.page.waitForResponse(urlPattern, { timeout });
      
      const responseData = {
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        headers: response.headers()
      };
      
      this.allure.attachJSON('Network Response', responseData);
      this.logger.test.step('Wait for Response Action', 'waitForResponse', {
        urlPattern: urlPattern.toString(),
        responseData
      });
      
      return response;
    });
  }

  /**
   * Get current viewport size
   * @returns Viewport size
   */
  async getViewportSize(): Promise<{ width: number; height: number } | null> {
    return await this.allure.timedStep('Get viewport size', async () => {
      const viewport = this.page.viewportSize();
      
      this.allure.addParameter('Viewport Size', viewport);
      this.logger.test.step('Get Viewport Size Action', 'getViewportSize', { viewport });
      
      return viewport;
    });
  }

  /**
   * Set viewport size
   * @param width - Viewport width
   * @param height - Viewport height
   */
  async setViewportSize(width: number, height: number): Promise<void> {
    await this.allure.timedStep(`Set viewport size: ${width}x${height}`, async () => {
      await this.page.setViewportSize({ width, height });
      
      this.logger.test.step('Set Viewport Size Action', 'setViewportSize', {
        width,
        height
      });
    });
  }
}