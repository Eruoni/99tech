import { expect, test } from "@playwright/test";
import { LoginPage } from "../../src/pages/LoginPage";
import { configManager } from "../../src/config/configManager";
import { AllureHelper } from "../../src/helpers/AllureHelper";
import logger from "../../src/config/logger.js";
import { Nav } from "../../src/pages/Nav.js";
import fs from "fs";
import path from "path";
import { TestUtils } from "../../src/utils/testUtils";
import type { UserCredentials } from "../../src/types/index";

// Load nav options at module level (synchronously) for test discovery
const navOptionsPath = path.resolve("test-data/nav-options.json");
const navOptionsData = JSON.parse(fs.readFileSync(navOptionsPath, "utf-8"));

test.describe("Search Feature @ui", () => {
  let loginPage: LoginPage;
  let allure: AllureHelper;
  let testAccounts: any;
  // pages
  let nav: Nav;

  // Suite-level setup
  test.beforeAll(async () => {
    allure = new AllureHelper();
    allure.setFeature("Authentication");
    allure.setStory("User Login");
    allure.setEpic("Core Functionality");

    // Load test accounts data
    testAccounts = await TestUtils.loadTestData<any>("test-data/test-accounts.json");

    logger.test.start("Search Test Suite", "Search");
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
    nav = new Nav(page);

    // Navigate to home page first for clean state and execute login
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

  test.describe("Search in NAV", () => {
    test.describe("Admin", () => {
      test.beforeEach(async () => {
        await loginPage.quickLogin();
      });

      test.describe("UX/UI Testing", () => {
        test("Verify Search field in Nav Bar: Admin @regression", async () => {
          allure.setFeature("Search");
          allure.setStory("Navigation");
          allure.setSeverity("critical");
          allure.setTestCaseId("Search_1");
          allure.setDescription("Verify that admin user has every required options in nav bar");

          logger.test.start("Verify Nav Options for Admin", "Search");
          await nav.verifyNavAdmin();
          logger.test.end("Verify Nav Options for Admin", "Search", "passed", Date.now());
        });
      });

      test.describe("Functional Testing", () => {
        // Verify Admin can search for their accepted options
        const adminOptions = navOptionsData?.navigationOptions?.Admin || [];
        adminOptions.forEach((option: string) => {
          test(`Verify Search function work correctly: Admin - ${option}`, async () => {
            allure.setFeature("Search");
            allure.setStory("Navigation");
            allure.setSeverity("critical");
            allure.setTestCaseId(`Search_3_${option}`);
            allure.setDescription(`Verify that admin user can search for option ${option} normally in Navbar`);

            logger.test.start(`Verify Admin can search for option ${option}`, "Search");

            await nav.enterSearch(option);

            // Calling verification method
            const methodName = `is${option.replace(/\s+/g, "")}OptionDisplay`;
            // Use type assertion and bind to preserve 'this' context
            const method = (nav as any)[methodName];
            if (typeof method === "function") {
              await method.bind(nav)();
            } else {
              throw new Error(`Method ${methodName} not found in Nav class`);
            }

            logger.test.end(`Verify Admin can search for option ${option}`, "Search", "passed", Date.now());
          });
        });
      });

      test.describe("Edge Case", () => {
        test("Verify no result when searching element that not exists: Admin", async () => {
          allure.setFeature("Search");
          allure.setStory("Navigation");
          allure.setSeverity("normal");
          allure.setTestCaseId(`Search_6_Admin`);
          allure.setDescription(`Verify no item display when admin user can search for not exists option in Navbar`);

          logger.test.start(`Verify no item display when admin user can search for not exists option in Navbar`, "Search");

          await nav.enterSearch("NO ITEM EXISTS IN NAV");
          const isElementExists = await nav.elementExists(`//*[text() = 'NO ITEM EXISTS IN NAV']`);
          expect(isElementExists).toBeFalsy();
        });
      });
    });

    test.describe("ESS", () => {
      test.beforeEach(async () => {
        // Find ess account from test data
        const essAccount = testAccounts.accounts.find((account: any) => account.role === "ESS" && account.active);
        if (!essAccount) {
          throw new Error("ESS account not found in test data");
        }

        const essCredentials: UserCredentials = {
          username: essAccount.username,
          password: essAccount.password,
          role: essAccount.role,
        };

        await loginPage.login(essCredentials);

        // Verify successful login
        const isLoggedIn = await loginPage.isLoginSuccessful();
        expect(isLoggedIn).toBeTruthy()
      });

      test.describe("UX/UI Testing", () => {
        test("Verify Search field in Nav Bar: ESS @regression", async () => {
          allure.setFeature("Search");
          allure.setStory("Search");
          allure.setSeverity("critical");
          allure.setTestCaseId("Search_1");
          allure.setDescription("Verify that ess user has every required options in nav bar");

          logger.test.start("Verify Nav Options for ESS", "Search");
          await nav.verifyNavESS();
          logger.test.end("Verify Nav Options for ESS", "Search", "passed", Date.now());
        });
      });

      test.describe("Functional Testing", () => {
        // Verify ESS can search for their accepted options
        const essOptions = navOptionsData?.navigationOptions?.ESS || [];
        essOptions.forEach((option: string) => {
          test(`Verify Search function work correctly: ESS - ${option}`, async () => {
            allure.setFeature("Search");
            allure.setStory("Navigation");
            allure.setSeverity("critical");
            allure.setTestCaseId(`Search_3_${option}`);
            allure.setDescription(`Verify that ess user can search for option ${option} normally in Navbar`);

            logger.test.start(`Verify ESS can search for option ${option}`, "Search");

            await nav.enterSearch(option);

            // Calling verification method
            const methodName = `is${option.replace(/\s+/g, "")}OptionDisplay`;
            // Use type assertion and bind to preserve 'this' context
            const method = (nav as any)[methodName];
            if (typeof method === "function") {
              const isTruth = await method.bind(nav)();
              expect(isTruth).toBeTruthy()
            } else {
              throw new Error(`Method ${methodName} not found in Nav class`);
            }

            logger.test.end(`Verify ESS can search for option ${option}`, "Search", "passed", Date.now());
          });
        });

        // Verify that ESS can not search for their unaccepted options
        const adminOptions = navOptionsData?.navigationOptions?.Admin || [];
        const unacceptedOptions = adminOptions.filter((option: string) => !essOptions.includes(option));
        unacceptedOptions.forEach((option: string) => {
          test(`Verify that ESS user can not search for Admin's Nav options - ${option}`, async () => {
            allure.setFeature("Search");
            allure.setStory("Navigation");
            allure.setSeverity("critical");
            allure.setTestCaseId(`Search_5_${option}`);
            allure.setDescription(`Verify that ess user can not search for option that they are not allowed in Navbar`);

            logger.test.start(`Verify ESS can not search for option ${option}`, "Search");

            await nav.enterSearch(option);

            // Calling verification method
            const methodName = `is${option.replace(/\s+/g, "")}OptionDisplay`;
            // Use type assertion and bind to preserve 'this' context
            const method = (nav as any)[methodName];
            if (typeof method === "function") {
              const isTruth = await method.bind(nav)();
              expect(isTruth).toBeFalsy()
            } else {
              throw new Error(`Method ${methodName} not found in Nav class`);
            }

            logger.test.end(`Verify ESS can not search for option ${option}`, "Search", "passed", Date.now());
          });
        });
      });

      test.describe("Edge Case", () => {
        test("Verify no result when searching element that not exists: Admin", async () => {
          allure.setFeature("Search");
          allure.setStory("Search");
          allure.setSeverity("normal");
          allure.setTestCaseId(`Search_6_Admin`);
          allure.setDescription(`Verify no item display when admin user can search for not exists option in Navbar`);

          logger.test.start(`Verify no item display when admin user can search for not exists option in Navbar`, "Search");

          await nav.enterSearch("NO ITEM EXISTS IN NAV");
          const isElementExists = await nav.elementExists(`//*[text() = 'NO ITEM EXISTS IN NAV']`);
          expect(isElementExists).toBeFalsy();
        });
      });
    });
  });
});
