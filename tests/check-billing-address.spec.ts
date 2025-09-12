import { test, expect } from '@playwright/test';

test('check billing address in payment section', async ({ page }) => {
  // Navigate directly to the invoice
  await page.goto('http://localhost:3001/invoices/52025001-1111-1111-1111-111111111111');
  
  // Wait for the page to load
  await page.waitForTimeout(3000);
  
  // Scroll to the payment information section
  const paymentSection = page.locator('text=PAYMENT INFORMATION');
  await paymentSection.scrollIntoViewIfNeeded();
  
  // Wait a bit for scroll to complete
  await page.waitForTimeout(1000);
  
  // Find the billing address field
  const billingAddressLabel = page.locator('text=Billing Address');
  const billingAddressContainer = billingAddressLabel.locator('..');
  
  // Wait for the address to render
  await page.waitForTimeout(500);
  
  // Get the text content more specifically
  const addressText = await billingAddressContainer.textContent();
  console.log('Full Billing Address section:', addressText);
  
  // Also try to get just the address value (not the label)
  const addressValue = await page.locator('text=Billing Address').locator('..').locator('p').textContent().catch(() => null);
  console.log('Address value only:', addressValue);
  
  // Check if it contains JSON formatting (it shouldn't)
  if (addressText && addressText.includes('{')) {
    console.log('ERROR: Address still contains JSON formatting:', addressText);
  } else if (addressValue && addressValue.includes('2000 Technology Drive')) {
    console.log('SUCCESS: Address is properly formatted with vendor street address');
  } else {
    console.log('INFO: Address might be empty or not displaying properly');
  }
  
  // Take a screenshot focused on the payment section
  await page.screenshot({ path: '/tmp/billing-address-section.png', fullPage: false });
  console.log('Screenshot saved to /tmp/billing-address-section.png');
});