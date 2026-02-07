import { test, expect, devices } from '@playwright/test';
import { TEST_USER_EMAIL, TEST_USER_PASSWORD } from '../test-constants';

test.use({ ...devices['iPhone 13'] });

test.describe('Mobile Responsiveness & Navigation', () => {

    test('should show mobile-friendly navigation and sidebar', async ({ page }) => {
        // 1. Login
        await page.goto('/auth/login');
        await page.getByLabel(/email/i).fill(TEST_USER_EMAIL);
        await page.getByLabel(/password/i).fill(TEST_USER_PASSWORD);
        await page.getByRole('button', { name: /sign in/i }).click();

        await expect(page).toHaveURL(/\/dashboard/);

        // 2. Verify Sidebar is hidden by default and Toggle exists
        // ShadCN sidebar uses a button with "sr-only" or specific class for toggle
        // Usually a menu icon
        const sidebarToggle = page.locator('button[data-sidebar="trigger"]');
        await expect(sidebarToggle).toBeVisible();

        // 3. Open Sidebar
        await sidebarToggle.click();

        // 4. Verify Sidebar items are visible
        await expect(page.getByRole('link', { name: /sessions/i }).first()).toBeVisible();
        await expect(page.getByRole('link', { name: /clients/i }).first()).toBeVisible();

        // 5. Navigate via mobile sidebar
        await page.getByRole('link', { name: /analytics/i }).first().click();
        await expect(page).toHaveURL(/\/analytics/);

        // 6. Verify layout adjustments for mobile
        // Check if cards are stacked or certain desktop-only elements are hidden
        // For example, the user profile in header might be different
        await expect(page.getByText('Analytics Dashboard')).toBeVisible();
    });
});
