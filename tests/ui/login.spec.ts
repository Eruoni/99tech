import { test } from "@playwright/test";
import { LoginPage } from "../../src/pages/LoginPage.js";
import { AllureHelper } from "../../src/helpers/AllureHelper.js";
import { configManager } from "../../src/config/configManager.js";
import { TestUtils } from "../../src/utils/testUtils.js";
import logger from "../../src/config/logger.js";
import type { UserCredentials } from "../../src/types/index.js";

// Test suite configuration
test.describe("Login Functionality @ui", () => {
  let loginPage: LoginPage;
  let allure: AllureHelper;
  let testAccounts: any;

  // Suite-level setup
  test.beforeAll(async () => {
    allure = new AllureHelper();
    allure.setFeature("Authentication");
    allure.setStory("User Login");
    allure.setEpic("Core Functionality");

    // Load test accounts data
    testAccounts = await TestUtils.loadTestData<any>("test-data/test-accounts.json");

    logger.test.start("Login Test Suite", "UI Authentication");
    logger.info("Test accounts loaded", {
      accountsCount: testAccounts.accounts?.length || 0,
    });
  });

  // Test-level setup with new context
  test.beforeEach(async ({ browser }) => {
    // Create fresh context for each test
    const context = await browser.newContext({
      viewport: {
        width: configManager.get("VIEWPORT_WIDTH"),
        height: configManager.get("VIEWPORT_HEIGHT"),
      },
      ignoreHTTPSErrors: true,
      acceptDownloads: true,
    });

    const page = await context.newPage();
    loginPage = new LoginPage(page);

    // Navigate to home page first for clean state
    await page.goto(configManager.get("BASE_URL"));

    // Add browser info to Allure
    allure.addBrowserInfo({
      name: configManager.get("BROWSER"),
      platform: process.platform,
      viewport: {
        width: configManager.get("VIEWPORT_WIDTH"),
        height: configManager.get("VIEWPORT_HEIGHT"),
      },
    });
  });

  // Test-level teardown
  test.afterEach(async ({ context }, testInfo) => {
    if (testInfo.status === "failed") {
      const page = context.pages()[0];
      if (page) {
        await page.screenshot({
          path: `screenshots/failed_${testInfo.title.replace(/\s+/g, "_")}_${Date.now()}.png`,
          fullPage: true,
        });
      }
    }
    await context.close();
  });

  test.describe("UI/UX Testing @smoke @regression", () => {
    test("Verify UI correctly with design @normal", async () => {
      allure.setSeverity("normal");
      allure.setTestCaseId("Login_1");
      allure.setDescription("Verify UI correctly with design");

      // Navigate to login page
      await loginPage.navigateToLogin();

      // Verify login page elements
      await loginPage.verifyLoginPageElements();
      await loginPage.shouldBeOnLoginPage();
    });
  });

  test.describe("Functional Testing", () => {
    test("Login Success: Admin @critical @smoke", async () => {
      allure.setSeverity("critical");
      allure.setTestCaseId("Login_3");
      allure.setDescription("Verify that admin user can login with valid credentials");

      // Find admin account from test data
      const adminAccount = testAccounts.accounts.find((account: any) => account.role === "Admin" && account.active);
      if (!adminAccount) {
        throw new Error("Admin account not found in test data");
      }

      const adminCredentials: UserCredentials = {
        username: adminAccount.username,
        password: adminAccount.password,
        role: adminAccount.role,
      };

      logger.test.start("Valid Admin Login", "Authentication");

      // Navigate to login page
      await loginPage.navigateToLogin();

      // Verify login page elements
      await loginPage.verifyLoginPageElements();
      await loginPage.shouldBeOnLoginPage();

      // Perform login
      await loginPage.login(adminCredentials);

      // Verify successful login
      await loginPage.shouldBeLoggedIn();
      await loginPage.isLoginSuccessful();

      const currentUrl = await loginPage.getCurrentUrl();

      allure.addParameter("Login Status", "Success");
      allure.addParameter("User Role", adminCredentials.role);
      allure.addParameter("Username", adminCredentials.username);
      allure.addParameter("Final URL", currentUrl);

      logger.test.end("Valid Admin Login", "Authentication", "passed", Date.now());
    });
  });
});
