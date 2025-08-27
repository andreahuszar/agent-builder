import { test, expect } from '@playwright/test';
import { createTestHelpers, ViewportHelpers } from './utils/testing-helpers';

test.describe('Responsive Visual Tests', () => {
  
  test.describe('Navigation Responsive Behavior', () => {
    test('sidebar navigation across viewports', async ({ page }) => {
      await page.goto('/');
      
      const { navigation, viewport } = createTestHelpers(page);
      const sidebar = await navigation.getSidebar();
      
      // Test navigation at different viewport sizes
      await viewport.testResponsiveComponent(
        sidebar,
        'sidebar-navigation',
        ViewportHelpers.STANDARD_VIEWPORTS
      );
    });

    test('top navigation pills across viewports', async ({ page }) => {
      await page.goto('/');
      
      const { navigation, viewport } = createTestHelpers(page);
      const navPills = await navigation.getNavPills();
      
      // Test navigation pills responsive behavior
      await viewport.testResponsiveComponent(
        navPills,
        'navigation-pills',
        ViewportHelpers.STANDARD_VIEWPORTS
      );
    });

    test('header layout across viewports', async ({ page }) => {
      await page.goto('/');
      
      const { navigation, viewport } = createTestHelpers(page);
      const header = await navigation.getHeader();
      
      // Test full header responsive behavior
      await viewport.testResponsiveComponent(
        header,
        'header-layout',
        ViewportHelpers.STANDARD_VIEWPORTS
      );
    });
  });

  test.describe('Main Content Responsive Behavior', () => {
    test('workspace content across viewports', async ({ page }) => {
      await page.goto('/');
      
      const { component, viewport } = createTestHelpers(page);
      await component.waitForPageLoad();
      
      const mainContent = await component.getMainContent();
      
      await viewport.testResponsiveComponent(
        mainContent,
        'main-content-workspace',
        ViewportHelpers.STANDARD_VIEWPORTS
      );
    });

    test('invoices content across viewports', async ({ page }) => {
      await page.goto('/');
      
      const { navigation, component, viewport } = createTestHelpers(page);
      
      // Navigate to invoices
      await navigation.navigateTo('Invoices');
      const mainContent = await component.getMainContent();
      
      await viewport.testResponsiveComponent(
        mainContent,
        'main-content-invoices',
        ViewportHelpers.STANDARD_VIEWPORTS
      );
    });

    test('purchase orders content across viewports', async ({ page }) => {
      await page.goto('/');
      
      const { navigation, component, viewport } = createTestHelpers(page);
      
      // Navigate to purchase orders
      await navigation.navigateTo('Purchase Orders');
      const mainContent = await component.getMainContent();
      
      await viewport.testResponsiveComponent(
        mainContent,
        'main-content-purchase-orders',
        ViewportHelpers.STANDARD_VIEWPORTS
      );
    });
  });

  test.describe('User Menu Responsive Behavior', () => {
    test('user menu button across viewports', async ({ page }) => {
      await page.goto('/');
      
      const { userMenu, viewport } = createTestHelpers(page);
      const userMenuArea = await userMenu.getUserMenuArea();
      
      await viewport.testResponsiveComponent(
        userMenuArea,
        'user-menu-button',
        ViewportHelpers.STANDARD_VIEWPORTS
      );
    });

    test('user menu dropdown across viewports', async ({ page }) => {
      await page.goto('/');
      
      const { userMenu, viewport } = createTestHelpers(page);
      
      // Test dropdown at different viewport sizes
      for (const viewportSize of ViewportHelpers.STANDARD_VIEWPORTS) {
        await page.setViewportSize({ width: viewportSize.width, height: viewportSize.height });
        
        // Open menu for each viewport size
        await userMenu.openUserMenu();
        await userMenu.verifyMenuOpen();
        
        // Take screenshot of the opened menu
        await expect(page).toHaveScreenshot(`user-menu-dropdown-${viewportSize.name}.png`, {
          fullPage: true,
          animations: 'disabled'
        });
        
        // Close menu by clicking elsewhere
        await page.click('h1'); // Click on heading to close menu
        await userMenu.verifyMenuClosed();
      }
    });
  });

  test.describe('Full Page Layout Responsive Tests', () => {
    test('complete layout across viewports', async ({ page }) => {
      await page.goto('/');
      
      const { component, viewport } = createTestHelpers(page);
      await component.waitForPageLoad();
      
      // Test complete page layout at different sizes
      for (const viewportSize of ViewportHelpers.STANDARD_VIEWPORTS) {
        await page.setViewportSize({ width: viewportSize.width, height: viewportSize.height });
        
        await expect(page).toHaveScreenshot(`full-layout-${viewportSize.name}.png`, {
          fullPage: true,
          animations: 'disabled'
        });
      }
    });

    test('layout with active states across viewports', async ({ page }) => {
      await page.goto('/');
      
      const { navigation, userMenu, component, viewport } = createTestHelpers(page);
      await component.waitForPageLoad();
      
      for (const viewportSize of ViewportHelpers.STANDARD_VIEWPORTS) {
        await page.setViewportSize({ width: viewportSize.width, height: viewportSize.height });
        
        // Test with Invoices active
        await navigation.navigateTo('Invoices');
        await navigation.verifyActivePill('Invoices');
        
        await expect(page).toHaveScreenshot(`layout-invoices-active-${viewportSize.name}.png`, {
          fullPage: true,
          animations: 'disabled'
        });
        
        // Test with Purchase Orders active
        await navigation.navigateTo('Purchase Orders');
        await navigation.verifyActivePill('Purchase Orders');
        
        await expect(page).toHaveScreenshot(`layout-purchase-orders-active-${viewportSize.name}.png`, {
          fullPage: true,
          animations: 'disabled'
        });
        
        // Return to workspace
        await navigation.navigateTo('Workspace');
      }
    });
  });

  test.describe('Mobile Specific Tests', () => {
    test('mobile navigation behavior', async ({ page }) => {
      // Set to mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      
      const { navigation, component } = createTestHelpers(page);
      await component.waitForPageLoad();
      
      // Verify navigation is still accessible on mobile
      const sidebar = await navigation.getSidebar();
      await expect(sidebar).toBeVisible();
      
      const navPills = await navigation.getNavPills();
      await expect(navPills).toBeVisible();
      
      // Test navigation functionality on mobile
      await navigation.navigateTo('Invoices');
      await navigation.verifyActivePill('Invoices');
      
      await expect(page).toHaveScreenshot('mobile-invoices-view.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('mobile user menu interaction', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      
      const { userMenu, component } = createTestHelpers(page);
      await component.waitForPageLoad();
      
      // Test user menu on mobile
      await userMenu.openUserMenu();
      await userMenu.verifyMenuOpen();
      
      await expect(page).toHaveScreenshot('mobile-user-menu-open.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });

  test.describe('Large Desktop Tests', () => {
    test('large desktop layout optimization', async ({ page }) => {
      // Set to large desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/');
      
      const { component } = createTestHelpers(page);
      await component.waitForPageLoad();
      
      // Verify layout uses space efficiently on large screens
      await expect(page).toHaveScreenshot('large-desktop-layout.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });

  test.describe('Tablet Tests', () => {
    test('tablet portrait layout', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/');
      
      const { navigation, component } = createTestHelpers(page);
      await component.waitForPageLoad();
      
      // Test navigation flow on tablet
      await navigation.navigateTo('Invoices');
      await expect(page).toHaveScreenshot('tablet-portrait-invoices.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('tablet landscape layout', async ({ page }) => {
      await page.setViewportSize({ width: 1024, height: 768 });
      await page.goto('/');
      
      const { navigation, component } = createTestHelpers(page);
      await component.waitForPageLoad();
      
      // Test navigation flow on tablet landscape
      await navigation.navigateTo('Purchase Orders');
      await expect(page).toHaveScreenshot('tablet-landscape-purchase-orders.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });
});