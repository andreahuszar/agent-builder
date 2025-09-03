import { test, expect } from '@playwright/test';

test.describe('Invoice Detail Page', () => {
  test('should display diagnostic banner and vendor info', async ({ page }) => {
    // Navigate to a specific invoice
    await page.goto('/invoices/11100005-5555-5555-5555-555555555555');
    
    // Wait for page to load
    await page.waitForSelector('h1:has-text("Invoice #INV-2024-0005")');
    
    // Check vendor name is displayed under invoice number
    const vendorName = await page.locator('p.text-xs.text-gray-600').textContent();
    expect(vendorName).toContain('Global IT Services');
    
    // Check diagnostic banner is present (with light purple background)
    // The diagnostic banner is the second border-b element (first is top bar)
    const diagnosticBanner = page.locator('.border-b.border-gray-200').nth(1);
    await expect(diagnosticBanner).toBeVisible();
    
    // Check diagnostic banner contains key elements
    const bannerText = await diagnosticBanner.textContent();
    
    // Should show total amount
    expect(bannerText).toMatch(/\$\d+(\.\d+)?[KM]?/);
    
    // Should show PO status
    expect(bannerText).toMatch(/(PO-\d{4}-\d{4}|No PO)/);
    
    // Should show receipt status  
    expect(bannerText).toMatch(/(GR Complete|SES Complete|No GR\/SES|Partial Receipt)/);
    
    // Check that helpdesk ticket is in the diagnostic banner (if present)
    const helpdeskPill = diagnosticBanner.locator('a[href="/helpdesk"]');
    const hasHelpdesk = await helpdeskPill.count() > 0;
    if (hasHelpdesk) {
      await expect(helpdeskPill).toBeVisible();
    }
    
    // Check that workflow progress is in the top bar
    const workflowText = page.locator('text=Under Review').first();
    await expect(workflowText).toBeVisible();
    
    // Check view mode switcher is present
    const viewModeSwitcher = page.locator('button:has-text("Review")');
    await expect(viewModeSwitcher).toBeVisible();
  });

  test('should have compact workflow progress in top bar', async ({ page }) => {
    await page.goto('/invoices/11100005-5555-5555-5555-555555555555');
    
    // Wait for page to load
    await page.waitForSelector('h1:has-text("Invoice #INV-2024-0005")');
    
    // Check workflow progress is in the top bar (centered)
    const topBar = page.locator('.border-b.border-gray-200');
    
    // Check for workflow dots - they appear as colored circles
    const workflowDots = topBar.locator('[class*="rounded-full"][class*="bg-"]');
    const dotCount = await workflowDots.count();
    expect(dotCount).toBeGreaterThan(0);
    
    // Check current step label is visible
    const currentStepLabel = page.locator('text=Under Review');
    await expect(currentStepLabel).toBeVisible();
  });
});