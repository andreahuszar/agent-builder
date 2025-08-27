const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  await page.waitForSelector('h1:has-text("Invoice Processing Workspace")');
  await page.screenshot({ path: 'current-state.png', fullPage: true });
  console.log('Screenshot saved as current-state.png');
  await browser.close();
})();