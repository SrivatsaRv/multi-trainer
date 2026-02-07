import { test, expect } from '@playwright/test';
import { TEST_USER_EMAIL, TEST_USER_PASSWORD } from '../test-constants';

test.describe('Gym Bookings View', () => {
    test('should load bookings page from dashboard', async ({ page }) => {
        // 1. Login
        await page.goto('/auth/login');
        await page.getByLabel(/email/i).fill(TEST_USER_EMAIL);
        await page.getByLabel(/password/i).fill(TEST_USER_PASSWORD);
        await page.getByRole('button', { name: /sign in/i }).click();

        // 2. Dashboard
        await expect(page).toHaveURL(/dashboard/);

        // 3. Click Bookings link
        await page.getByRole('link', { name: /bookings/i }).click();

        // 4. Verify Page
        await expect(page).toHaveURL(/bookings/);
        await expect(page.getByText('Gym Bookings')).toBeVisible();
        await expect(page.getByText('All Sessions')).toBeVisible();

        // As seeding runs randomly, we might or might not have bookings.
        // We check if table headers are visible.
        await expect(page.getByRole('cell', { name: 'Client' })).toBeVisible();
        await expect(page.getByRole('cell', { name: 'Status' })).toBeVisible();
    });
});
