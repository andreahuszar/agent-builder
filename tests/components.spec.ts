import { test, expect } from '@playwright/test';

test.describe('Component-Level Visual Tests', () => {
  
  test.describe('Navigation Component', () => {
    test('sidebar navigation in default state', async ({ page }) => {
      await page.goto('/');
      
      // Wait for navigation to load
      const navigation = page.locator('div[class*="min-w-16"][class*="flex-shrink-0"]').first();
      await expect(navigation).toBeVisible();
      
      // Test component isolation - screenshot just the navigation
      await expect(navigation).toHaveScreenshot('navigation-sidebar-default.png');
    });

    test('sidebar navigation with active state', async ({ page }) => {
      await page.goto('/');
      
      // Wait for navigation and verify active state on first icon
      const navigation = page.locator('div[class*="min-w-16"][class*="flex-shrink-0"]').first();
      await expect(navigation).toBeVisible();
      
      // Verify active state exists (bg-purple-900 class on first nav item)
      const activeNavItem = navigation.locator('a[class*="bg-purple-900"]').first();
      await expect(activeNavItem).toBeVisible();
      
      await expect(navigation).toHaveScreenshot('navigation-sidebar-active.png');
    });

    test('sidebar navigation hover states', async ({ page }) => {
      await page.goto('/');
      
      const navigation = page.locator('div[class*="min-w-16"][class*="flex-shrink-0"]').first();
      await expect(navigation).toBeVisible();
      
      // Hover over second navigation item (Transactions)
      const secondNavItem = navigation.locator('a[title="Transactions"]');
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
      
      // Verify Workspace is active (has bg-purple-900)
      const workspaceButton = navPills.locator('button:has-text("Workspace")');
      await expect(workspaceButton).toHaveClass(/bg-purple-900/);
      
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
      
      const userButton = userMenuArea.locator('button[title="dariusz"]');
      await expect(userButton).toBeVisible();
      
      await expect(userMenuArea).toHaveScreenshot('user-menu-closed.png');
    });

    test('user menu open state', async ({ page }) => {
      await page.goto('/');
      
      // Click user menu button
      const userButton = page.locator('button[title="dariusz"]');
      await userButton.click();
      
      // Wait for dropdown to appear
      await page.waitForSelector('text=dariusz@example.com');
      
      // Target a larger area that includes the dropdown
      const userMenuArea = page.locator('div.flex.items-center').last();
      await expect(userMenuArea).toHaveScreenshot('user-menu-open-component.png');
    });

    test('user menu button hover state', async ({ page }) => {
      await page.goto('/');
      
      const userMenuArea = page.locator('div.flex.items-center').last();
      const userButton = userMenuArea.locator('button[title="dariusz"]');
      
      // Hover over user button
      await userButton.hover();
      
      await expect(userMenuArea).toHaveScreenshot('user-menu-button-hover.png');
    });
  });

  test.describe('Main Content Component', () => {
    test('main content area workspace view', async ({ page }) => {
      await page.goto('/');
      
      // Wait for content to load
      await page.waitForSelector('h1:has-text("Invoice Processing Workspace")');
      
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
});