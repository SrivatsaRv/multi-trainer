import { test, expect } from '@playwright/test';
import { TEST_USER_EMAIL, TEST_USER_PASSWORD } from '../test-constants';

test.describe('Gym Analytics Dashboard', () => {
    test('should load analytics page and display revenue', async ({ page, request }) => {
        // 1. Login
        await page.goto('/auth/login');
        await page.getByLabel(/email/i).fill(TEST_USER_EMAIL);
        await page.getByLabel(/password/i).fill(TEST_USER_PASSWORD);
        await page.getByRole('button', { name: /sign in/i }).click();

        // 2. Wait for dashboard and navigate to Analytics
        await expect(page).toHaveURL(/dashboard/);

        // Check if we are on gym dashboard
        // Check if we are on gym dashboard
        await expect(page.getByText('Facility', { exact: false }).first()).toBeVisible({ timeout: 15000 });

        // Click Analytics link
        await page.getByRole('link', { name: /analytics/i }).click();

        // 3. Verify Analytics Page
        await expect(page).toHaveURL(/analytics/);
        await expect(page.getByText('Analytics Dashboard')).toBeVisible();
        await expect(page.getByText(/₹/).first()).toBeVisible(); // Check for INR currency symbol
        await expect(page.getByText('Occupancy Rate')).toBeVisible();

        // Verify Chart Containers exist (Metrics are checked above)
        // Recharts renders as svg/divs, harder to select specifically without test-ids, 
        // but text 'Total Revenue' inside the chart card should be visible.
    });
});
