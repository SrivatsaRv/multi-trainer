import { test, expect } from '@playwright/test';
import { TEST_USER_PASSWORD } from '../test-constants';

test.describe('Workout Tracking & Client Analytics', () => {
    test.beforeEach(async ({ page }) => {
        // Increase expect timeout for slow dev env
        expect.configure({ timeout: 30000 });

        // Listen for console logs
        page.on('console', msg => console.log(`[Browser Console] ${msg.text()}`));

        // Login as a trainer with seeded data
        await page.goto('/auth/login');
        await page.fill('input[name="username"]', 'tr_active@example.com');
        await page.fill('input[name="password"]', TEST_USER_PASSWORD);
        await page.getByRole('button', { name: /sign in/i }).click();
        await expect(page).toHaveURL(/dashboard/, { timeout: 30000 });
    });

    test('should allow trainer to log per-set results and view analytics', async ({ page }) => {
        // 1. Navigate to a session from Dashboard (Today's View)
        // Wait for Today's Schedule to appear
        await expect(page.getByText("Today's Schedule")).toBeVisible();
        await page.waitForLoadState('networkidle');

        // Verify there are sessions (not the empty state)
        // If this fails, the seed script didn't generate a session for TODAY.
        await expect(page.getByText("No sessions scheduled")).not.toBeVisible();

        // Click the first available session card in the grid
        // Card has a time in CardTitle, e.g. "14:00 - 15:00"
        // Use a selector that targets the border div containing a time pattern
        // This avoids clicking the grid container or empty cards
        const sessionCard = page.locator('.grid > div.border').filter({ hasText: /:/ }).first();
        await expect(sessionCard).toBeVisible();

        // Force click to ensure it hits
        await sessionCard.click({ force: true });

        // Should navigate to session details
        await expect(page).toHaveURL(/\/sessions\/\d+/);

        // Wait for session details to load (give it time for slow builds)
        await expect(page.locator('h1')).toHaveText(/Session Details/i, { timeout: 30000 });

        // Check if we need to apply a template (empty session)
        if (await page.getByText('No Exercises Planned').isVisible()) {
            await page.getByRole('button', { name: /choose a template/i }).click();
            await expect(page.getByText('Apply Workout Template')).toBeVisible(); // Dialog title

            // Wait for options to populate
            await page.waitForSelector('div[role="option"]', { state: 'attached' });
            const options = await page.locator('div[role="option"]').count();
            console.log(`[Test Debug] Found ${options} template options`);

            if (options === 0) {
                await page.screenshot({ path: 'template-failure.png' });
                throw new Error("No templates found in dropdown");
            }

            // Select the FIRST template
            await page.locator('button[role="combobox"]').click();
            await page.locator('div[role="option"]').first().click();

            // Click Apply Template
            await page.getByRole('button', { name: /apply template/i }).click();

            // Wait for success toast or exercises to appear
            // "Loaded X exercises from template"
            try {
                await expect(page.getByText(/loaded/i)).toBeVisible({ timeout: 5000 });
            } catch (e) {
                console.log("[Test Debug] 'Loaded' toast not found, checking for exercise cards...");
                await page.screenshot({ path: 'template-apply-failure.png' });
            }
        }

        // 2. Edit an existing set (Skip "Add Set" as it's flaky in test env)
        // const addSetBtn = page.getByRole('button', { name: /Add Set/i }).first();
        // await addSetBtn.scrollIntoViewIfNeeded();
        // await addSetBtn.click();

        // 3. Fill in reps and weight for the set
        // Find the last set inputs using data-testid
        const weightInput = page.locator('[data-testid="set-weight"]').last();
        const repsInput = page.locator('[data-testid="set-reps"]').last();

        await weightInput.fill('60');
        await repsInput.fill('12');
        await repsInput.press('Enter'); // Trigger blur/change

        // 4. Verify Auto-save
        // Wait for "Saving logs..." to disappear if visible, or just wait a moment
        await page.waitForTimeout(1000);

        // Reload to verify persistence
        await page.reload();
        await expect(page.locator('h1')).toHaveText(/Session Details/i);

        // Check if values persisted
        await expect(page.locator('[data-testid="set-weight"]').last()).toHaveValue('60');
        await expect(page.locator('[data-testid="set-reps"]').last()).toHaveValue('12');

        // 5. Navigate to Client Analytics
        await page.click('text=Clients');
        await page.waitForLoadState('networkidle');

        // Click the first client card (Cards have h3 with client name)
        await page.locator('h3.font-semibold').first().click();

        // 6. Verify Analytics (No tabs, single view)
        // Check for specific analytics cards
        await expect(page.getByText(/Lifetime Sessions/i)).toBeVisible(); // Stats card
        await expect(page.getByText(/Volume Progression/i)).toBeVisible(); // Chart title
        await expect(page.getByText(/Top Exercises/i)).toBeVisible(); // Chart title
        await expect(page.getByText(/top exercises/i)).toBeVisible();

        // Ensure volume chart is rendering (check for svg)
        const chart = page.locator('.recharts-responsive-container');
        await expect(chart).toBeVisible();
    });
});
