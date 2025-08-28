import { test, expect } from '@playwright/test';

test.describe('Visual Tests', () => {
  test('homepage layout and navigation', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to fully load
    await page.waitForSelector('h1:has-text("Invoice Processing Dashboard")');
    
    // Take a full page screenshot
    await expect(page).toHaveScreenshot('homepage-full.png', { 
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('left navigation styling', async ({ page }) => {
    await page.goto('/');
    
    // Wait for navigation to be visible
    const navigation = page.locator('nav#main-navigation');
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
    await page.waitForSelector('h1:has-text("Invoice Processing Dashboard")');
    
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
    await page.click('button:has-text("Dashboard")');
    await page.waitForSelector('h1:has-text("Invoice Processing Dashboard")');
  });

  test('helpdesk page navigation', async ({ page }) => {
    await page.goto('/helpdesk');
    
    // Wait for helpdesk page to load
    await page.waitForSelector('h1:has-text("Helpdesk")');
    
    // Verify Inbox pill is active by default
    const inboxButton = page.locator('button:has-text("Inbox")');
    await expect(inboxButton).toHaveClass(/bg-purple-900/);
    
    // Take screenshot of helpdesk with Inbox active
    await expect(page).toHaveScreenshot('helpdesk-inbox-page.png', { 
      fullPage: true,
      animations: 'disabled'
    });
    
    // Navigate to Kanban
    await page.click('button:has-text("Kanban")');
    await page.waitForSelector('h1:has-text("Helpdesk")');
    
    // Verify Kanban is now active
    const kanbanButton = page.locator('button:has-text("Kanban")');
    await expect(kanbanButton).toHaveClass(/bg-purple-900/);
    
    await expect(page).toHaveScreenshot('helpdesk-kanban-page.png', { 
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('settings page navigation', async ({ page }) => {
    await page.goto('/settings');
    
    // Wait for settings page to load
    await page.waitForSelector('h1:has-text("Settings")');
    
    // Verify Automation pill is active
    const automationButton = page.locator('button:has-text("Automation")');
    await expect(automationButton).toHaveClass(/bg-purple-900/);
    
    // Take screenshot of settings page
    await expect(page).toHaveScreenshot('settings-page.png', { 
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('sidebar navigation hover expansion', async ({ page }) => {
    await page.goto('/');
    
    // Wait for navigation to be visible
    const navigation = page.locator('nav#main-navigation');
    await expect(navigation).toBeVisible();
    
    // Initially sidebar should be collapsed (64px width)
    await expect(navigation).toHaveClass(/w-16/);
    
    // Hover over sidebar to expand it
    await navigation.hover();
    
    // Wait for expansion animation
    await page.waitForTimeout(500);
    
    // Sidebar should now be expanded (position fixed with w-56)
    await expect(navigation).toHaveClass(/fixed/);
    await expect(navigation).toHaveClass(/w-56/);
    
    // Take screenshot of expanded sidebar
    await expect(navigation).toHaveScreenshot('sidebar-expanded.png');
    
    // Move mouse away to collapse
    await page.mouse.move(500, 300);
    await page.waitForTimeout(500);
    
    // Should be collapsed again
    await expect(navigation).toHaveClass(/w-16/);
  });

  // Note: User menu dropdown test removed as UserMenu component doesn't have dropdown functionality
});