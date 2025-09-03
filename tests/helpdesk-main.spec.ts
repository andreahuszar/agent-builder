import { test, expect } from '@playwright/test';

test.describe('Helpdesk Main Page', () => {
  test('should match the visual design of helpdesk with navigation', async ({ page }) => {
    // Navigate to the helpdesk page
    await page.goto('http://localhost:3001/helpdesk');
    
    // Wait for the page to load
    await page.waitForSelector('.flex-1.flex', { timeout: 10000 });
    
    // Take a screenshot for visual comparison
    await expect(page).toHaveScreenshot('helpdesk-main.png', {
      fullPage: false,
      clip: { x: 0, y: 0, width: 1440, height: 900 }
    });
    
    // Verify key elements are present
    await expect(page.locator('text=Inbox').first()).toBeVisible();
    await expect(page.locator('text=Ticket #389688')).toBeVisible();
    await expect(page.locator('h2:has-text("Invoice #ASA199_73778 Issued on 16/08/25")')).toBeVisible();
    await expect(page.locator('text=🎯 Focused')).toBeVisible();
    
    // Check for Activity tab and its sections
    await expect(page.locator('text=Activity').first()).toBeVisible();
    await expect(page.locator('text=Comments (0)')).toBeVisible();
    await expect(page.locator('text=Items')).toBeVisible();
    await expect(page.locator('text=Vendor Record Updates')).toBeVisible();
    
    // Check for inbox items
    await expect(page.locator('text=Accounts Payable Team Enea')).toBeVisible();
    await expect(page.locator('text=João Raphael Titão Vale')).toBeVisible();
    await expect(page.locator('text=Li Zhiming')).toBeVisible();
    await expect(page.locator('text=Aaron Bern')).toBeVisible();
  });
  
  test('should have correct Activity panel layout', async ({ page }) => {
    await page.goto('http://localhost:3001/helpdesk');
    await page.waitForSelector('.flex-1.flex', { timeout: 10000 });
    
    // Check Activity panel structure
    const activityPanel = page.locator('div:has(> div:has(> div > button:has-text("Activity")))').last();
    
    // Verify tabs
    await expect(activityPanel.locator('button:has-text("Activity")').first()).toBeVisible();
    await expect(activityPanel.locator('button:has-text("Comments (0)")')).toBeVisible();
    
    // Verify sections with chevron icons and counts
    const itemsSection = activityPanel.locator('h3:has-text("Items")');
    await expect(itemsSection).toBeVisible();
    await expect(itemsSection.locator('..').locator('span:has-text("0")')).toBeVisible();
    
    const vendorSection = activityPanel.locator('h3:has-text("Vendor Record Updates")');
    await expect(vendorSection).toBeVisible();
    await expect(vendorSection.locator('..').locator('span:has-text("0")')).toBeVisible();
    
    const activitySection = activityPanel.locator('h3:has-text("Activity")').last();
    await expect(activitySection).toBeVisible();
    await expect(activitySection.locator('..').locator('span:has-text("0")')).toBeVisible();
    
    // Verify close button
    await expect(activityPanel.locator('button svg.lucide-x')).toBeVisible();
    
    // Verify bottom action buttons
    await expect(activityPanel.locator('button svg.lucide-more-horizontal')).toBeVisible();
    await expect(activityPanel.locator('button svg.lucide-download')).toBeVisible();
  });
});