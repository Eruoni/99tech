import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage.js';
import logger from '../config/logger.js';
import { configManager } from '../config/configManager.js';
import type { UserCredentials } from '../types/index.js';

/**
 * Login Page Object for OrangeHRM
 * Handles all login-related functionality and validations
 */
export class LoginPage extends BasePage {
  // Page URL
  private readonly LOGIN_URL = '/web/index.php/auth/login';

  // Selectors - organized by functionality
  private readonly selectors = {
    // Form elements
    usernameInput: '[name="username"]',
    passwordInput: '[name="password"]',
    loginButton: 'button[type="submit"]',
    
    // Page elements
    logoImage: `//*[@class='orangehrm-login-branding']/img`,
    pageTitle: '.orangehrm-login-title',
    
    // Error messages
    errorContainer: '.oxd-alert',
    errorMessage: '.oxd-alert-content-text',
    fieldError: '.oxd-input-field-error-message',
    
    // Loading states
    loadingSpinner: '.oxd-loading-spinner',
    
    // Forgot password
    forgotPasswordLink: `//*[text()='Forgot your password? ']`,
    
    // Success indicators (post-login)
    dashboard: '.oxd-topbar-header-breadcrumb h6',
    userDropdown: '.oxd-userdropdown-name',
    sideMenu: '.oxd-main-menu'
  };

  // Expected text content
  private readonly expectedTexts = {
    pageTitle: 'Login',
    loginButton: 'Login',
    forgotPassword: 'Forgot your password?',
    copyright: 'OrangeHRM, Inc'
  };

  // Error messages mapping
  private readonly errorMessages = {
    invalidCredentials: 'Invalid credentials',
    requiredUsername: 'Required',
    requiredPassword: 'Required',
    emptyCredentials: 'Username cannot be empty',
    accountLocked: 'Account disabled',
    sessionExpired: 'Session Expired'
  };

  constructor(page: Page) {
    super(page);
    
    logger.debug('LoginPage initialized');
  }

  /**
   * Navigate to login page
   * @param waitForLoad - Whether to wait for page load completion
   */
  async navigateToLogin(waitForLoad: boolean = true): Promise<void> {
    await this.allure.timedStep('Navigate to Login Page', async () => {
      await this.navigateTo(this.LOGIN_URL);
      
      if (waitForLoad) {
        await this.waitForLoginPageLoad();
      }
      
      this.allure.addParameter('Login URL', `${this.baseURL}${this.LOGIN_URL}`);
      logger.test.step('Navigate to Login', 'navigation', {
        url: `${this.baseURL}${this.LOGIN_URL}`
      });
    });
  }

  /**
   * Wait for login page to load completely
   */
  async waitForLoginPageLoad(): Promise<void> {
    await this.allure.timedStep('Wait for Login Page Load', async () => {
      // Wait for main form elements
      await Promise.all([
        this.waitForElement(this.selectors.usernameInput),
        this.waitForElement(this.selectors.passwordInput),
        this.waitForElement(this.selectors.loginButton)
      ]);
      
      // Wait for page to be idle
      await this.waitForPageLoad();
      
      logger.debug('Login page loaded successfully');
    });
  }

  /**
   * Check if currently on login page
   * @returns True if on login page
   */
  async isOnLoginPage(): Promise<boolean> {
    return await this.allure.timedStep('Check if on Login Page', async () => {
      const currentUrl = await this.getCurrentUrl();
      const isLoginPage = currentUrl.includes('/auth/login');
      
      this.allure.addParameter('Current URL', currentUrl);
      this.allure.addParameter('Is Login Page', isLoginPage);
      
      return isLoginPage;
    });
  }

  /**
   * Verify login page elements are present and visible
   */
  async verifyLoginPageElements(): Promise<void> {
    await this.allure.timedStep('Verify Login Page Elements', async () => {
      const verifications = [
        { element: 'Username Input', selector: this.selectors.usernameInput },
        { element: 'Password Input', selector: this.selectors.passwordInput },
        { element: 'Login Button', selector: this.selectors.loginButton },
      ];

      for (const verification of verifications) {
        const isVisible = await this.isVisible(verification.selector);
        
        if (!isVisible) {
          throw new Error(`${verification.element} is not visible on login page`);
        }
        
        logger.test.assertion(
          `${verification.element} Visibility`,
          'visible',
          isVisible ? 'visible' : 'hidden',
          isVisible
        );
      }

      this.allure.addStep('All login page elements verified successfully');
    });
  }

  /**
   * Enter username
   * @param username - Username to enter
   * @param clearFirst - Whether to clear field first
   */
  async enterUsername(username: string, clearFirst: boolean = true): Promise<void> {
    await this.allure.timedStep(`Enter Username: ${username}`, async () => {
      if (clearFirst) {
        await this.clearAndFill(this.selectors.usernameInput, username);
      } else {
        await this.fill(this.selectors.usernameInput, username);
      }
      
      // Verify username was entered correctly
      const enteredValue = await this.getValue(this.selectors.usernameInput);
      if (enteredValue !== username) {
        throw new Error(`Username not entered correctly. Expected: ${username}, Actual: ${enteredValue}`);
      }

      this.allure.addParameter('Username Entered', username);
      logger.test.step('Enter Username', 'input', { username });
    });
  }

  /**
   * Enter password
   * @param password - Password to enter
   * @param clearFirst - Whether to clear field first
   */
  async enterPassword(password: string, clearFirst: boolean = true): Promise<void> {
    await this.allure.timedStep('Enter Password', async () => {
      if (clearFirst) {
        await this.clearAndFill(this.selectors.passwordInput, password);
      } else {
        await this.fill(this.selectors.passwordInput, password);
      }
      
      // Verify password field has content (but don't log actual password)
      const enteredValue = await this.getValue(this.selectors.passwordInput);
      if (enteredValue.length !== password.length) {
        throw new Error('Password not entered correctly');
      }

      this.allure.addParameter('Password Entered', '***');
      logger.test.step('Enter Password', 'input', { passwordLength: password.length });
    });
  }

  /**
   * Click login button
   */
  async clickLoginButton(): Promise<void> {
    await this.allure.timedStep('Click Login Button', async () => {
      await this.click(this.selectors.loginButton);
      
      logger.test.step('Click Login Button', 'click', {
        selector: this.selectors.loginButton
      });
    });
  }

  /**
   * Perform login with credentials
   * @param credentials - User credentials
   * @param waitForNavigation - Whether to wait for navigation after login
   */
  async login(credentials: UserCredentials, waitForNavigation: boolean = true): Promise<void> {
    await this.allure.timedStep(`Login with user: ${credentials.username}`, async () => {
      // Enter credentials
      await this.enterUsername(credentials.username);
      await this.enterPassword(credentials.password);
      
      // Click login button
      await this.clickLoginButton();
      
      if (waitForNavigation) {
        await this.waitForLoginSuccess();
      }
      
      this.allure.addParameter('Username', credentials.username);
      this.allure.addParameter('Role', credentials.role || 'Unknown');
      
      logger.test.step('Complete Login', 'authentication', {
        username: credentials.username,
        role: credentials.role,
        waitForNavigation
      });
    });
  }

  /**
   * Quick login using default credentials from config
   */
  async quickLogin(): Promise<void> {
    await this.allure.timedStep('Quick Login with Default Credentials', async () => {
      const credentials: UserCredentials = {
        username: configManager.get('USERNAME'),
        password: configManager.get('PASSWORD'),
        role: 'Admin'
      };
      
      await this.login(credentials);
    });
  }

  /**
   * Wait for successful login indicators
   */
  async waitForLoginSuccess(): Promise<void> {
    await this.allure.timedStep('Wait for Login Success', async () => {
      try {
        // Wait for URL change (dashboard or any authenticated page)
        await this.page.waitForURL('**/dashboard/**', { timeout: 15000 });
      } catch {
        // Fallback: wait for dashboard elements
        await this.waitForElement(this.selectors.dashboard, 'visible', 15000);
      }
      
      // Additional verification - wait for user dropdown to be visible
      await this.waitForElement(this.selectors.userDropdown, 'hidden', 10000);
      
      logger.test.step('Login Success Verified', 'verification', {
        currentUrl: await this.getCurrentUrl()
      });
    });
  }

  /**
   * Check if login was successful
   * @returns True if login was successful
   */
  async isLoginSuccessful(): Promise<boolean> {
    return await this.allure.timedStep('Check Login Success', async () => {
      try {
        const currentUrl = await this.getCurrentUrl();
        const isDashboard = currentUrl.includes('/dashboard/')
        
        const text = await this.getText(this.selectors.dashboard)
        expect(text).toEqual('Dashboard')
        
        this.allure.addParameter('Current URL', currentUrl);
        this.allure.addParameter('Is Dashboard', isDashboard);
        this.allure.addParameter('Login Successful', true);
        
        return true;
      } catch {
        return false;
      }
    });
  }

  /**
   * Get login error message
   * @returns Error message text or null if no error
   */
  async getLoginErrorMessage(): Promise<string | null> {
    return await this.allure.timedStep('Get Login Error Message', async () => {
      try {
        // Wait briefly for error to appear
        await this.waitForElement(this.selectors.errorContainer, 'visible', 3000);
        const errorText = await this.getText(this.selectors.errorMessage);
        
        this.allure.addParameter('Error Message', errorText);
        logger.test.step('Error Message Retrieved', 'error', { errorText });
        
        return errorText;
      } catch {
        // No error message found
        return null;
      }
    });
  }

  /**
   * Check if specific error is displayed
   * @param expectedError - Expected error type
   * @returns True if expected error is displayed
   */
  async hasLoginError(expectedError: keyof typeof this.errorMessages): Promise<boolean> {
    return await this.allure.timedStep(`Check for Error: ${expectedError}`, async () => {
      const errorMessage = await this.getLoginErrorMessage();
      const expectedMessage = this.errorMessages[expectedError];
      const hasError = errorMessage?.includes(expectedMessage) || false;
      
      this.allure.addParameter('Expected Error', expectedMessage);
      this.allure.addParameter('Actual Error', errorMessage || 'None');
      this.allure.addParameter('Error Match', hasError);
      
      return hasError;
    });
  }

  /**
   * Get field validation errors
   * @returns Object with field errors
   */
  async getFieldErrors(): Promise<{ username?: string; password?: string }> {
    return await this.allure.timedStep('Get Field Validation Errors', async () => {
      const errors: { username?: string; password?: string } = {};
      
      // Check for username field error
      try {
        const usernameError = await this.page.locator(this.selectors.usernameInput)
          .locator('../../..')
          .locator(this.selectors.fieldError)
          .textContent();
        if (usernameError) {
          errors.username = usernameError;
        }
      } catch {
        // No username error
      }
      
      // Check for password field error
      try {
        const passwordError = await this.page.locator(this.selectors.passwordInput)
          .locator('../../..')
          .locator(this.selectors.fieldError)
          .textContent();
        if (passwordError) {
          errors.password = passwordError;
        }
      } catch {
        // No password error
      }
      
      this.allure.attachJSON('Field Errors', errors);
      logger.test.step('Field Errors Retrieved', 'validation', { errors });
      
      return errors;
    });
  }

  /**
   * Clear login form
   */
  async clearLoginForm(): Promise<void> {
    await this.allure.timedStep('Clear Login Form', async () => {
      await this.clearAndFill(this.selectors.usernameInput, '');
      await this.clearAndFill(this.selectors.passwordInput, '');
      
      logger.test.step('Login Form Cleared', 'clear', {});
    });
  }

  /**
   * Click forgot password link
   */
  async clickForgotPassword(): Promise<void> {
    await this.allure.timedStep('Click Forgot Password Link', async () => {
      await this.click(this.selectors.forgotPasswordLink);
      
      logger.test.step('Forgot Password Clicked', 'click', {
        selector: this.selectors.forgotPasswordLink
      });
    });
  }

  /**
   * Get page title
   * @returns Page title text
   */
  async getLoginPageTitle(): Promise<string> {
    return await this.allure.timedStep('Get Login Page Title', async () => {
      const title = await this.getTitle();
      
      this.allure.addParameter('Page Title', title);
      logger.test.step('Page Title Retrieved', 'info', { title });
      
      return title;
    });
  }

  /**
   * Verify login button state
   * @returns Button state information
   */
  async getLoginButtonState(): Promise<{
    isVisible: boolean;
    isEnabled: boolean;
    text: string;
  }> {
    return await this.allure.timedStep('Get Login Button State', async () => {
      const [isVisible, isEnabled, text] = await Promise.all([
        this.isVisible(this.selectors.loginButton),
        this.isEnabled(this.selectors.loginButton),
        this.getText(this.selectors.loginButton)
      ]);
      
      const buttonState = { isVisible, isEnabled, text };
      
      this.allure.attachJSON('Login Button State', buttonState);
      logger.test.step('Login Button State Retrieved', 'info', { buttonState });
      
      return buttonState;
    });
  }

  /**
   * Take screenshot of login page
   * @param name - Screenshot name
   * @returns Screenshot path
   */
  async takeLoginScreenshot(name: string = 'login_page'): Promise<Buffer> {
    return await this.allure.timedStep(`Take Login Screenshot: ${name}`, async () => {
      const screenshot = await this.takeScreenshot(name, true);
      
      logger.test.screenshot(name, `${name}_${Date.now()}.png`);
      
      return screenshot;
    });
  }

  /**
   * Verify login page accessibility
   */
  async verifyLoginPageAccessibility(): Promise<void> {
    await this.allure.timedStep('Verify Login Page Accessibility', async () => {
      // Check for proper form labels and structure
      const accessibilityChecks = [
        { name: 'Username field has proper labeling', check: async () => {
          const usernameLabel = await this.getAttribute(this.selectors.usernameInput, 'placeholder');
          return usernameLabel?.toLowerCase().includes('username') || false;
        }},
        { name: 'Password field has proper labeling', check: async () => {
          const passwordLabel = await this.getAttribute(this.selectors.passwordInput, 'placeholder');
          return passwordLabel?.toLowerCase().includes('password') || false;
        }},
        { name: 'Login button is keyboard accessible', check: async () => {
          const tabIndex = await this.getAttribute(this.selectors.loginButton, 'tabindex');
          return tabIndex !== '-1';
        }}
      ];

      for (const accessibilityCheck of accessibilityChecks) {
        const result = await accessibilityCheck.check();
        
        this.allure.addParameter(accessibilityCheck.name, result ? 'PASS' : 'FAIL');
        
        if (!result) {
          logger.warn('Accessibility check failed', {
            check: accessibilityCheck.name
          });
        }
      }
      
      logger.test.step('Accessibility Verification', 'accessibility', {
        checksPerformed: accessibilityChecks.length
      });
    });
  }

  /**
   * Perform login with invalid credentials and verify error
   * @param username - Invalid username
   * @param password - Invalid password
   * @param expectedError - Expected error type
   */
  async loginWithInvalidCredentials(
    username: string,
    password: string,
    expectedError: keyof typeof this.errorMessages = 'invalidCredentials'
  ): Promise<void> {
    await this.allure.timedStep(`Login with Invalid Credentials`, async () => {
      // Clear form first
      await this.clearLoginForm();
      
      // Enter invalid credentials
      await this.enterUsername(username);
      await this.enterPassword(password);
      
      // Click login
      await this.clickLoginButton();
      
      // Wait for and verify error
      const hasExpectedError = await this.hasLoginError(expectedError);
      
      if (!hasExpectedError) {
        const actualError = await this.getLoginErrorMessage();
        throw new Error(`Expected error '${expectedError}' not found. Actual error: ${actualError}`);
      }
      
      this.allure.addParameter('Invalid Username', username);
      this.allure.addParameter('Expected Error', expectedError);
      
      logger.test.step('Invalid Login Verified', 'negative_test', {
        username,
        expectedError,
        success: hasExpectedError
      });
    });
  }

  // Assertion methods for better test readability

  /**
   * Assert user is on login page
   */
  async shouldBeOnLoginPage(): Promise<void> {
    await this.expectToHaveUrl(/.*\/auth\/login/);
    await this.expectToBeVisible(this.selectors.loginButton);
  }

  /**
   * Assert login was successful
   */
  async shouldBeLoggedIn(): Promise<void> {
    await this.expectToHaveUrl(/.*\/dashboard|.*\/pim|.*\/admin/);
    await this.expectToBeVisible(this.selectors.userDropdown);
  }

  /**
   * Assert specific error message is displayed
   * @param errorType - Type of error to check
   */
  async shouldShowError(errorType: keyof typeof this.errorMessages): Promise<void> {
    const hasError = await this.hasLoginError(errorType);
    expect(hasError).toBe(true);
  }

  /**
   * Assert login form is empty
   */
  async shouldHaveEmptyForm(): Promise<void> {
    await this.expectToHaveValue(this.selectors.usernameInput, '');
    await this.expectToHaveValue(this.selectors.passwordInput, '');
  }
}