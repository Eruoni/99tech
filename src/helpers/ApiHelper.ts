import { request, APIRequestContext } from '@playwright/test';
import { AllureHelper } from './AllureHelper.js';
import logger from '../config/logger.js';
import type { 
  ApiResponse, 
  HttpMethod, 
  RequestOptions, 
  FormData,
  Cookie 
} from '../types/index.js';

export class ApiHelper {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private context: APIRequestContext | null = null;
  private allure: AllureHelper;
  private logger = logger;

  constructor(baseURL: string = process.env.API_BASE_URL || 'https://opensource-demo.orangehrmlive.com/web/api/v1') {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    //   'User-Agent': 'OrangeHRM-TestFramework/1.0'
    };
    this.allure = new AllureHelper();
    
    this.logger.debug('ApiHelper initialized', {
      baseURL: this.baseURL,
      defaultHeaders: this.defaultHeaders
    });
  }

  /**
   * Initialize API context
   */
  async init(): Promise<APIRequestContext> {
    this.logger.info('Initializing API context', { baseURL: this.baseURL });
    
    try {
      this.context = await request.newContext({
        baseURL: this.baseURL,
        timeout: parseInt(process.env.API_TIMEOUT || '10000'),
        ignoreHTTPSErrors: true,
        extraHTTPHeaders: this.defaultHeaders
      });
      
      this.logger.info('API context initialized successfully');
      return this.context;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to initialize API context', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error(`Failed to initialize API context: ${errorMessage}`);
    }
  }

  /**
   * Generate headers based on provided fields
   * @param fields - Additional header fields
   * @returns Complete headers object
   */
  generateHeader(fields: Record<string, string> = {}): Record<string, string> {
    const headers = { ...this.defaultHeaders };
    
    // Merge additional fields
    Object.entries(fields).forEach(([key, value]) => {
      headers[key] = value;
    });

    this.logger.debug('Generated headers', { headers });
    this.allure.addStep(`Generated headers: ${JSON.stringify(headers)}`);
    return headers;
  }

  /**
   * Set authentication token in headers
   * @param token - Bearer token
   */
  setAuthToken(token: string): void {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
    this.logger.info('Authentication token set', {
      tokenPrefix: token.substring(0, 10) + '...'
    });
    this.allure.addStep(`Set authentication token: ${token.substring(0, 10)}...`);
  }

  /**
   * Remove authentication token from headers
   */
  removeAuthToken(): void {
    delete this.defaultHeaders['Authorization'];
    this.logger.info('Authentication token removed');
    this.allure.addStep('Removed authentication token');
  }

  /**
   * Set session cookies for authentication
   * @param cookies - Array of cookie objects
   */
  /**
   * Set session cookies for authentication via Cookie header
   * @param cookies - Array of cookie objects
   */
  async setCookies(cookies: Cookie[]): Promise<void> {
    if (!this.context) {
      throw new Error('API context not initialized. Call init() first.');
    }

    // Convert cookies to Cookie header format
    const cookieHeader = cookies.map(cookie => 
      `${cookie.name}=${cookie.value}`
    ).join('; ');
    
    this.defaultHeaders['Cookie'] = cookieHeader;
    
    this.logger.info('Session cookies set', {
      cookieCount: cookies.length,
      cookieNames: cookies.map(c => c.name)
    });
    this.allure.addStep(`Set ${cookies.length} cookies for authentication`);
  }

  /**
   * Clear all cookies
   */
  async clearCookies(): Promise<void> {
    if (!this.context) {
      throw new Error('API context not initialized. Call init() first.');
    }

    // Remove Cookie header
    delete this.defaultHeaders['Cookie'];
    
    this.logger.info('All cookies cleared');
    this.allure.addStep('Cleared all cookies');
  }

  /**
   * Generic request method
   * @param method - HTTP method
   * @param endpoint - API endpoint
   * @param data - Request body data
   * @param options - Request options
   * @returns Response object
   */
  private async makeRequest<T = any>(
    method: HttpMethod,
    endpoint: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    if (!this.context) {
      throw new Error('API context not initialized. Call init() first.');
    }

    const startTime = Date.now();
    const headers = this.generateHeader(options.headers || {});
    const fullUrl = `${this.baseURL}${endpoint}`;
    
    this.logger.info(`Making ${method} request`, {
      url: fullUrl,
      headers,
      data: method !== 'GET' ? data : undefined,
      params: options.params
    });
    
    this.allure.addStep(`${method} Request to: ${fullUrl}`);
    
    if (data && method !== 'GET') {
      this.allure.attachJSON('Request Body', data);
    }
    
    try {
      let response;
      const requestConfig = {
        headers,
        params: options.params,
        timeout: options.timeout,
        ...options
      };

      switch (method) {
        case 'GET':
          response = await this.context.get(endpoint, requestConfig);
          break;
        case 'POST':
          response = await this.context.post(endpoint, {
            ...requestConfig,
            data: JSON.stringify(data)
          });
          break;
        case 'PUT':
          response = await this.context.put(endpoint, {
            ...requestConfig,
            data: JSON.stringify(data)
          });
          break;
        case 'DELETE':
          response = await this.context.delete(endpoint, requestConfig);
          break;
        case 'PATCH':
          response = await this.context.patch(endpoint, {
            ...requestConfig,
            data: JSON.stringify(data)
          });
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      const responseData: ApiResponse<T> = {
        status: response.status(),
        statusText: response.statusText(),
        headers: response.headers(),
        body: null as any,
        responseTime
      };

      // Try to parse response as JSON, fallback to text
      try {
        responseData.body = await response.json();
      } catch (e) {
        responseData.body = await response.text() as any;
      }

      this.logger.test.api(method, fullUrl, responseData.status, responseTime, 
        method !== 'GET' ? data : options.params, responseData.body);
      
      this.allure.addStep(`Response Status: ${responseData.status}`);
      this.allure.attachApiResponse(responseData.body, method !== 'GET' ? data : undefined);

      // Check response time against threshold
      const threshold = parseInt(process.env.API_RESPONSE_THRESHOLD || '3000');
      if (responseTime > threshold) {
        this.logger.warn('API response time exceeded threshold', {
          url: fullUrl,
          responseTime,
          threshold
        });
      }

      return responseData;
    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.logger.error(`${method} request failed`, {
        url: fullUrl,
        data: method !== 'GET' ? data : undefined,
        error: errorMessage,
        responseTime
      });
      
      this.allure.addStep(`${method} Request Failed: ${errorMessage}`, 'failed');
      throw new Error(`${method} request to ${fullUrl} failed: ${errorMessage}`);
    }
  }

  /**
   * Generic GET request
   * @param endpoint - API endpoint
   * @param options - Request options
   * @returns Response object
   */
  async get<T = any>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('GET', endpoint, undefined, options);
  }

  /**
   * Generic POST request
   * @param endpoint - API endpoint
   * @param data - Request body data
   * @param options - Request options
   * @returns Response object
   */
  async post<T = any>(endpoint: string, data: any = {}, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('POST', endpoint, data, options);
  }

  /**
   * Generic PUT request
   * @param endpoint - API endpoint
   * @param data - Request body data
   * @param options - Request options
   * @returns Response object
   */
  async put<T = any>(endpoint: string, data: any = {}, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('PUT', endpoint, data, options);
  }

  /**
   * Generic DELETE request
   * @param endpoint - API endpoint
   * @param options - Request options
   * @returns Response object
   */
  async delete<T = any>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('DELETE', endpoint, undefined, options);
  }

  /**
   * Generic PATCH request
   * @param endpoint - API endpoint
   * @param data - Request body data
   * @param options - Request options
   * @returns Response object
   */
  async patch<T = any>(endpoint: string, data: any = {}, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('PATCH', endpoint, data, options);
  }

  /**
   * Form data POST request
   * @param endpoint - API endpoint
   * @param formData - Form data
   * @param options - Request options
   * @returns Response object
   */
  async postForm<T = any>(endpoint: string, formData: FormData = {}, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    if (!this.context) {
      throw new Error('API context not initialized. Call init() first.');
    }

    const startTime = Date.now();
    const headers = this.generateHeader({
      'Content-Type': 'application/x-www-form-urlencoded',
      ...options.headers
    });
    const fullUrl = `${this.baseURL}${endpoint}`;
    
    this.logger.info('Making POST Form request', {
      url: fullUrl,
      headers,
      formData
    });
    
    this.allure.addStep(`POST Form Request to: ${fullUrl}`);
    this.allure.attachJSON('Form Data', formData);
    
    try {
      const response = await this.context.post(endpoint, {
        headers,
        form: formData,
        timeout: options.timeout,
        ...options
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      const responseData: ApiResponse<T> = {
        status: response.status(),
        statusText: response.statusText(),
        headers: response.headers(),
        body: null as any,
        responseTime
      };

      try {
        responseData.body = await response.json();
      } catch (e) {
        responseData.body = await response.text() as any;
      }

      this.logger.test.api('POST', fullUrl, responseData.status, responseTime, 
        formData, responseData.body);
      
      this.allure.addStep(`Response Status: ${responseData.status}`);
      this.allure.attachJSON('Response Body', responseData.body);

      return responseData;
    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.logger.error('POST Form request failed', {
        url: fullUrl,
        formData,
        error: errorMessage,
        responseTime
      });
      
      this.allure.addStep(`POST Form Request Failed: ${errorMessage}`, 'failed');
      throw new Error(`POST Form request to ${fullUrl} failed: ${errorMessage}`);
    }
  }

  /**
   * Upload file via POST request
   * @param endpoint - API endpoint
   * @param filePath - Path to file to upload
   * @param fieldName - Form field name for the file
   * @param additionalFields - Additional form fields
   * @param options - Request options
   * @returns Response object
   */
  async uploadFile<T = any>(
    endpoint: string, 
    filePath: string, 
    fieldName: string = 'file',
    additionalFields: Record<string, string> = {},
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    if (!this.context) {
      throw new Error('API context not initialized. Call init() first.');
    }

    const startTime = Date.now();
    const headers = this.generateHeader({
      // Don't set Content-Type for multipart/form-data, let the browser set it
      ...options.headers
    });
    delete headers['Content-Type'];
    
    const fullUrl = `${this.baseURL}${endpoint}`;
    
    this.logger.info('Making file upload request', {
      url: fullUrl,
      filePath,
      fieldName,
      additionalFields
    });
    
    this.allure.addStep(`File Upload Request to: ${fullUrl}`);
    this.allure.addParameter('File Path', filePath);
    this.allure.addParameter('Field Name', fieldName);
    
    try {
      const response = await this.context.post(endpoint, {
        headers,
        multipart: {
          [fieldName]: {
            name: filePath.split('/').pop() || 'file',
            mimeType: 'application/octet-stream',
            buffer: require('fs').readFileSync(filePath)
          },
          ...additionalFields
        },
        timeout: options.timeout || 60000, // Longer timeout for file uploads
        ...options
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      const responseData: ApiResponse<T> = {
        status: response.status(),
        statusText: response.statusText(),
        headers: response.headers(),
        body: null as any,
        responseTime
      };

      try {
        responseData.body = await response.json();
      } catch (e) {
        responseData.body = await response.text() as any;
      }

      this.logger.test.api('POST', fullUrl, responseData.status, responseTime, 
        { filePath, fieldName, additionalFields }, responseData.body);
      
      this.allure.addStep(`Response Status: ${responseData.status}`);
      this.allure.attachJSON('Response Body', responseData.body);

      return responseData;
    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.logger.error('File upload request failed', {
        url: fullUrl,
        filePath,
        error: errorMessage,
        responseTime
      });
      
      this.allure.addStep(`File Upload Request Failed: ${errorMessage}`, 'failed');
      throw new Error(`File upload to ${fullUrl} failed: ${errorMessage}`);
    }
  }

  /**
   * Health check endpoint
   * @param endpoint - Health check endpoint (optional)
   * @returns Response object
   */
  async healthCheck(endpoint: string = '/health'): Promise<ApiResponse> {
    this.logger.info('Performing health check', { endpoint });
    return this.get(endpoint);
  }

  /**
   * Validate response status
   * @param response - API response
   * @param expectedStatus - Expected status code
   * @param errorMessage - Custom error message
   */
  validateStatus(response: ApiResponse, expectedStatus: number, errorMessage?: string): void {
    const message = errorMessage || `Expected status ${expectedStatus}, but got ${response.status}`;
    
    if (response.status !== expectedStatus) {
      this.logger.error('Status validation failed', {
        expected: expectedStatus,
        actual: response.status,
        statusText: response.statusText,
        body: response.body
      });
      
      this.allure.addStep(`Status validation failed: ${message}`, 'failed');
      throw new Error(message);
    }
    
    this.logger.debug('Status validation passed', {
      expected: expectedStatus,
      actual: response.status
    });
    
    this.allure.addStep(`Status validation passed: ${expectedStatus}`);
  }

  /**
   * Validate response contains expected data
   * @param response - API response
   * @param expectedData - Expected data in response body
   * @param path - JSONPath to the data (optional)
   */
  validateResponseData(response: ApiResponse, expectedData: any, path?: string): void {
    let actualData = response.body;
    
    if (path) {
      // Simple path navigation (e.g., "data.users[0].name")
      const pathParts = path.split('.');
      for (const part of pathParts) {
        if (part.includes('[') && part.includes(']')) {
          const [prop, indexStr] = part.split('[');
          const index = parseInt(indexStr.replace(']', ''));
          actualData = actualData[prop][index];
        } else {
          actualData = actualData[part];
        }
      }
    }
    
    if (JSON.stringify(actualData) !== JSON.stringify(expectedData)) {
      this.logger.error('Response data validation failed', {
        expected: expectedData,
        actual: actualData,
        path: path
      });
      
      this.allure.addStep('Response data validation failed', 'failed');
      this.allure.attachJSON('Expected Data', expectedData);
      this.allure.attachJSON('Actual Data', actualData);
      
      throw new Error(`Response data validation failed. Expected: ${JSON.stringify(expectedData)}, Actual: ${JSON.stringify(actualData)}`);
    }
    
    this.logger.debug('Response data validation passed');
    this.allure.addStep('Response data validation passed');
  }

  /**
   * Wait for API endpoint to become available
   * @param endpoint - API endpoint to check
   * @param timeout - Maximum wait time in milliseconds
   * @param interval - Check interval in milliseconds
   * @returns True if endpoint becomes available, false if timeout
   */
  async waitForEndpoint(endpoint: string, timeout: number = 30000, interval: number = 1000): Promise<boolean> {
    const startTime = Date.now();
    
    this.logger.info('Waiting for endpoint to become available', {
      endpoint,
      timeout,
      interval
    });
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await this.get(endpoint);
        if (response.status < 500) {
          this.logger.info('Endpoint is available', {
            endpoint,
            status: response.status,
            waitTime: Date.now() - startTime
          });
          return true;
        }
      } catch (error) {
        // Continue waiting
      }
      
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    this.logger.warn('Endpoint did not become available within timeout', {
      endpoint,
      timeout,
      actualWaitTime: Date.now() - startTime
    });
    
    return false;
  }

  /**
   * Get current cookies from the default headers
   * @returns Array of cookies
   */
  async getCookies(): Promise<Cookie[]> {
    if (!this.context) {
      throw new Error('API context not initialized. Call init() first.');
    }

    const cookieHeader = this.defaultHeaders['Cookie'];
    if (!cookieHeader) {
      this.logger.debug('No cookies found in headers');
      return [];
    }

    // Parse Cookie header into Cookie objects
    const cookies: Cookie[] = cookieHeader.split('; ').map(cookieStr => {
      const [name, value] = cookieStr.split('=');
      return {
        name: name.trim(),
        value: value?.trim() || ''
      };
    });

    this.logger.debug('Retrieved cookies from headers', { cookieCount: cookies.length });
    return cookies;
  }

  /**
   * Set custom header for all subsequent requests
   * @param key - Header key
   * @param value - Header value
   */
  setHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value;
    this.logger.debug('Custom header set', { key, value });
    this.allure.addStep(`Set custom header: ${key} = ${value}`);
  }

  /**
   * Remove custom header
   * @param key - Header key to remove
   */
  removeHeader(key: string): void {
    delete this.defaultHeaders[key];
    this.logger.debug('Custom header removed', { key });
    this.allure.addStep(`Removed custom header: ${key}`);
  }

  /**
   * Get response time for the last request
   * @returns Response time in milliseconds
   */
  getLastResponseTime(): number {
    // This would need to be tracked in the makeRequest method
    // For now, return 0 as placeholder
    return 0;
  }

  /**
   * Clean up API context
   */
  async dispose(): Promise<void> {
    if (this.context) {
      await this.context.dispose();
      this.context = null;
      this.logger.info('API context disposed');
      this.allure.addStep('API context disposed');
    }
  }
}