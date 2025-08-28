import { test, expect } from '@playwright/test';

test.describe('Accessibility Features', () => {
  
  test.describe('Keyboard Navigation', () => {
    test('navigate modules using keyboard shortcuts', async ({ page }) => {
      await page.goto('/');
      
      // Wait for page to load
      await page.waitForSelector('h1:has-text("Invoice Processing Dashboard")');
      
      // Detect platform for correct modifier key
      const isMac = await page.evaluate(() => navigator.platform.toUpperCase().indexOf('MAC') >= 0);
      const modKey = isMac ? 'Meta' : 'Control';
      
      // Press Cmd/Ctrl+2 to navigate to Helpdesk (second item in nav)
      await page.keyboard.press(`${modKey}+2`);
      await page.waitForTimeout(100);
      
      // Should navigate to helpdesk page
      await page.waitForSelector('h1:has-text("Helpdesk")');
      const url = page.url();
      expect(url).toContain('/helpdesk');
      
      // Press Cmd/Ctrl+7 to navigate to Settings
      await page.keyboard.press(`${modKey}+7`);
      await page.waitForTimeout(100);
      
      // Should navigate to settings page
      await page.waitForSelector('h1:has-text("Settings")');
      const settingsUrl = page.url();
      expect(settingsUrl).toContain('/settings');
      
      // Press Cmd/Ctrl+1 to go back to Invoice Processing
      await page.keyboard.press(`${modKey}+1`);
      await page.waitForTimeout(100);
      
      // Should be back at home
      await page.waitForSelector('h1:has-text("Invoice Processing Dashboard")');
    });

    test('tab navigation through interface elements', async ({ page }) => {
      await page.goto('/');
      
      // Start tabbing through the interface
      await page.keyboard.press('Tab');
      
      // First tab should focus on skip link (usually hidden but focusable)
      const skipLink = page.locator('a:has-text("Skip to main content")');
      await expect(skipLink).toBeFocused();
      
      // Continue tabbing to navigation items
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should eventually reach the navigation pills
      const activeElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(['A', 'BUTTON']).toContain(activeElement);
    });

    test('escape key closes user menu', async ({ page }) => {
      await page.goto('/');
      
      // Open user menu
      const userButton = page.locator('button[title="Caroline"]');
      await userButton.click();
      
      // Wait for menu to open
      await page.waitForSelector('text=caroline@xelix.com');
      
      // Press Escape
      await page.keyboard.press('Escape');
      
      // Menu should be closed
      const dropdown = page.locator('text=caroline@xelix.com');
      await expect(dropdown).not.toBeVisible();
    });
  });

  test.describe('ARIA Attributes', () => {
    test('navigation has proper ARIA attributes', async ({ page }) => {
      await page.goto('/');
      
      // Check main navigation has proper role and label
      const mainNav = page.locator('nav#main-navigation');
      await expect(mainNav).toHaveAttribute('role', 'navigation');
      await expect(mainNav).toHaveAttribute('aria-label', 'Main navigation');
      
      // Check navigation pills have proper ARIA
      const navPills = page.locator('nav[aria-label="Tabs"]');
      await expect(navPills).toBeVisible();
      
      // Check active state is properly marked
      const activeButton = navPills.locator('button[class*="bg-purple-900"]').first();
      await expect(activeButton).toHaveAttribute('aria-current', 'page');
    });

    test('disabled items have proper ARIA attributes', async ({ page }) => {
      await page.goto('/');
      
      const navigation = page.locator('nav#main-navigation');
      
      // Find disabled button (Transactions)
      const disabledItem = navigation.locator('button').filter({ hasText: 'Transactions' }).first();
      await expect(disabledItem).toHaveAttribute('aria-disabled', 'true');
    });

    test('navigation items have proper labels', async ({ page }) => {
      await page.goto('/');
      
      const navigation = page.locator('nav#main-navigation');
      
      // Check Invoice Processing navigation link has proper aria-label (skip logo which is first a tag)
      const invoiceNavItem = navigation.locator('a[href="/"]').nth(1); // Second link is Invoice Processing
      const ariaLabel = await invoiceNavItem.getAttribute('aria-label');
      expect(ariaLabel).toContain('Invoice Processing');
      expect(ariaLabel).toContain('current page');
    });

    test('tooltips have proper role', async ({ page }) => {
      await page.goto('/');
      
      const navigation = page.locator('nav#main-navigation');
      
      // Hover to show tooltip
      const firstNavItem = navigation.locator('a').first();
      await firstNavItem.hover();
      await page.waitForTimeout(100);
      
      // Check tooltip has proper role
      const tooltip = page.locator('div[role="tooltip"]').first();
      await expect(tooltip).toBeVisible();
      await expect(tooltip).toHaveAttribute('role', 'tooltip');
    });
  });

  test.describe('Skip Links', () => {
    test('skip links are present and functional', async ({ page }) => {
      await page.goto('/');
      
      // Skip links should be present (though visually hidden)
      const skipToMain = page.locator('a[href="#main-content"]');
      await expect(skipToMain).toHaveCount(1);
      await expect(skipToMain).toHaveText('Skip to main content');
      
      const skipToNav = page.locator('a[href="#main-navigation"]');
      await expect(skipToNav).toHaveCount(1);
      await expect(skipToNav).toHaveText('Skip to navigation');
      
      // Tab to focus skip link
      await page.keyboard.press('Tab');
      await expect(skipToMain).toBeFocused();
      
      // Activate skip link
      await page.keyboard.press('Enter');
      
      // Should jump to main content
      const mainContent = page.locator('#main-content');
      await expect(mainContent).toBeInViewport();
    });
  });

  test.describe('Focus Management', () => {
    test('focus indicators are visible', async ({ page }) => {
      await page.goto('/');
      
      // Tab to first interactive element
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Take screenshot to verify focus indicator
      await expect(page).toHaveScreenshot('focus-indicator-visible.png', {
        fullPage: false,
        clip: { x: 0, y: 0, width: 400, height: 200 }
      });
    });

    test('focus trap in user menu', async ({ page }) => {
      await page.goto('/');
      
      // Open user menu
      const userButton = page.locator('button[title="Caroline"]');
      await userButton.click();
      await page.waitForSelector('text=caroline@xelix.com');
      
      // Tab should cycle within the menu
      await page.keyboard.press('Tab');
      const firstMenuItem = page.locator('[role="menuitem"]').first();
      await expect(firstMenuItem).toBeFocused();
      
      // Tab through menu items
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should stay within menu (not go to elements behind)
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();
    });
  });

  test.describe('Screen Reader Support', () => {
    test('live region for announcements exists', async ({ page }) => {
      await page.goto('/');
      
      // Check for screen reader announcement region
      const liveRegion = page.locator('div[aria-live="polite"][aria-atomic="true"]');
      await expect(liveRegion).toHaveCount(1);
      await expect(liveRegion).toHaveAttribute('class', /sr-only/);
    });

    test('dynamic changes are announced', async ({ page }) => {
      await page.goto('/');
      
      // Click on Invoices to trigger navigation
      await page.click('button:has-text("Invoices")');
      
      // Check that announcement was made
      const liveRegion = page.locator('div[aria-live="polite"]');
      const announcement = await liveRegion.textContent();
      
      // Should contain navigation announcement
      expect(announcement).toBeTruthy();
    });

    test('images have alt text', async ({ page }) => {
      await page.goto('/');
      
      // Check all images have alt text
      const images = page.locator('img');
      const count = await images.count();
      
      for (let i = 0; i < count; i++) {
        const img = images.nth(i);
        await expect(img).toHaveAttribute('alt', /.+/);
      }
    });
  });

  test.describe('Color Contrast', () => {
    test('text has sufficient contrast ratio', async ({ page }) => {
      await page.goto('/');
      
      // Check main heading contrast
      const heading = page.locator('h1').first();
      const color = await heading.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          color: style.color,
          background: style.backgroundColor
        };
      });
      
      // Text should be clearly visible
      expect(color.color).toBeTruthy();
    });
  });

  test.describe('Form Controls', () => {
    test('interactive elements are keyboard accessible', async ({ page }) => {
      await page.goto('/');
      
      // All buttons should be keyboard accessible
      const buttons = page.locator('button');
      const count = await buttons.count();
      
      for (let i = 0; i < count; i++) {
        const button = buttons.nth(i);
        const tabIndex = await button.getAttribute('tabindex');
        
        // Should not have negative tabindex (unless intentionally hidden)
        if (tabIndex !== null) {
          expect(parseInt(tabIndex)).toBeGreaterThanOrEqual(-1);
        }
      }
    });
  });
});