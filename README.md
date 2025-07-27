# 99tech# End-to-End Automation Framework

A comprehensive, modern test automation framework built with **Playwright** and **TypeScript**, designed for scalability, maintainability, and seamless CI/CD integration.

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation & Setup

1. **Clone and Install Dependencies**

   ```bash
   git clone https://github.com/Eruoni/99tech.git
   cd 99tech
   npm install
   ```

2. **Install Playwright Browsers**

   ```bash
   npm run install:browsers
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:

   ```bash
   # Application URLs
   BASE_URL=https://opensource-demo.orangehrmlive.com
   API_BASE_URL=https://example.com

   # Default Credentials (for quick access)
   USERNAME=Admin
   PASSWORD=admin123

   # Browser Configuration
   BROWSER=chromium
   HEADLESS=true
   VIEWPORT_WIDTH=1280
   VIEWPORT_HEIGHT=720

   # Execution Configuration
   WORKERS=4
   TIMEOUT=30000
   API_TIMEOUT=10000

   # Performance Thresholds
   PAGE_LOAD_THRESHOLD=5000
   API_RESPONSE_THRESHOLD=3000

   # Logging Configuration
   LOG_LEVEL=info
   LOG_TO_FILE=true
   LOG_TO_CONSOLE=true

   # Test Suite Selection
   TEST_SUITE=all
   ```

### Execution Commands

```bash
# Run all tests
npm run test:all

# Run specific test suites
npm run test:ui          # UI tests only
npm run test:api         # API tests only
npm run test:regression  # Regression tests
npm run test:performance # Performance tests

# Run tests in headed mode (visible browser)
npm run test:headed

# Debug mode
npm run test:debug

# Generate and view reports
npm run report           # Generate and open Allure report
npm run allure:generate  # Generate Allure report
npm run allure:open      # Open existing report
npm run allure:serve     # Generate and serve report

# Cleanup
npm run clean            # Clean all artifacts and logs
npm run clean:logs       # Clean logs only
```

---

## 🏗️ Framework Architecture & Design Rationale

My framework is architected to satisfy all modern testing requirements through four core modules, each designed with specific capabilities and extensibility in mind. The framework supports both **structural step-by-step testing** and **dynamic data-driven testing**, providing comprehensive coverage for all test levels and scenarios.

### 🎯 Test Architecture Approaches

#### **Structural Step-by-Step Testing** (`login.spec.ts`)

Traditional, explicit test structure for critical user journeys:

```typescript
test("Should login successfully with valid admin credentials", async () => {
  // Step 1: Navigate to login page
  await loginPage.navigateToLogin();

  // Step 2: Verify page elements
  await loginPage.verifyLoginPageElements();

  // Step 3: Perform login
  await loginPage.login(adminCredentials);

  // Step 4: Verify success
  await loginPage.shouldBeLoggedIn();
});
```

**Benefits:**

- **Explicit Flow**: Clear, readable test steps for critical business functions
- **Debug-Friendly**: Easy to identify failure points in user journeys
- **Documentation**: Tests serve as living documentation of user workflows
- **Stakeholder Communication**: Non-technical stakeholders can understand test logic

#### **Dynamic Data-Driven Testing** (`search.spec.ts`)

JSON-powered dynamic test generation for comprehensive coverage:

```typescript
// Dynamic test generation from nav-options.json
roles.forEach((role) => {
  roleOptions.forEach((option: string) => {
    test(`Verify Search function work correctly: ${role} - ${option}`, async ({ page }) => {
      // Dynamic method calling based on data
      const methodName = `is${option.replace(/\s+/g, "")}OptionDisplay`;
      const method = (nav as any)[methodName];
      if (typeof method === "function") {
        const isTruth = await method.bind(nav)();
        expect(isTruth).toBeTruthy();
      } else {
        throw new Error(`Method ${methodName} not found in Nav class`);
      }
    });
  });
});
```

**Capabilities:**

- **Scalable Test Generation**: Hundreds of tests from single JSON file
- **Data-Driven Coverage**: Automatic test creation from business data
- **Future XML Support**: Designed for easy extension to XML data sources
- **Maintainability**: Add new test scenarios by updating data files only

#### **Comprehensive Test Level Coverage**

My framework addresses all testing pyramid levels (except Unit Test, I expect it belongs to developer's project):

**Integration Level:**

- API endpoint testing with authentication flows
- Cross-browser compatibility validation
- Data layer integration testing

**System Level:**

- End-to-end user journey testing
- Cross-module functionality validation
- Performance and load testing

**Acceptance Level:**

- Business scenario validation
- User role-based access testing
- Stakeholder requirement verification

### 1. 📁 Project Structure - Multi-Type Testing Support

```
99tech/
├── src/
│   ├── pages/           # Page Object Models
│   ├── helpers/         # Utility helpers (Allure, API)
│   ├── utils/           # Test utilities and data management
│   ├── config/          # Configuration management
│   ├── setup/           # Global setup/teardown
│   └── types/           # TypeScript type definitions
├── tests/
│   ├── ui/              # UI test specifications
│   ├── api/             # API test specifications
│   ├── regression/      # Regression test suites
│   └── performance/     # Performance test scenarios
├── test-data/           # Test data management
└── playwright.config.ts # Central configuration
```

#### **UI Testing Capabilities**

- **Page Object Model (POM)**: Implemented through `BasePage.ts` providing reusable UI interaction methods
- **Dynamic Element Handling**: Methods like `waitForElement()`, `elementExists()`, `getElementCount()`
- **Cross-browser Support**: Configured for Chromium, Firefox, WebKit, and mobile browsers
- **Responsive Testing**: Multiple viewport configurations and device emulation

#### **API Testing Integration**

My `ApiHelper.ts` provides comprehensive API testing capabilities:

```typescript
// Dynamic API method generation
async makeRequest<T>(method: HttpMethod, endpoint: string, data?: any): Promise<ApiResponse<T>>

// Support for all HTTP methods
await apiHelper.get('/employees');
await apiHelper.post('/users', userData);
await apiHelper.put('/employee/123', updateData);
await apiHelper.delete('/employee/123');

// Advanced features
await apiHelper.uploadFile('/upload', 'path/to/file.pdf');
await apiHelper.postForm('/form-submit', formData);
```

**Dynamic API Coverage**: My method-based approach allows for:

- Runtime endpoint discovery
- Dynamic payload generation
- Response validation and schema checking
- Performance monitoring with configurable thresholds

#### **Regression Testing Framework**

- **Tag-based Test Organization**: Using `@regression`, `@smoke`, `@critical` tags
- **Data-driven Testing**: JSON-based test data management
- **Environment-specific Testing**: Different configurations per environment
- **Parallel Execution**: Worker-based parallel test execution

#### **Performance Testing Integration**

- **Built-in Performance Monitoring**: Every page load and API call is monitored
- **Configurable Thresholds**: Set via `PAGE_LOAD_THRESHOLD` and `API_RESPONSE_THRESHOLD`
- **Automatic Reporting**: Performance metrics included in test reports
- **Resource Monitoring**: Memory, network, and timing metrics collection

### 2. 🔄 CI/CD Integration Potential

My framework is designed for seamless CI/CD integration through comprehensive environment configuration:

#### **Environment Variable Strategy**

```typescript
// Flexible browser configuration
BROWSER=chromium|firefox|webkit|mobile|mobile-safari

// Environment-specific execution
WORKERS=1          # Sequential execution in CI
HEADLESS=true      # Headless mode for CI pipelines
TEST_SUITE=regression  # Target specific test suites

// Reporting configuration
ALLURE_RESULTS_DIR=allure-results
ALLURE_REPORT_DIR=allure-report
```

#### **CI/CD Pipeline Support**

- **Docker Compatibility**: Configured for containerized execution
- **Parallel Execution Control**: Worker configuration based on CI environment
- **Artifact Management**: Automatic screenshot, video, and trace collection
- **Multiple Report Formats**: Allure, HTML, JSON, and JUnit XML output

#### **Environment Detection & Configuration**

```typescript
// Automatic CI detection
isCI(): boolean {
  return !!(
    process.env.CI ||
    process.env.GITHUB_ACTIONS ||
    process.env.JENKINS_URL ||
    process.env.BUILDKITE ||
    process.env.CIRCLECI
  );
}

// CI-specific optimizations
workers: process.env.CI ? 1 : env.WORKERS,
retries: process.env.CI ? 2 : 1,
```

#### **Multi-Environment Support**

- **Environment-specific Test Data**: `dev.json`, `staging.json`, `production.json`
- **Dynamic Configuration Loading**: Based on `TEST_ENV` variable
- **Credential Management**: Secure handling of environment-specific credentials

### 3. 📝 Logging System - Winston Integration

My logging system is built on **Winston**, providing enterprise-grade logging capabilities:

#### **Multi-Level Logging Architecture**

```typescript
const logLevels = {
  error: 0, // Critical errors and failures
  warn: 1, // Warnings and potential issues
  info: 2, // General information and test progress
  debug: 3, // Detailed debugging information
  verbose: 4, // Maximum detail for troubleshooting
};
```

#### **Multiple Output Targets**

- **Console Logging**: Real-time output with color-coding for development
- **File Logging**: Persistent storage for analysis and debugging
  - `combined.log`: All log levels
  - `error.log`: Error-specific logs
  - `debug.log`: Debug information
  - `test-execution.log`: Test-specific structured logging

#### **Structured Test Logging**

My custom `TestLogMethods` interface provides specialized logging:

```typescript
logger.test.start("Test Name", "Suite Name");
logger.test.step("Step Description", "action", { details });
logger.test.api("POST", "/api/users", 201, 150, requestData, responseData);
logger.test.performance("Page Load", 2500, 5000);
logger.test.assertion("Element Visible", "visible", "visible", true);
logger.test.end("Test Name", "Suite Name", "passed", 5000);
```

#### **CI/CD Logging Benefits**

- **Structured JSON Output**: Easy parsing by CI/CD tools
- **Log Rotation**: Automatic cleanup prevents disk space issues
- **Performance Tracking**: Built-in performance logging for trend analysis
- **Error Aggregation**: Centralized error collection for failure analysis

#### **Production-Ready Features**

- **Automatic Log Archiving**: Time-based log retention
- **Error Stack Traces**: Detailed error information for debugging
- **Context Preservation**: Request correlation and test context tracking

### 4. 📊 Reporting System - Allure Integration

I chose **Allure** as the primary reporting solution for its comprehensive capabilities and ecosystem integration:

#### **Why Allure Over Alternatives?**

**Compared to HTML Reporter:**

- **Rich Metadata**: Steps, attachments, parameters, and timeline views
- **Historical Trends**: Test execution trends and flakiness detection
- **Categorization**: Automatic test categorization and filtering

**Compared to JUnit XML:**

- **Visual Appeal**: Rich UI with charts, graphs, and detailed breakdowns
- **Attachment Support**: Screenshots, videos, logs, and custom attachments
- **Test Management Integration**: Links to test management systems

**Compared to JSON Reporter:**

- **Human Readable**: No need for additional processing or tools
- **Real-time Updates**: Live reporting during test execution
- **Stakeholder Friendly**: Accessible to non-technical team members

#### **Allure Advanced Features**

**Rich Test Documentation:**

```typescript
allure.setFeature("Authentication");
allure.setStory("User Login");
allure.setEpic("Core Functionality");
allure.setSeverity("critical");
allure.setTestCaseId("LOGIN-001");
allure.addLink("https://jira.company.com/ISSUE-123", "Related Issue", "issue");
```

**Dynamic Content & Attachments:**

```typescript
allure.attachScreenshot("Login Page", screenshotBuffer);
allure.attachJSON("API Response", responseData);
allure.attachText("Error Details", errorMessage);
allure.attachHTML("Page Source", pageHTML);
```

**Performance & Environment Tracking:**

```typescript
allure.attachPerformanceMetrics({
  pageLoad: 2500,
  apiResponse: 150,
  networkTime: 300,
});

allure.addEnvironmentInfo({
  browser: "chromium",
  environment: "staging",
  version: "1.0.0",
});
```

#### **Enterprise Reporting Capabilities**

**Multi-Format Output:**

- **Allure HTML**: Rich interactive reports
- **HTML**: Standard Playwright HTML reports
- **JSON**: Machine-readable results for further processing
- **JUnit XML**: CI/CD tool integration

**Historical Analysis:**

- **Trend Analysis**: Test execution trends over time
- **Flaky Test Detection**: Automatic identification of unstable tests
- **Performance Regression**: Performance trend monitoring

**Team Collaboration:**

- **Test Categorization**: Automatic grouping by features, stories, and epics
- **Failure Analysis**: Detailed failure categorization and root cause analysis
- **Stakeholder Dashboards**: Executive-level test health overview

#### **CI/CD Integration Benefits**

**Automated Report Generation:**

```bash
# CI pipeline integration
npm run test:all
npm run allure:generate
# Publish to CI artifact storage
```

**Real-time Notifications:**

- **Slack/Teams Integration**: Automatic test result notifications
- **Email Reports**: Scheduled test summary emails
- **Dashboard Integration**: Live test health dashboards

**Quality Gates:**

- **Threshold-based Decisions**: Automatic pass/fail decisions based on test results
- **Performance Gates**: Block deployments based on performance regressions
- **Coverage Reports**: Integration with code coverage tools

---

## 🎯 Framework Benefits Summary

My framework successfully addresses all modern E2E testing requirements:

✅ **Cross-browser/Platform Support**: Multi-browser execution with device emulation  
✅ **Modular Design**: Page objects, helpers, and utilities for easy maintenance  
✅ **CI/CD Compatibility**: Environment-based configuration and artifact management  
✅ **Configurable Parameters**: Comprehensive environment variable support  
✅ **Comprehensive Reporting**: Multi-format reporting with rich visualizations  
✅ **Multi-Type Testing**: UI, API, regression, and performance testing in one framework

The framework is production-ready and designed to scale with your testing needs while maintaining code quality and execution reliability.
