import { test, expect } from '@playwright/test';
import { TEST_USER_EMAIL, TEST_USER_PASSWORD } from '../test-constants';

test.describe('Trainer Session Execution Flow', () => {
    test('should allow trainer to view and complete a session', async ({ page, request }) => {
        // 1. Login as Trainer (using seeded active trainer)
        await page.goto('/auth/login');
        await page.fill('input[name="username"]', 'tr_active@example.com');
        await page.fill('input[name="password"]', TEST_USER_PASSWORD);
        await page.getByRole('button', { name: /sign in/i }).click();

        // 2. Verify Dashboard
        await page.waitForLoadState('networkidle');
        // 3. Click on a session card from Today's Schedule on the Dashboard
        // Find Today's Schedule section first
        const scheduleSection = page.locator('div:has(h2:has-text("Today\'s Schedule"))');
        await expect(scheduleSection).toBeVisible();

        // Find a session card within that section (div with card class and a time colon)
        const sessionCard = scheduleSection.locator('div[class*="card"]').filter({ hasText: /:/ }).first();
        await expect(sessionCard).toBeVisible();
        await sessionCard.click();

        // 4. Verify navigation to detail page
        // (Wait handled by sessionCard.click() usually, but be explicit)
        await page.waitForURL(/\/sessions\/\d+/);

        // 5. Verify Session Detail Page
        // URL should contain /sessions/\d+
        await expect(page).toHaveURL(/\/sessions\/\d+/);
        await expect(page.getByText('Session Details')).toBeVisible();
        await expect(page.getByText('Workout Log')).toBeVisible();

        // 6. Verify Actions
        const completeBtn = page.getByRole('button', { name: /mark as complete/i });
        await expect(completeBtn).toBeVisible();

        // 7. Complete Session
        await completeBtn.click();

        // 8. Verify Status Update
        await expect(page.getByText('Session marked as COMPLETED')).toBeVisible();
        await expect(page.getByText('COMPLETED', { exact: true })).toBeVisible();
    });
});
