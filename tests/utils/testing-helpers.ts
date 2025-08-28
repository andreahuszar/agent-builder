import { Page, Locator, expect } from '@playwright/test';

/**
 * Testing utilities for visual regression tests
 * These helpers encapsulate common testing patterns and make tests more maintainable
 */

export class NavigationHelpers {
  constructor(private page: Page) {}

  /**
   * Get the left sidebar navigation element
   */
  async getSidebar(): Promise<Locator> {
    const sidebar = this.page.locator('div[class*="min-w-16"][class*="flex-shrink-0"]').first();
    await expect(sidebar).toBeVisible();
    return sidebar;
  }

  /**
   * Get the top navigation pills container
   */
  async getNavPills(): Promise<Locator> {
    const navPills = this.page.locator('nav[aria-label="Tabs"]');
    await expect(navPills).toBeVisible();
    return navPills;
  }

  /**
   * Get the top header container
   */
  async getHeader(): Promise<Locator> {
    const header = this.page.locator('div[class*="backdrop-blur-md"][class*="border-b"]').first();
    await expect(header).toBeVisible();
    return header;
  }

  /**
   * Navigate to a specific view using the top navigation pills
   */
  async navigateTo(view: 'Workspace' | 'Invoices' | 'Purchase Orders'): Promise<void> {
    const button = this.page.locator(`button:has-text("${view}")`);
    await button.click();
    
    // Wait for the view to load based on expected heading
    const expectedHeadings = {
      'Workspace': 'Invoice Processing Workspace',
      'Invoices': 'Invoices', 
      'Purchase Orders': 'Purchase Orders'
    };
    
    await this.page.waitForSelector(`h1:has-text("${expectedHeadings[view]}")`);
  }

  /**
   * Verify which navigation pill is currently active
   */
  async verifyActivePill(expectedActive: 'Workspace' | 'Invoices' | 'Purchase Orders'): Promise<void> {
    const activeButton = this.page.locator(`button:has-text("${expectedActive}")`);
    await expect(activeButton).toHaveClass(/bg-purple-600/);
  }

  /**
   * Get a specific sidebar navigation item by title
   */
  async getSidebarItem(title: string): Promise<Locator> {
    const sidebar = await this.getSidebar();
    const item = sidebar.locator(`a[title="${title}"]`);
    await expect(item).toBeVisible();
    return item;
  }
}

export class UserMenuHelpers {
  constructor(private page: Page) {}

  /**
   * Get the user menu button
   */
  async getUserButton(): Promise<Locator> {
    const button = this.page.locator('button[title="dariusz"]');
    await expect(button).toBeVisible();
    return button;
  }

  /**
   * Open the user menu dropdown
   */
  async openUserMenu(): Promise<void> {
    const button = await this.getUserButton();
    await button.click();
    await this.page.waitForSelector('text=dariusz@example.com');
  }

  /**
   * Get the user menu container area
   */
  async getUserMenuArea(): Promise<Locator> {
    return this.page.locator('div.flex.items-center').last();
  }

  /**
   * Verify the user menu is closed
   */
  async verifyMenuClosed(): Promise<void> {
    const dropdown = this.page.locator('text=dariusz@example.com');
    await expect(dropdown).not.toBeVisible();
  }

  /**
   * Verify the user menu is open
   */
  async verifyMenuOpen(): Promise<void> {
    const dropdown = this.page.locator('text=dariusz@example.com');
    await expect(dropdown).toBeVisible();
  }
}

export class ComponentHelpers {
  constructor(private page: Page) {}

  /**
   * Get the main content area (excluding navigation)
   */
  async getMainContent(): Promise<Locator> {
    const content = this.page.locator('div.flex-1.pb-8').first();
    await expect(content).toBeVisible();
    return content;
  }

  /**
   * Wait for the page to fully load with basic content
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForSelector('h1');
    // Wait for navigation to be present
    await this.page.waitForSelector('div[class*="min-w-16"]');
    // Wait for top navigation to be present
    await this.page.waitForSelector('nav[aria-label="Tabs"]');
  }

  /**
   * Take a screenshot of a component with consistent settings
   */
  async takeComponentScreenshot(locator: Locator, filename: string): Promise<void> {
    await expect(locator).toHaveScreenshot(filename, {
      animations: 'disabled'
    });
  }
}

export class CSSValidationHelpers {
  constructor(private page: Page) {}

  /**
   * Check if Tailwind CSS is working by verifying computed styles
   */
  async verifyTailwindWorking(): Promise<boolean> {
    // Check a simple Tailwind class is applied
    const workspaceButton = this.page.locator('button:has-text("Workspace")');
    await expect(workspaceButton).toBeVisible();
    
    const bgColor = await workspaceButton.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    
    // bg-purple-600 should be applied
    return bgColor.includes('rgb(147, 51, 234)');
  }

  /**
   * Check if custom gradients are rendering
   */
  async verifyGradientRendering(): Promise<boolean> {
    const sidebar = this.page.locator('div[class*="min-w-16"][class*="flex-shrink-0"]').first();
    await expect(sidebar).toBeVisible();
    
    const bgImage = await sidebar.evaluate((el) => {
      return window.getComputedStyle(el).backgroundImage;
    });
    
    return bgImage.includes('linear-gradient') && bgImage.includes('rgb(11, 11, 69)');
  }

  /**
   * Verify that a specific element has expected Tailwind classes applied
   */
  async verifyElementStyles(selector: string, expectedStyles: Record<string, string>): Promise<void> {
    const element = this.page.locator(selector);
    await expect(element).toBeVisible();
    
    for (const [property, expectedValue] of Object.entries(expectedStyles)) {
      const actualValue = await element.evaluate((el, prop) => {
        return window.getComputedStyle(el)[prop as any];
      }, property);
      
      expect(actualValue).toBe(expectedValue);
    }
  }

  /**
   * Quick CSS framework health check
   */
  async cssFrameworkHealthCheck(): Promise<{
    tailwindWorking: boolean;
    gradientRendering: boolean;
    fontLoaded: boolean;
  }> {
    const tailwindWorking = await this.verifyTailwindWorking();
    const gradientRendering = await this.verifyGradientRendering();
    
    // Check if Barlow font is loaded
    const fontFamily = await this.page.locator('body').evaluate((el) => {
      return window.getComputedStyle(el).fontFamily;
    });
    const fontLoaded = fontFamily.includes('Barlow');
    
    return {
      tailwindWorking,
      gradientRendering,
      fontLoaded
    };
  }
}

export class ViewportHelpers {
  constructor(private page: Page) {}

  /**
   * Test component at different viewport sizes
   */
  async testResponsiveComponent(
    locator: Locator, 
    screenshotBasename: string,
    viewports: Array<{ width: number; height: number; name: string }>
  ): Promise<void> {
    for (const viewport of viewports) {
      await this.page.setViewportSize({ width: viewport.width, height: viewport.height });
      await expect(locator).toBeVisible();
      await expect(locator).toHaveScreenshot(`${screenshotBasename}-${viewport.name}.png`, {
        animations: 'disabled'
      });
    }
  }

  /**
   * Standard viewport sizes for responsive testing
   */
  static readonly STANDARD_VIEWPORTS = [
    { width: 375, height: 667, name: 'mobile' },      // iPhone SE
    { width: 768, height: 1024, name: 'tablet' },     // iPad
    { width: 1024, height: 768, name: 'tablet-landscape' }, // iPad landscape
    { width: 1280, height: 720, name: 'desktop' },    // Standard desktop
    { width: 1920, height: 1080, name: 'large-desktop' } // Large desktop
  ] as const;
}

/**
 * Factory function to create all helper classes for a page
 */
export function createTestHelpers(page: Page) {
  return {
    navigation: new NavigationHelpers(page),
    userMenu: new UserMenuHelpers(page),
    component: new ComponentHelpers(page),
    css: new CSSValidationHelpers(page),
    viewport: new ViewportHelpers(page)
  };
}

/**
 * Common test patterns as reusable functions
 */
export const CommonTestPatterns = {
  /**
   * Complete page load and basic validation
   */
  async validatePageLoad(page: Page): Promise<void> {
    const helpers = createTestHelpers(page);
    await helpers.component.waitForPageLoad();
    
    // Verify CSS framework is working
    const healthCheck = await helpers.css.cssFrameworkHealthCheck();
    expect(healthCheck.tailwindWorking).toBe(true);
    expect(healthCheck.gradientRendering).toBe(true);
    expect(healthCheck.fontLoaded).toBe(true);
  },

  /**
   * Test navigation functionality
   */
  async testNavigationFlow(page: Page): Promise<void> {
    const { navigation } = createTestHelpers(page);
    
    // Test each navigation state
    await navigation.navigateTo('Invoices');
    await navigation.verifyActivePill('Invoices');
    
    await navigation.navigateTo('Purchase Orders');
    await navigation.verifyActivePill('Purchase Orders');
    
    await navigation.navigateTo('Workspace');
    await navigation.verifyActivePill('Workspace');
  },

  /**
   * Test user menu interactions
   */
  async testUserMenuFlow(page: Page): Promise<void> {
    const { userMenu } = createTestHelpers(page);
    
    await userMenu.verifyMenuClosed();
    await userMenu.openUserMenu();
    await userMenu.verifyMenuOpen();
  }
};