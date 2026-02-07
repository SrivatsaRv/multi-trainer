import { test, expect } from '@playwright/test';
import { TEST_USER_PASSWORD } from '../test-constants';

test.describe('Workout Tracking & Client Analytics', () => {
    test.beforeEach(async ({ page }) => {
        // Login as a trainer with seeded data
        await page.goto('/auth/login');
        await page.fill('input[name="username"]', 'tr_active@example.com');
        await page.fill('input[name="password"]', TEST_USER_PASSWORD);
        await page.getByRole('button', { name: /sign in/i }).click();
        await expect(page).toHaveURL(/dashboard/);
    });

    test('should allow trainer to log per-set results and view analytics', async ({ page }) => {
        // 1. Navigate to a session
        await page.click('text=Sessions');
        await page.waitForLoadState('networkidle');

        // Click the first session card
        const sessionCard = page.locator('div[class*="border-primary/50"]').first().or(page.locator('div[class*="card"]').first());
        await sessionCard.click();
        await expect(page).toHaveURL(/\/sessions\/\d+/);

        // 2. Add and log a set
        // Expect at least one exercise to be loadable or present
        if (await page.getByText('No exercises logged').isVisible()) {
            await page.getByRole('button', { name: /load template/i }).click();
            await page.getByRole('button', { name: /load workout/i }).click();
            await expect(page.getByText('Workout logs saved')).toBeVisible();
        }

        const addSetBtn = page.getByRole('button', { name: /\+ Add Set/i }).first();
        await addSetBtn.click();

        // 3. Fill in reps and weight for the new set
        // Find the last set in the first exercise
        const sets = page.locator('div.grid.grid-cols-12.gap-2.items-center');
        const lastSet = sets.last();

        const weightInput = lastSet.locator('input[placeholder="Kg"]');
        const repsInput = lastSet.locator('input[placeholder="Reps"]');

        await weightInput.fill('60');
        await repsInput.fill('12');
        await repsInput.press('Enter'); // Trigger blur/change

        // 4. Verify Auto-save
        // The UI now auto-saves, we expect a toast "Workout logs saved"
        await expect(page.getByText(/workout logs saved/i)).toBeVisible();

        // 5. Navigate to Client Analytics
        await page.click('text=Clients');
        await page.waitForLoadState('networkidle');
        await page.click('text=Sam'); // Assuming "Sam" is the client

        // 6. Verify Analytics Tab
        await page.getByRole('tab', { name: /performance analytics/i }).click();

        // Check for charts and top exercises
        await expect(page.getByText(/total training volume/i)).toBeVisible();
        await expect(page.getByText(/top exercises/i)).toBeVisible();

        // Ensure volume chart is rendering (check for svg)
        const chart = page.locator('.recharts-responsive-container');
        await expect(chart).toBeVisible();
    });
});
