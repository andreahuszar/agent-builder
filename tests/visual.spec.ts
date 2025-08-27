import { test, expect } from '@playwright/test';

test.describe('Visual Tests', () => {
  test('homepage layout and navigation', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to fully load
    await page.waitForSelector('h1:has-text("Invoice Processing Workspace")');
    
    // Take a full page screenshot
    await expect(page).toHaveScreenshot('homepage-full.png', { 
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('left navigation styling', async ({ page }) => {
    await page.goto('/');
    
    // Wait for navigation to be visible - using a more specific selector that works with linear gradient
    const navigation = page.locator('div[class*="min-w-16"][class*="flex-shrink-0"]').first();
    await expect(navigation).toBeVisible();
    
    // Take screenshot of just the navigation
    await expect(navigation).toHaveScreenshot('left-navigation.png');
  });

  test('top navigation bar', async ({ page }) => {
    await page.goto('/');
    
    // Wait for header to be visible - using backdrop-blur class which is unique to the header
    const header = page.locator('div[class*="backdrop-blur-md"][class*="border-b"]').first();
    await expect(header).toBeVisible();
    
    // Take screenshot of the header
    await expect(header).toHaveScreenshot('top-navigation.png');
  });

  test('navigation between pages', async ({ page }) => {
    await page.goto('/');
    
    // Wait for initial page to load
    await page.waitForSelector('h1:has-text("Invoice Processing Workspace")');
    
    // Click on Invoices button (now uses button instead of anchor)
    await page.click('button:has-text("Invoices")');
    await page.waitForSelector('h1:has-text("Invoices")');
    await expect(page).toHaveScreenshot('invoices-page.png', { 
      fullPage: true,
      animations: 'disabled'
    });
    
    // Click on Purchase Orders button
    await page.click('button:has-text("Purchase Orders")');
    await page.waitForSelector('h1:has-text("Purchase Orders")');
    await expect(page).toHaveScreenshot('purchase-orders-page.png', { 
      fullPage: true,
      animations: 'disabled'
    });
    
    // Go back to Workspace button
    await page.click('button:has-text("Workspace")');
    await page.waitForSelector('h1:has-text("Invoice Processing Workspace")');
  });

  test('user menu dropdown', async ({ page }) => {
    await page.goto('/');
    
    // Click on user menu button
    const userButton = page.locator('button[title="dariusz"]');
    await userButton.click();
    
    // Wait for dropdown to appear
    await page.waitForSelector('text=dariusz@example.com');
    
    // Take screenshot with dropdown open
    await expect(page).toHaveScreenshot('user-menu-open.png', { 
      fullPage: true,
      animations: 'disabled'
    });
  });
});