const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Race Tracker App', () => {
  const appPath = path.join(__dirname, '..', 'src', 'index.html');
  const appUrl = `file://${appPath}`;

  test('loads the main page', async ({ page }) => {
    await page.goto(appUrl);
    
    // Wait for the app to initialize - check for navigation
    await page.waitForSelector('.main-nav');
    
    // Check that the main navigation is present
    await expect(page.locator('.main-nav')).toBeVisible();
    
    // Take a screenshot of the initial state
    await page.screenshot({ 
      path: 'screenshots/initial-load.png',
      fullPage: true 
    });
  });

  test('can navigate between pages', async ({ page }) => {
    await page.goto(appUrl);
    await page.waitForSelector('.main-nav');
    
    // Check if navigation links are present and clickable
    const navLinks = page.locator('button[data-page]');
    const count = await navLinks.count();
    
    if (count > 0) {
      // Take screenshot of navigation
      await page.screenshot({ 
        path: 'screenshots/navigation.png',
        fullPage: true 
      });
      
      // Try clicking the first navigation item
      await navLinks.first().click();
      await page.waitForTimeout(500); // Wait for page transition
      
      await page.screenshot({ 
        path: 'screenshots/after-navigation.png',
        fullPage: true 
      });
    }
  });

  test('can take screenshots of different app states', async ({ page }) => {
    await page.goto(appUrl);
    await page.waitForSelector('.main-nav');
    
    // Initial state
    await page.screenshot({ 
      path: 'screenshots/app-state-initial.png',
      fullPage: true 
    });
    
    // Try to interact with forms if they exist
    const forms = page.locator('form');
    const formCount = await forms.count();
    
    if (formCount > 0) {
      await page.screenshot({ 
        path: 'screenshots/app-with-forms.png',
        fullPage: true 
      });
    }
    
    // Check for modals or dialogs
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    if (buttonCount > 0) {
      await page.screenshot({ 
        path: 'screenshots/app-with-buttons.png',
        fullPage: true 
      });
    }
  });

  test('can interact with drag and drop elements', async ({ page }) => {
    await page.goto(appUrl);
    await page.waitForSelector('.main-nav');
    
    // Look for draggable elements
    const draggables = page.locator('[draggable="true"], .draggable');
    const draggableCount = await draggables.count();
    
    if (draggableCount > 0) {
      await page.screenshot({ 
        path: 'screenshots/drag-drop-elements.png',
        fullPage: true 
      });
    }
  });

  test('responsive design - mobile view', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(appUrl);
    await page.waitForSelector('.main-nav');
    
    await page.screenshot({ 
      path: 'screenshots/mobile-view.png',
      fullPage: true 
    });
  });

  test('responsive design - tablet view', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(appUrl);
    await page.waitForSelector('.main-nav');
    
    await page.screenshot({ 
      path: 'screenshots/tablet-view.png',
      fullPage: true 
    });
  });
});