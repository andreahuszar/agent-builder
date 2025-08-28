import { test, expect } from '@playwright/test';

test.describe('Navigation Features', () => {
  
  test.describe('Tooltip Functionality', () => {
    test('tooltips show keyboard shortcuts on hover', async ({ page }) => {
      await page.goto('/');
      
      const navigation = page.locator('nav#main-navigation');
      await expect(navigation).toBeVisible();
      
      // Test tooltip for each navigation item
      const navItems = [
        { selector: 'a', index: 0, shortcut: '⌘1', platform: 'mac' },
        { selector: 'button', index: 0, shortcut: '⌘2', platform: 'mac' }
      ];
      
      for (const item of navItems) {
        const element = item.selector === 'a' 
          ? navigation.locator('a').nth(item.index)
          : navigation.locator('button').first();
        
        await element.hover();
        await page.waitForTimeout(100);
        
        // Check if tooltip appears with shortcut
        const isMac = await page.evaluate(() => navigator.platform.toUpperCase().indexOf('MAC') >= 0);
        const expectedShortcut = isMac ? item.shortcut : item.shortcut.replace('⌘', 'Ctrl+');
        
        const tooltip = page.locator('div[role="tooltip"]').first();
        await expect(tooltip).toBeVisible();
        
        // Verify shortcut text is present
        const tooltipText = await tooltip.textContent();
        expect(tooltipText).toContain(expectedShortcut.slice(-1)); // Check for the number
      }
    });

    test('tooltips have correct styling and positioning', async ({ page }) => {
      await page.goto('/');
      
      const navigation = page.locator('nav#main-navigation');
      const firstNavItem = navigation.locator('a').first();
      
      // Hover to show tooltip
      await firstNavItem.hover();
      await page.waitForTimeout(100);
      
      const tooltip = page.locator('div[role="tooltip"]').first();
      await expect(tooltip).toBeVisible();
      
      // Check tooltip positioning (should be to the right of sidebar)
      const tooltipBox = await tooltip.boundingBox();
      const navItemBox = await firstNavItem.boundingBox();
      
      if (tooltipBox && navItemBox) {
        // Tooltip should be to the right of the nav item
        expect(tooltipBox.x).toBeGreaterThan(navItemBox.x + navItemBox.width);
      }
      
      // Check tooltip styling
      await expect(tooltip).toHaveClass(/bg-gray-900/); // Dark background
      await expect(tooltip).toHaveClass(/text-white/); // White text
    });

    test('disabled items show "Not implemented" tooltip', async ({ page }) => {
      await page.goto('/');
      
      const navigation = page.locator('nav#main-navigation');
      
      // Find disabled Transactions button
      const disabledItem = navigation.locator('button').filter({ hasText: 'Transactions' }).first();
      await disabledItem.hover();
      await page.waitForTimeout(100);
      
      // Check for specific tooltip content
      const tooltip = page.locator('div[role="tooltip"]:has-text("Not implemented in prototype")');
      await expect(tooltip).toBeVisible();
    });

    test('tooltips disappear on mouse leave', async ({ page }) => {
      await page.goto('/');
      
      const navigation = page.locator('nav#main-navigation');
      const firstNavItem = navigation.locator('a').first();
      
      // Show tooltip
      await firstNavItem.hover();
      await page.waitForTimeout(100);
      
      const tooltip = page.locator('div[role="tooltip"]').first();
      await expect(tooltip).toBeVisible();
      
      // Move mouse away
      await page.mouse.move(500, 300);
      await page.waitForTimeout(200);
      
      // Tooltip should be hidden
      await expect(tooltip).not.toBeVisible();
    });
  });

  test.describe('Sidebar Expansion', () => {
    test('sidebar expands with delay on hover', async ({ page }) => {
      await page.goto('/');
      
      const sidebar = page.locator('div.w-16').first();
      const navigation = page.locator('nav#main-navigation');
      
      // Initially collapsed
      await expect(navigation).toHaveClass(/w-16/);
      
      // Hover over sidebar
      await sidebar.hover();
      
      // Should not expand immediately
      await page.waitForTimeout(100);
      await expect(navigation).toHaveClass(/w-16/);
      
      // Should expand after delay (300ms)
      await page.waitForTimeout(250);
      await expect(navigation).toHaveClass(/w-56/);
    });

    test('sidebar shows labels when expanded', async ({ page }) => {
      await page.goto('/');
      
      const sidebar = page.locator('div.w-16').first();
      const navigation = page.locator('nav#main-navigation');
      
      // Labels should be hidden when collapsed
      const label = navigation.locator('span:has-text("Invoice Processing")');
      await expect(label).not.toBeVisible();
      
      // Hover to expand
      await sidebar.hover();
      await page.waitForTimeout(350);
      
      // Labels should be visible when expanded
      await expect(label).toBeVisible();
      
      // Check multiple labels are shown
      const helpdeskLabel = navigation.locator('span:has-text("Helpdesk")');
      await expect(helpdeskLabel).toBeVisible();
      
      const settingsLabel = navigation.locator('span:has-text("Settings")');
      await expect(settingsLabel).toBeVisible();
    });

    test('sidebar collapses when mouse leaves', async ({ page }) => {
      await page.goto('/');
      
      const sidebar = page.locator('div.w-16').first();
      const navigation = page.locator('nav#main-navigation');
      
      // Expand sidebar
      await sidebar.hover();
      await page.waitForTimeout(350);
      await expect(navigation).toHaveClass(/w-56/);
      
      // Move mouse away
      await page.mouse.move(500, 300);
      await page.waitForTimeout(100);
      
      // Should collapse
      await expect(navigation).toHaveClass(/w-16/);
    });
  });

  test.describe('Disabled Item Interactions', () => {
    test('disabled items show red flash animation on click', async ({ page }) => {
      await page.goto('/');
      
      const navigation = page.locator('nav#main-navigation');
      const disabledItem = navigation.locator('button').filter({ hasText: 'Transactions' }).first();
      
      // Click disabled item (force click on disabled button)
      await disabledItem.click({ force: true });
      
      // Should have red background immediately
      await expect(disabledItem).toHaveClass(/bg-red-500\/20/);
      
      // Animation should last ~800ms
      await page.waitForTimeout(400);
      await expect(disabledItem).toHaveClass(/bg-red-500\/20/);
      
      // Should return to normal after animation
      await page.waitForTimeout(500);
      await expect(disabledItem).not.toHaveClass(/bg-red-500\/20/);
    });

    test('disabled items cannot navigate', async ({ page }) => {
      await page.goto('/');
      
      const initialUrl = page.url();
      const navigation = page.locator('nav#main-navigation');
      
      // Click all disabled items
      const disabledButtons = navigation.locator('button[aria-disabled="true"]');
      const count = await disabledButtons.count();
      
      for (let i = 0; i < count; i++) {
        await disabledButtons.nth(i).click({ force: true });
        await page.waitForTimeout(100);
        
        // URL should not change
        expect(page.url()).toBe(initialUrl);
      }
    });

    test('multiple disabled clicks handle animations correctly', async ({ page }) => {
      await page.goto('/');
      
      const navigation = page.locator('nav#main-navigation');
      const disabledItem = navigation.locator('button').filter({ hasText: 'Transactions' }).first();
      
      // Click multiple times quickly (force click on disabled button)
      await disabledItem.click({ force: true });
      await page.waitForTimeout(100);
      await disabledItem.click({ force: true });
      
      // Should still show red animation
      await expect(disabledItem).toHaveClass(/bg-red-500\/20/);
      
      // Animation should reset on each click
      await page.waitForTimeout(900);
      await expect(disabledItem).not.toHaveClass(/bg-red-500\/20/);
    });
  });

  test.describe('Navigation Pills', () => {
    test('navigation pills update based on active module', async ({ page }) => {
      await page.goto('/');
      
      // Invoice Processing module pills
      let navPills = page.locator('nav[aria-label="Tabs"]');
      await expect(navPills.locator('button:has-text("Dashboard")')).toBeVisible();
      await expect(navPills.locator('button:has-text("Invoices")')).toBeVisible();
      await expect(navPills.locator('button:has-text("Purchase Orders")')).toBeVisible();
      
      // Navigate to Helpdesk
      await page.goto('/helpdesk');
      
      // Should show Helpdesk pills
      navPills = page.locator('nav[aria-label="Tabs"]');
      await expect(navPills.locator('button:has-text("Inbox")')).toBeVisible();
      await expect(navPills.locator('button:has-text("Kanban")')).toBeVisible();
      
      // Navigate to Settings
      await page.goto('/settings');
      
      // Should show Settings pills
      navPills = page.locator('nav[aria-label="Tabs"]');
      await expect(navPills.locator('button:has-text("Automation")')).toBeVisible();
    });

    test('active pill state persists correctly', async ({ page }) => {
      await page.goto('/');
      
      const navPills = page.locator('nav[aria-label="Tabs"]');
      
      // Click on Invoices
      await navPills.locator('button:has-text("Invoices")').click();
      await page.waitForTimeout(100);
      
      // Invoices should be active
      const invoicesButton = navPills.locator('button:has-text("Invoices")');
      await expect(invoicesButton).toHaveClass(/bg-purple-900/);
      await expect(invoicesButton).toHaveAttribute('aria-current', 'page');
      
      // Dashboard should not be active
      const dashboardButton = navPills.locator('button:has-text("Dashboard")');
      await expect(dashboardButton).not.toHaveClass(/bg-purple-900/);
    });
  });

  test.describe('Logo Navigation', () => {
    test('logo link navigates to home', async ({ page }) => {
      await page.goto('/helpdesk');
      
      // Click on logo
      const logo = page.locator('a[aria-label="Xelix Home"]');
      await logo.click();
      
      // Should navigate to home
      await page.waitForSelector('h1:has-text("Invoice Processing Dashboard")');
      expect(page.url()).toContain('/');
      expect(page.url()).not.toContain('/helpdesk');
    });
  });

  test.describe('Navigation Consistency', () => {
    test('navigation state is consistent across page changes', async ({ page }) => {
      await page.goto('/');
      
      // Navigate through different pages
      const pages = [
        { url: '/invoices', heading: 'Invoices' },
        { url: '/purchase-orders', heading: 'Purchase Orders' },
        { url: '/helpdesk', heading: 'Helpdesk' },
        { url: '/settings', heading: 'Settings' }
      ];
      
      for (const pageInfo of pages) {
        await page.goto(pageInfo.url);
        await page.waitForSelector(`h1:has-text("${pageInfo.heading}")`);
        
        // Navigation should always be visible
        const navigation = page.locator('nav#main-navigation');
        await expect(navigation).toBeVisible();
        
        // User menu should always be present
        const userButton = page.locator('button[title="Caroline"]');
        await expect(userButton).toBeVisible();
      }
    });
  });
});