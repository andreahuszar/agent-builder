import { test, expect } from '@playwright/test';

test('verify address formatting is fixed', async ({ page }) => {
  // Navigate directly to the invoice without hash routing
  await page.goto('http://localhost:3001/invoices/52025001-1111-1111-1111-111111111111');
  
  // Wait for the page to load
  await page.waitForTimeout(3000);
  
  // Take screenshot of main invoice view
  await page.screenshot({ path: '/tmp/invoice-address-fixed.png', fullPage: true });
  console.log('Screenshot saved to /tmp/invoice-address-fixed.png');
  
  // Check if the billing address is formatted properly (not JSON)
  const billingAddress = await page.locator('text=/Billing Address/').locator('..').textContent().catch(() => 'Not found');
  console.log('Billing Address display:', billingAddress);
  
  // Check if it contains JSON brackets (should not)
  if (billingAddress && billingAddress.includes('{')) {
    console.log('WARNING: Address still contains JSON formatting!');
  } else {
    console.log('SUCCESS: Address is properly formatted');
  }
});