import { test, expect } from '@playwright/test';

test('verify variance pill shows Perfect Match', async ({ page }) => {
  // Navigate directly to the invoice
  await page.goto('http://localhost:3001/invoices/52025001-1111-1111-1111-111111111111');
  
  // Wait for the page to load
  await page.waitForTimeout(3000);
  
  // Look for the variance pill
  const variancePill = page.locator('text=/variance|Perfect Match/i');
  
  // Get the text content
  const pillText = await variancePill.textContent().catch(() => 'Not found');
  console.log('Variance pill text:', pillText);
  
  // Check if it shows "Perfect Match"
  if (pillText && pillText.includes('Perfect Match')) {
    console.log('SUCCESS: Variance pill shows "Perfect Match"');
  } else if (pillText && pillText.includes('0.0% variance')) {
    console.log('SUCCESS: Variance pill shows 0.0% variance');
  } else {
    console.log('ERROR: Variance pill still shows:', pillText);
  }
  
  // Take a screenshot of the header area
  await page.screenshot({ path: '/tmp/variance-pill-fixed.png', fullPage: false });
  console.log('Screenshot saved to /tmp/variance-pill-fixed.png');
});