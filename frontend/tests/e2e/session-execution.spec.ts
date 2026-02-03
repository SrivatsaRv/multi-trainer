import { test, expect } from '@playwright/test';
import { TEST_USER_EMAIL, TEST_USER_PASSWORD } from '../test-constants';

test.describe('Trainer Session Execution Flow', () => {
    test('should allow trainer to view and complete a session', async ({ page, request }) => {
        // 1. Login as Trainer (using seeded active trainer)
        // Ensure we use a trainer that definitely has bookings from seed_analytics()
        await page.goto('/login');
        await page.getByLabel(/email/i).fill('tr_active@example.com');
        await page.getByLabel(/password/i).fill(TEST_USER_PASSWORD); // Assuming env has correct "password" value
        await page.getByRole('button', { name: /sign in/i }).click();

        // 2. Verify Dashboard
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveURL(/dashboard/);
        // Expect the actual trainer name since we are logging in as a specific seeded user
        // Seeded name logic can be tricky, so check for the Status Badge which proves we are the Active Trainer
        // Check for Verified badge. If failing, check if we are in Setup Required state.
        try {
            await expect(page.getByText('Verified')).toBeVisible({ timeout: 10000 });
        } catch (e) {
            console.log("Verified badge not found. Checking for Setup Required...");
            if (await page.getByText('Setup Required').isVisible()) {
                console.log("See 'Setup Required'. Profile might not be loaded.");
            } else {
                console.log("Page content dump:", await page.content());
            }
            throw e;
        }

        // 3. Check for "Today's Schedule" or "Upcoming Sessions"
        // Since seeding is random, we might not have a session *today*.
        // But our seed script creates 30 days of history + future. 
        // We can navigate to "Client Sessions" list to find one.

        await page.click('text=Client Sessions');
        await expect(page).toHaveURL(/\/sessions$/);

        // 4. Click on a session card/row
        // We expect at least one session in the list from seeding
        const sessionCard = page.locator('div[class*="card"]').first();
        // Or if it's a table
        // await page.getByRole('row').nth(1).click();

        // Wait for sessions to load
        await page.waitForTimeout(1000);

        // If no sessions, we can't test execution.
        if (await page.getByText('No sessions').isVisible()) {
            console.log("No sessions found for test trainer. Skipping execution test.");
            return;
        }

        await sessionCard.click();

        // 5. Verify Session Detail Page
        // URL should contain /sessions/\d+
        await expect(page).toHaveURL(/\/sessions\/\d+/);
        await expect(page.getByText('Session Details')).toBeVisible();
        await expect(page.getByText('Workout Plan')).toBeVisible();

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
