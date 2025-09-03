import { test, expect } from '@playwright/test';

test.describe('Helpdesk Inbox', () => {
  test('should match the visual design of helpdesk inbox', async ({ page }) => {
    // Navigate to the helpdesk inbox page
    await page.goto('http://localhost:3001/helpdesk/inbox');
    
    // Wait for the page to load
    await page.waitForSelector('.flex-1.flex', { timeout: 10000 });
    
    // Take a screenshot for visual comparison
    await expect(page).toHaveScreenshot('helpdesk-inbox.png', {
      fullPage: false,
      clip: { x: 0, y: 0, width: 1440, height: 900 }
    });
    
    // Verify key elements are present
    await expect(page.locator('text=Inbox').first()).toBeVisible();
    await expect(page.locator('text=Ticket #389688')).toBeVisible();
    await expect(page.locator('h2:has-text("Invoice #ASA199_73778 Issued on 16/08/25")')).toBeVisible();
    await expect(page.locator('text=🎯 Focused')).toBeVisible();
    
    // Check for inbox items
    await expect(page.locator('text=Accounts Payable Team Enea')).toBeVisible();
    await expect(page.locator('text=João Raphael Titão Vale')).toBeVisible();
    await expect(page.locator('text=Li Zhiming')).toBeVisible();
    await expect(page.locator('text=Aaron Bern')).toBeVisible();
    
    // Check for right panel
    await expect(page.locator('text=Activity').first()).toBeVisible();
    await expect(page.locator('text=Comments (0)')).toBeVisible();
  });
});