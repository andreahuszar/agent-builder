import { test, expect } from '@playwright/test';

test.describe('CSS Framework Validation', () => {
  
  test.describe('Tailwind CSS Functionality', () => {
    test('basic tailwind classes are applied correctly', async ({ page }) => {
      await page.goto('/');
      
      // Test that basic Tailwind classes work
      // Check if purple colors are actually applied
      const workspaceButton = page.locator('button:has-text("Workspace")');
      await expect(workspaceButton).toBeVisible();
      
      // Get computed styles to verify Tailwind is working
      const bgColor = await workspaceButton.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });
      
      // bg-purple-900 should result in rgb(88, 28, 135) or similar darker purple
      expect(bgColor).toContain('rgb(88, 28, 135)'); // Tailwind purple-900
    });

    test('gradient backgrounds are rendered correctly', async ({ page }) => {
      await page.goto('/');
      
      // Check that the linear gradient on sidebar is actually rendered
      const sidebar = page.locator('div[class*="min-w-16"][class*="flex-shrink-0"]').first();
      await expect(sidebar).toBeVisible();
      
      const bgImage = await sidebar.evaluate((el) => {
        return window.getComputedStyle(el).backgroundImage;
      });
      
      // Should contain linear-gradient and the specific colors
      expect(bgImage).toContain('linear-gradient');
      expect(bgImage).toContain('rgb(11, 11, 69)'); // First gradient color
    });

    test('responsive classes work correctly', async ({ page, isMobile }) => {
      await page.goto('/');
      
      // Test responsive padding classes (px-4 sm:px-6 lg:px-8)
      const headerContainer = page.locator('div[class*="backdrop-blur-md"] div[class*="px-4"]').first();
      await expect(headerContainer).toBeVisible();
      
      const paddingLeft = await headerContainer.evaluate((el) => {
        return window.getComputedStyle(el).paddingLeft;
      });
      
      // On mobile (px-4) should be 16px, on larger screens should be more
      if (isMobile) {
        expect(paddingLeft).toBe('16px'); // px-4 = 1rem = 16px
      } else {
        // Should be larger on desktop (px-6 or px-8)
        expect(parseInt(paddingLeft)).toBeGreaterThan(16);
      }
    });

    test('hover states work correctly', async ({ page }) => {
      await page.goto('/');
      
      // Test hover state on inactive navigation pill
      const invoicesButton = page.locator('button:has-text("Invoices")');
      await expect(invoicesButton).toBeVisible();
      
      // Get initial background color (should be transparent/gray)
      const initialBgColor = await invoicesButton.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });
      
      // Hover and check if color changes
      await invoicesButton.hover();
      
      const hoveredBgColor = await invoicesButton.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });
      
      // Background should change on hover (hover:bg-gray-100)
      expect(hoveredBgColor).not.toBe(initialBgColor);
    });

    test('rounded corners are applied', async ({ page }) => {
      await page.goto('/');
      
      // Test rounded-full class on navigation pills
      const workspaceButton = page.locator('button:has-text("Workspace")');
      await expect(workspaceButton).toBeVisible();
      
      const borderRadius = await workspaceButton.evaluate((el) => {
        return window.getComputedStyle(el).borderRadius;
      });
      
      // rounded-full should result in 9999px border radius
      expect(borderRadius).toBe('9999px');
    });

    test('flexbox classes work correctly', async ({ page }) => {
      await page.goto('/');
      
      // Test flex layout on main container
      const mainContainer = page.locator('div.min-h-screen').first();
      await expect(mainContainer).toBeVisible();
      
      const display = await mainContainer.evaluate((el) => {
        return window.getComputedStyle(el).display;
      });
      
      expect(display).toBe('flex');
    });

    test('typography classes are applied', async ({ page }) => {
      await page.goto('/');
      
      // Test text sizing and font weights
      const mainHeading = page.locator('h1:has-text("Invoice Processing Workspace")');
      await expect(mainHeading).toBeVisible();
      
      const fontSize = await mainHeading.evaluate((el) => {
        return window.getComputedStyle(el).fontSize;
      });
      
      const fontWeight = await mainHeading.evaluate((el) => {
        return window.getComputedStyle(el).fontWeight;
      });
      
      // text-2xl should be 24px, font-bold should be 700
      expect(fontSize).toBe('24px'); // text-2xl
      expect(fontWeight).toBe('700'); // font-bold
    });
  });

  test.describe('Custom Theme Colors', () => {
    test('purple theme colors are loaded correctly', async ({ page }) => {
      await page.goto('/');
      
      // Test our custom purple colors work
      const activeButton = page.locator('button[class*="bg-purple-600"]');
      await expect(activeButton).toBeVisible();
      
      // Take screenshot to visually verify purple colors
      await expect(activeButton).toHaveScreenshot('purple-button-theme-test.png');
    });

    test('gradient theme is properly applied', async ({ page }) => {
      await page.goto('/');
      
      const sidebar = page.locator('div[class*="min-w-16"][class*="flex-shrink-0"]').first();
      await expect(sidebar).toBeVisible();
      
      // Visual test for gradient theme
      await expect(sidebar).toHaveScreenshot('gradient-theme-test.png');
    });
  });

  test.describe('Framework Integration', () => {
    test('barlow font is loaded and applied', async ({ page }) => {
      await page.goto('/');
      
      // Check if Barlow font is actually loaded and applied
      const body = page.locator('body');
      
      const fontFamily = await body.evaluate((el) => {
        return window.getComputedStyle(el).fontFamily;
      });
      
      // Should contain Barlow as the primary font
      expect(fontFamily).toContain('Barlow');
    });

    test('css imports are working', async ({ page }) => {
      await page.goto('/');
      
      // Wait for initial render
      await page.waitForSelector('h1:has-text("Invoice Processing Workspace")');
      
      // Check that CSS is loaded by verifying styles are applied
      const hasStyles = await page.evaluate(() => {
        // Check if any Tailwind styles are applied by looking for computed styles
        const testElement = document.querySelector('button');
        if (!testElement) return false;
        
        const computedStyle = window.getComputedStyle(testElement);
        return computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' || 
               computedStyle.padding !== '0px' ||
               computedStyle.borderRadius !== '0px';
      });
      
      expect(hasStyles).toBe(true);
    });
  });

  test.describe('PostCSS Configuration', () => {
    test('autoprefixer is working', async ({ page }) => {
      await page.goto('/');
      
      // Check for vendor prefixes in backdrop-blur
      const header = page.locator('div[class*="backdrop-blur-md"]').first();
      await expect(header).toBeVisible();
      
      const backdropFilter = await header.evaluate((el) => {
        return window.getComputedStyle(el).backdropFilter || 
               (window.getComputedStyle(el) as any).webkitBackdropFilter;
      });
      
      // Should have backdrop-filter (with or without webkit prefix)
      expect(backdropFilter).toBeTruthy();
      expect(backdropFilter).toContain('blur');
    });
  });
});