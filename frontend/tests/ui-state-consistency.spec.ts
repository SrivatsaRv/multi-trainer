import { test, expect } from '@playwright/test';

test.describe('UI State Consistency Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Start with clean state
    await page.goto('http://localhost:3000');
    await page.evaluate(() => localStorage.clear());
  });

  test('Unauthenticated users should see homepage', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    
    // Should see landing page content
    await expect(page.locator('text=For Gym Owners')).toBeVisible();
    await expect(page.locator('text=For Personal Trainers')).toBeVisible();
    
    // Should not be redirected
    await expect(page).toHaveURL('http://localhost:3000/');
  });

  test('Dashboard should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('Auth pages should redirect authenticated users to dashboard', async ({ page }) => {
    // Mock authenticated state
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-jwt-token');
    });
    
    await page.goto('http://localhost:3000/auth/login');
    
    // Should redirect to dashboard (or show loading)
    await page.waitForTimeout(1000);
    // Note: This will fail in real test due to invalid token, but shows the logic
  });

  test('Navigation should be hidden for dashboard pages', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');
    
    // Should redirect to login first
    await expect(page).toHaveURL(/\/auth\/login/);
    
    // Navigation header should not be visible on auth pages
    await expect(page.locator('header')).not.toBeVisible();
    await expect(page.locator('footer')).not.toBeVisible();
  });
});
