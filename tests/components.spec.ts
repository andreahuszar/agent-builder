import { test, expect } from '@playwright/test';

test.describe('Component-Level Visual Tests', () => {
  
  test.describe('Navigation Component', () => {
    test('sidebar navigation in default state', async ({ page }) => {
      await page.goto('/');
      
      // Wait for navigation to load
      const navigation = page.locator('nav#main-navigation');
      await expect(navigation).toBeVisible();
      
      // Test component isolation - screenshot just the navigation
      await expect(navigation).toHaveScreenshot('navigation-sidebar-default.png');
    });

    test('sidebar navigation with active state', async ({ page }) => {
      await page.goto('/');
      
      // Wait for navigation and verify active state on first icon
      const navigation = page.locator('nav#main-navigation');
      await expect(navigation).toBeVisible();
      
      // Verify active state exists (bg-purple-900 class on first nav item in sidebar)
      const activeNavItem = navigation.locator('a[class*="bg-purple-900"]').first();
      await expect(activeNavItem).toBeVisible();
      
      await expect(navigation).toHaveScreenshot('navigation-sidebar-active.png');
    });

    test('sidebar navigation hover states', async ({ page }) => {
      await page.goto('/');
      
      const navigation = page.locator('nav#main-navigation');
      await expect(navigation).toBeVisible();
      
      // Hover over second navigation item (Transactions - now a button since it's disabled)
      const secondNavItem = navigation.locator('button').filter({ hasText: 'Transactions' }).first();
      await secondNavItem.hover();
      
      await expect(navigation).toHaveScreenshot('navigation-sidebar-hover.png');
    });
  });

  test.describe('Top Navigation Pills', () => {
    test('navigation pills default state', async ({ page }) => {
      await page.goto('/');
      
      // Target the navigation pills container
      const navPills = page.locator('nav[aria-label="Tabs"]');
      await expect(navPills).toBeVisible();
      
      // Verify Dashboard is active (has bg-purple-900)
      const dashboardButton = navPills.locator('button:has-text("Dashboard")');
      await expect(dashboardButton).toHaveClass(/bg-purple-900/);
      
      await expect(navPills).toHaveScreenshot('nav-pills-workspace-active.png');
    });

    test('navigation pills invoices active state', async ({ page }) => {
      await page.goto('/');
      
      const navPills = page.locator('nav[aria-label="Tabs"]');
      await expect(navPills).toBeVisible();
      
      // Click Invoices button
      const invoicesButton = navPills.locator('button:has-text("Invoices")');
      await invoicesButton.click();
      
      // Verify Invoices is now active
      await expect(invoicesButton).toHaveClass(/bg-purple-900/);
      
      await expect(navPills).toHaveScreenshot('nav-pills-invoices-active.png');
    });

    test('navigation pills purchase orders active state', async ({ page }) => {
      await page.goto('/');
      
      const navPills = page.locator('nav[aria-label="Tabs"]');
      await expect(navPills).toBeVisible();
      
      // Click Purchase Orders button
      const poButton = navPills.locator('button:has-text("Purchase Orders")');
      await poButton.click();
      
      // Verify Purchase Orders is now active
      await expect(poButton).toHaveClass(/bg-purple-900/);
      
      await expect(navPills).toHaveScreenshot('nav-pills-purchase-orders-active.png');
    });

    test('navigation pills hover states', async ({ page }) => {
      await page.goto('/');
      
      const navPills = page.locator('nav[aria-label="Tabs"]');
      await expect(navPills).toBeVisible();
      
      // Hover over inactive Invoices button
      const invoicesButton = navPills.locator('button:has-text("Invoices")');
      await invoicesButton.hover();
      
      await expect(navPills).toHaveScreenshot('nav-pills-hover-state.png');
    });
  });

  test.describe('User Menu Component', () => {
    test('user menu closed state', async ({ page }) => {
      await page.goto('/');
      
      // Target the user menu button area
      const userMenuArea = page.locator('div.flex.items-center').last();
      await expect(userMenuArea).toBeVisible();
      
      const userButton = userMenuArea.locator('button[title="Caroline"]');
      await expect(userButton).toBeVisible();
      
      await expect(userMenuArea).toHaveScreenshot('user-menu-closed.png');
    });

    test('user menu open state', async ({ page }) => {
      await page.goto('/');
      
      // Click user menu button
      const userButton = page.locator('button[title="Caroline"]');
      await userButton.click();
      
      // Wait for dropdown to appear
      await page.waitForSelector('text=caroline@xelix.com');
      
      // Target a larger area that includes the dropdown
      const userMenuArea = page.locator('div.flex.items-center').last();
      await expect(userMenuArea).toHaveScreenshot('user-menu-open-component.png');
    });

    test('user menu button hover state', async ({ page }) => {
      await page.goto('/');
      
      const userMenuArea = page.locator('div.flex.items-center').last();
      const userButton = userMenuArea.locator('button[title="Caroline"]');
      
      // Hover over user button
      await userButton.hover();
      
      await expect(userMenuArea).toHaveScreenshot('user-menu-button-hover.png');
    });
  });

  test.describe('Main Content Component', () => {
    test('main content area workspace view', async ({ page }) => {
      await page.goto('/');
      
      // Wait for content to load
      await page.waitForSelector('h1:has-text("Invoice Processing Dashboard")');
      
      // Target main content area (excluding navigation)
      const mainContent = page.locator('div.flex-1.pb-8').first();
      await expect(mainContent).toBeVisible();
      
      await expect(mainContent).toHaveScreenshot('main-content-workspace.png');
    });

    test('main content area invoices view', async ({ page }) => {
      await page.goto('/');
      
      // Navigate to invoices
      await page.click('button:has-text("Invoices")');
      await page.waitForSelector('h1:has-text("Invoices")');
      
      const mainContent = page.locator('div.flex-1.pb-8').first();
      await expect(mainContent).toBeVisible();
      
      await expect(mainContent).toHaveScreenshot('main-content-invoices.png');
    });

    test('main content area purchase orders view', async ({ page }) => {
      await page.goto('/');
      
      // Navigate to purchase orders
      await page.click('button:has-text("Purchase Orders")');
      await page.waitForSelector('h1:has-text("Purchase Orders")');
      
      const mainContent = page.locator('div.flex-1.pb-8').first();
      await expect(mainContent).toBeVisible();
      
      await expect(mainContent).toHaveScreenshot('main-content-purchase-orders.png');
    });
  });

  test.describe('Sidebar Tooltips', () => {
    test('tooltips show on hover for navigation items', async ({ page }) => {
      await page.goto('/');
      
      const navigation = page.locator('nav#main-navigation');
      await expect(navigation).toBeVisible();
      
      // Hover over Invoice Processing (first item)
      const firstNavItem = navigation.locator('a').first();
      await firstNavItem.hover();
      
      // Wait for tooltip to appear
      await page.waitForTimeout(100);
      
      // Check if tooltip with shortcut is visible
      const tooltip = page.locator('div[role="tooltip"]:has-text("⌘1")');
      await expect(tooltip).toBeVisible();
      
      // Take screenshot with tooltip visible
      await expect(page).toHaveScreenshot('navigation-tooltip-visible.png');
    });

    test('disabled items show tooltip on hover', async ({ page }) => {
      await page.goto('/');
      
      const navigation = page.locator('nav#main-navigation');
      
      // Hover over disabled Transactions button
      const disabledItem = navigation.locator('button').filter({ hasText: 'Transactions' }).first();
      await disabledItem.hover();
      
      // Wait for tooltip
      await page.waitForTimeout(100);
      
      // Check for "Not implemented" tooltip
      const tooltip = page.locator('div[role="tooltip"]:has-text("Not implemented in prototype")');
      await expect(tooltip).toBeVisible();
    });
  });

  test.describe('Disabled Navigation Items', () => {
    test('disabled items show red flash on click', async ({ page }) => {
      await page.goto('/');
      
      const navigation = page.locator('nav#main-navigation');
      
      // Click on disabled Transactions button
      const disabledItem = navigation.locator('button').filter({ hasText: 'Transactions' }).first();
      
      // Click and immediately check for red background (force click on disabled button)
      await disabledItem.click({ force: true });
      
      // Should have red flash background
      await expect(disabledItem).toHaveClass(/bg-red-500\/20/);
      
      // Take screenshot during red flash
      await expect(navigation).toHaveScreenshot('disabled-item-red-flash.png');
      
      // Wait for animation to complete
      await page.waitForTimeout(900);
      
      // Should no longer have red background
      await expect(disabledItem).not.toHaveClass(/bg-red-500\/20/);
    });
  });

  test.describe('Sidebar Expansion', () => {
    test('sidebar expands on hover', async ({ page }) => {
      await page.goto('/');
      
      const sidebar = page.locator('div[class*="w-16"]').first();
      const navigation = page.locator('nav#main-navigation');
      
      // Initially collapsed
      await expect(navigation).toHaveClass(/w-16/);
      
      // Hover to expand
      await sidebar.hover();
      await page.waitForTimeout(350); // Wait for expand delay
      
      // Navigation stays at w-16 but expands with position fixed
      await expect(navigation).toHaveClass(/fixed/);
      await expect(navigation).toHaveClass(/w-56/);
      
      // Labels should be visible when expanded
      const labelVisible = await navigation.locator('span:has-text("Invoice Processing")').isVisible();
      expect(labelVisible).toBe(true);
      
      // Move mouse away
      await page.mouse.move(500, 300);
      await page.waitForTimeout(100);
      
      // Should collapse again
      await expect(navigation).toHaveClass(/w-16/);
    });
  });
});