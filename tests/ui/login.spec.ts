import { expect, test } from "@playwright/test";
import { LoginPage } from "../../src/pages/LoginPage";
import { AllureHelper } from "../../src/helpers/AllureHelper";
import { configManager } from "../../src/config/configManager";
import { TestUtils } from "../../src/utils/testUtils";
import logger from "../../src/config/logger";
import type { UserCredentials } from "../../src/types/index";

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

    test("Login Success: ESS @critical @smoke", async () => {
      allure.setSeverity("critical");
      allure.setTestCaseId("Login_4");
      allure.setDescription("Verify that ESS user can login with valid credentials");

      // Find ess account from test data
      const essAccount = testAccounts.accounts.find((account: any) => account.role === "ESS" && account.active);
      if (!essAccount) {
        throw new Error("Disabled account not found in test data");
      }

      const essCredentials: UserCredentials = {
        username: essAccount.username,
        password: essAccount.password,
        role: essAccount.role,
      };

      logger.test.start("Valid ESS Login", "Authentication");

      // Navigate to login page
      await loginPage.navigateToLogin();

      // Verify login page elements
      await loginPage.verifyLoginPageElements();
      await loginPage.shouldBeOnLoginPage();

      // Perform login
      await loginPage.login(essCredentials);

      // Verify successful login
      await loginPage.shouldBeLoggedIn();
      await loginPage.isLoginSuccessful();

      const currentUrl = await loginPage.getCurrentUrl();

      allure.addParameter("Login Status", "Success");
      allure.addParameter("User Role", essAccount.role);
      allure.addParameter("Username", essAccount.username);
      allure.addParameter("Final URL", currentUrl);

      logger.test.end("Valid ESS Login", "Authentication", "passed", Date.now());
    });

    test("Login Unsuccessfully: Invalid credentials @critical @smoke", async () => {
      allure.setSeverity("critical");
      allure.setTestCaseId("Login_5");
      allure.setDescription("Verify that user cannot login with invalid credentials");

      // Find ess account from test data
      const essAccount = testAccounts.accounts.find((account: any) => account.role === "ESS" && account.active);
      if (!essAccount) {
        throw new Error("ESS account not found in test data");
      }

      const essCredentials: UserCredentials = {
        username: essAccount.username,
        password: TestUtils.generateRandomString(5),
        role: essAccount.role,
      };

      logger.test.start("Invalid ESS Login", "Authentication");

      // Navigate to login page
      await loginPage.navigateToLogin();

      // Verify login page elements
      await loginPage.verifyLoginPageElements();
      await loginPage.shouldBeOnLoginPage();

      // Perform login
      await loginPage.login(essCredentials, false);

      // Verify successful login
      const errorMessage = await loginPage.getLoginErrorMessage();
      expect(errorMessage).toEqual('Invalid credentials')

      const currentUrl = await loginPage.getCurrentUrl();
      allure.addParameter("Login Status", "Fail");
      allure.addParameter("User Role", essCredentials.role);
      allure.addParameter("Username", essCredentials.username);
      allure.addParameter("Final URL", currentUrl);

      logger.test.end("Invalid ESS Login", "Authentication", "passed", Date.now());
    });

    test("Login Unsuccessfully: Account has been disabled @critical @smoke", async () => {
      allure.setSeverity("critical");
      allure.setTestCaseId("Login_6");
      allure.setDescription("Verify that user cannot login with disabled credentials");

      // Find admin account from test data
      const disabledAccount = testAccounts.accounts.find((account: any) => account.active === false);
      if (!disabledAccount) {
        throw new Error("Admin account not found in test data");
      }

      const disabledCredentials: UserCredentials = {
        username: disabledAccount.username,
        password: disabledAccount.password,
        role: disabledAccount.role,
      };

      logger.test.start("Disabled Account Login", "Authentication");

      // Navigate to login page
      await loginPage.navigateToLogin();

      // Verify login page elements
      await loginPage.verifyLoginPageElements();
      await loginPage.shouldBeOnLoginPage();

      // Perform login
      await loginPage.login(disabledCredentials, false);

      // Verify successful login
      const errorMessage = await loginPage.getLoginErrorMessage();
      expect(errorMessage).toEqual('Invalid credentials')

      const currentUrl = await loginPage.getCurrentUrl();
      allure.addParameter("Login Status", "Fail");
      allure.addParameter("User Role", disabledCredentials.role);
      allure.addParameter("Username", disabledCredentials.username);
      allure.addParameter("Final URL", currentUrl);

      logger.test.end("Disabled Account Login", "Authentication", "passed", Date.now());
    });
  });
});
