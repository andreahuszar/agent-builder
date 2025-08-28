import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true,
    },
    video: 'retain-on-failure',
  },
  
  /* Visual regression testing settings */
  expect: {
    // Allow small pixel differences (0.2% threshold)
    toHaveScreenshot: { 
      maxDiffPixels: 100,
      threshold: 0.2,
      animations: 'disabled',
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: '**/responsive.spec.ts', // Only run responsive tests on mobile
    },
    {
      name: 'tablet-chrome', 
      use: { ...devices['iPad Pro'] },
      testMatch: '**/responsive.spec.ts', // Only run responsive tests on tablet
    },
  ],

  webServer: {
    command: 'PORT=3001 npm run dev',
    url: 'http://localhost:3001',
    reuseExistingServer: true,
  },
});