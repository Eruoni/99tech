import { BasePage } from "./BasePage";
import { Page, expect } from "@playwright/test";
import logger from "../config/logger.js";

export class Nav extends BasePage {
  // Page URL
  private readonly ADMIN_URL = "/web/index.php/admin/viewSystemUsers";
  private readonly PIM_URL = "/web/index.php/pim/viewEmployeeList";
  private readonly RECRUITMENT_URL = "/web/index.php/recruitment/viewCandidates";
  private readonly PERFORMANCE_URL = "/web/index.php/performance/searchEvaluatePerformanceReview";
  private readonly DIRECTORY_URL = "/web/index.php/directory/viewDirectory";
  private readonly CLAIM_URL = "/web/index.php/claim/viewAssignClaim";

  // Selectors - organized by functionality
  private readonly selectors = {
    // Hide/show nav button
    hideShowNavButton: `//*[@class='oxd-main-menu-search']/button`,

    // Search
    searchField: `//*[@class='oxd-main-menu-search']/input`,

    // Navigation Page
    admin: `//*[text() = 'Admin']/parent::*`,
    pim: `//*[text() = 'PIM']/parent::*`,
    recruitment: `//*[text() = 'Recruitment']/parent::*`,
    performance: `//*[text() = 'Performance']/parent::*`,
    directory: `//*[text() = 'Directory']/parent::*`,
    claim: `//*[text() = 'Claim']/parent::*`,
  };

  constructor(page: Page) {
    super(page);

    logger.debug("Nav initialized");
  }

  /**
   * Navigate to login page
   * @param waitForLoad - Whether to wait for page load completion
   */
  async navigateToAdmin(waitForLoad: boolean = true): Promise<void> {
    await this.allure.timedStep("Navigate to Admin Page", async () => {
      await this.click(this.selectors.admin);

      if (waitForLoad) {
        await this.waitForPageLoad();
      }

      this.allure.addParameter("Admin URL", `${this.baseURL}${this.ADMIN_URL}`);
      logger.test.step("Navigate to Login", "navigation", {
        url: `${this.baseURL}${this.ADMIN_URL}`,
      });
    });
  }

  async navigateToPIM(waitForLoad: boolean = true): Promise<void> {
    await this.allure.timedStep("Navigate to PIM Page", async () => {
      await this.click(this.selectors.pim);

      if (waitForLoad) {
        await this.waitForPageLoad();
      }

      this.allure.addParameter("PIM URL", `${this.baseURL}${this.PIM_URL}`);
      logger.test.step("Navigate to PIM", "navigation", {
        url: `${this.baseURL}${this.PIM_URL}`,
      });
    });
  }

  async navigateToRecruitment(waitForLoad: boolean = true): Promise<void> {
    await this.allure.timedStep("Navigate to Recruiment Page", async () => {
      await this.click(this.selectors.recruitment);

      if (waitForLoad) {
        await this.waitForPageLoad();
      }

      this.allure.addParameter("Recruiment URL", `${this.baseURL}${this.RECRUITMENT_URL}`);
      logger.test.step("Navigate to Recruiment", "navigation", {
        url: `${this.baseURL}${this.RECRUITMENT_URL}`,
      });
    });
  }

  async navigateToPerformance(waitForLoad: boolean = true): Promise<void> {
    await this.allure.timedStep("Navigate to Performance Page", async () => {
      await this.click(this.selectors.performance);

      if (waitForLoad) {
        await this.waitForPageLoad();
      }

      this.allure.addParameter("Performance URL", `${this.baseURL}${this.PERFORMANCE_URL}`);
      logger.test.step("Navigate to Performance", "navigation", {
        url: `${this.baseURL}${this.PERFORMANCE_URL}`,
      });
    });
  }

  async navigateToDirectory(waitForLoad: boolean = true): Promise<void> {
    await this.allure.timedStep("Navigate to Directory Page", async () => {
      await this.click(this.selectors.directory);

      if (waitForLoad) {
        await this.waitForPageLoad();
      }

      this.allure.addParameter("Directory URL", `${this.baseURL}${this.DIRECTORY_URL}`);
      logger.test.step("Navigate to Directory", "navigation", {
        url: `${this.baseURL}${this.DIRECTORY_URL}`,
      });
    });
  }

  async navigateToClaim(waitForLoad: boolean = true): Promise<void> {
    await this.allure.timedStep("Navigate to Claim Page", async () => {
      await this.click(this.selectors.claim);

      if (waitForLoad) {
        await this.waitForPageLoad();
      }

      this.allure.addParameter("Claim URL", `${this.baseURL}${this.CLAIM_URL}`);
      logger.test.step("Navigate to Claim", "navigation", {
        url: `${this.baseURL}${this.CLAIM_URL}`,
      });
    });
  }

  async enterSearch(value: string): Promise<void> {
    await this.allure.timedStep("Navigate to Claim Page", async () => {
        await this.fill(this.selectors.searchField, value)

        logger.test.step("Enter Nav Search", "Enter Text", {
            text: value
        })
    });
  }

  async isAdminOptionDisplay(): Promise<Boolean>{
    return await this.allure.timedStep('Check if Admin Option display', async () => {
      return await this.elementExists(this.selectors.admin)
    });
  }

  async isPIMOptionDisplay(): Promise<Boolean>{
    return await this.allure.timedStep('Check if PIM Option display', async () => {
      return await this.elementExists(this.selectors.pim)
    });
  }

  async isPerformanceOptionDisplay(): Promise<Boolean>{
    return await this.allure.timedStep('Check if Performance Option display', async () => {
      return await this.elementExists(this.selectors.performance)
    });
  }

  async isRecruitmentOptionDisplay(): Promise<Boolean>{
    return await this.allure.timedStep('Check if Recruitment Option display', async () => {
      return await this.elementExists(this.selectors.recruitment)
    });
  }

  async isDirectoryOptionDisplay(): Promise<Boolean>{
    return await this.allure.timedStep('Check if Directory Option display', async () => {
      return await this.elementExists(this.selectors.directory)
    });
  }

  async isClaimOptionDisplay(): Promise<Boolean>{
    return await this.allure.timedStep('Check if Claim Option display', async () => {
      return await this.elementExists(this.selectors.claim)
    });
  }

  /** For Demo reason, we only choose some of the nav bar */
  // Admin permission
  async verifyNavAdmin(): Promise<void> {
    await this.allure.timedStep("Verify Navigation tab for Admin", async () => {
      await Promise.all([
        this.waitForElement(this.selectors.admin),
        this.waitForElement(this.selectors.pim),
        this.waitForElement(this.selectors.performance),
        this.waitForElement(this.selectors.directory),
        this.waitForElement(this.selectors.claim),
        this.waitForElement(this.selectors.recruitment),
      ])
    })
  }

  // Admin permission
  async verifyNavESS(): Promise<void> {
    await this.allure.timedStep("Verify Navigation tab for Admin", async () => {
      await Promise.all([
        this.waitForElement(this.selectors.performance),
        this.waitForElement(this.selectors.directory),
        this.waitForElement(this.selectors.claim),
      ])
    })
  }
}
