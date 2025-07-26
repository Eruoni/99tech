// Environment types
export interface Environment {
    BROWSER: 'chromium' | 'firefox' | 'webkit' | 'mobile' | 'mobile-safari';
    BASE_URL: string;
    API_BASE_URL: string;
    USERNAME: string;
    PASSWORD: string;
    HEADLESS: boolean;
    VIEWPORT_WIDTH: number;
    VIEWPORT_HEIGHT: number;
    TIMEOUT: number;
    API_TIMEOUT: number;
    WORKERS: number;
    ALLURE_RESULTS_DIR: string;
    ALLURE_REPORT_DIR: string;
    LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
    LOG_TO_FILE: boolean;
    LOG_TO_CONSOLE: boolean;
    PAGE_LOAD_THRESHOLD: number;
    API_RESPONSE_THRESHOLD: number;
    TEST_SUITE: 'ui' | 'api' | 'regression' | 'performance' | 'all';
  }
  
  // API Response types
  export interface ApiResponse<T = any> {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: T;
    responseTime: number;
  }
  
  // HTTP Method types
  export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  
  // Request options types
  export interface RequestOptions {
    headers?: Record<string, string>;
    params?: Record<string, any>;
    timeout?: number;
  }
  
  // Form data types
  export interface FormData {
    [key: string]: string | number | boolean;
  }
  
  // Test result types
  export interface TestResult {
    testName: string;
    suite: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
    error?: string;
    screenshot?: string;
  }
  
  // Performance metrics types
  export interface PerformanceMetric {
    action: string;
    duration: number;
    threshold: number;
    passed: boolean;
    timestamp: string;
  }
  
  // Logger types
  export interface LogContext {
    [key: string]: any;
  }
  
  export interface TestLogMethods {
    start: (testName: string, suite: string) => void;
    end: (testName: string, suite: string, status: string, duration: number) => void;
    step: (stepName: string, action: string, details?: LogContext) => void;
    api: (method: string, url: string, status: number, responseTime: number, requestData?: any, responseData?: any) => void;
    performance: (action: string, duration: number, threshold: number) => void;
    error: (error: Error, context?: LogContext) => void;
    screenshot: (testName: string, screenshotPath: string) => void;
    assertion: (assertion: string, expected: any, actual: any, passed: boolean) => void;
  }
  
  // Page interaction types
  export interface ClickOptions {
    button?: 'left' | 'right' | 'middle';
    clickCount?: number;
    delay?: number;
    force?: boolean;
    modifiers?: ('Alt' | 'Control' | 'Meta' | 'Shift')[];
    noWaitAfter?: boolean;
    position?: { x: number; y: number };
    timeout?: number;
    trial?: boolean;
  }
  
  export interface FillOptions {
    force?: boolean;
    noWaitAfter?: boolean;
    timeout?: number;
  }
  
  export interface TypeOptions {
    delay?: number;
    noWaitAfter?: boolean;
    timeout?: number;
  }
  
  export interface SelectOption {
    value?: string;
    label?: string;
    index?: number;
  }
  
  // Employee data types
  export interface Employee {
    employeeId?: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    email?: string;
    phone?: string;
    address?: Address;
    jobDetails?: JobDetails;
  }
  
  export interface Address {
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  }
  
  export interface JobDetails {
    jobTitle?: string;
    department?: string;
    supervisor?: string;
    location?: string;
    employmentStatus?: string;
    joinedDate?: string;
  }
  
  // User credentials types
  export interface UserCredentials {
    username: string;
    password: string;
    role?: string;
  }
  
  // Navigation types
  export interface NavigationOptions {
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
    timeout?: number;
    referer?: string;
  }
  
  // Allure types
  export interface AllureStepOptions {
    name: string;
    status?: 'passed' | 'failed' | 'broken' | 'skipped';
  }
  
  export interface AllureAttachment {
    name: string;
    content: string | Buffer;
    type: string;
  }
  
  export interface AllureLabel {
    name: string;
    value: string;
  }
  
  export interface AllureLink {
    url: string;
    name: string;
    type: 'issue' | 'tms' | 'link';
  }
  
  // Test suite types
  export type TestSuite = 'ui' | 'api' | 'regression' | 'performance';
  
  export interface TestSuiteConfig {
    name: TestSuite;
    tags: string[];
    timeout: number;
    retries: number;
    parallel: boolean;
  }
  
  // Browser types
  export interface BrowserConfig {
    name: string;
    headless: boolean;
    viewport: {
      width: number;
      height: number;
    };
    userAgent?: string;
    deviceScaleFactor?: number;
    isMobile?: boolean;
    hasTouch?: boolean;
  }
  
  // Wait conditions
  export type WaitCondition = 'visible' | 'hidden' | 'attached' | 'detached';
  
  // Element state types
  export interface ElementState {
    visible: boolean;
    enabled: boolean;
    checked?: boolean;
    focused?: boolean;
    selected?: boolean;
  }
  
  // Cookie types
  export interface Cookie {
    name: string;
    value: string;
    domain?: string;
    path?: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
  }
  
  // Test data types
  export interface TestData {
    users: UserCredentials[];
    employees: Employee[];
    testUrls: Record<string, string>;
    apiEndpoints: Record<string, string>;
  }
  
  // Configuration types
  export interface FrameworkConfig {
    environment: Partial<Environment>;
    browser: BrowserConfig;
    logging: {
      level: string;
      toFile: boolean;
      toConsole: boolean;
    };
    reporting: {
      allure: boolean;
      html: boolean;
      json: boolean;
    };
    performance: {
      pageLoadThreshold: number;
      apiResponseThreshold: number;
    };
  }
  
  // Error types
  export interface TestError {
    message: string;
    stack?: string;
    screenshot?: string;
    video?: string;
    trace?: string;
  }
  
  // Custom matcher types (for Jasmine extensions)
  declare global {
    namespace jasmine {
      interface Matchers<T> {
        toBeVisibleOnPage(): Promise<boolean>;
        toHaveCorrectApiResponse(expectedStatus: number): Promise<boolean>;
        toLoadWithinThreshold(threshold: number): Promise<boolean>;
      }
    }
  }
  
  // Utility types
  export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
  };
  
  export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = 
    Pick<T, Exclude<keyof T, Keys>> & 
    { [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>> }[Keys];
  
  export type Awaitable<T> = T | Promise<T>;