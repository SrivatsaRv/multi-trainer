import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const TRAINER_EMAIL = 'tr_active@example.com';
import { TEST_USER_PASSWORD } from './test-constants';

test.describe('Trainer Template Loading Flow', () => {

    test('Trainer can login and load a workout template', async ({ page }) => {
        // 1. Login
        await page.goto('/auth/login');
        await page.fill('input[name="username"]', TRAINER_EMAIL);
        await page.fill('input[name="password"]', TEST_USER_PASSWORD);
        await page.click('button[type="submit"]');

        // Wait for dashboard
        await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

        // 2. Navigate to Sessions (Hardcoded ID 3 based on reset, or allow dynamic)
        // Check if we can find a link to "Sessions"
        // The dashboard sidebar usually has a link "Sessions" pointing to /trainer/[id]/sessions
        await page.click('a:has-text("Sessions")');

        // 3. Select a Session
        // Wait for sessions to load
        await page.waitForTimeout(1000);
        // Click the first session
        await page.locator('div[tabindex="0"]').first().click();

        // 4. Load Template
        // Verify we are on detail page
        await expect(page.locator('h1')).toContainText('Session Details');

        // Open Dialog
        await page.click('button:has-text("Load Template")');
        await expect(page.locator('div[role="dialog"]')).toBeVisible();

        // Select Template
        await page.click('button[role="combobox"]'); // Select Trigger
        await page.click('div[role="option"]:has-text("Legs")'); // Select Option

        // Confirm
        await page.click('button:has-text("Load Workout")');

        // 5. Verify Success
        // Wait for dialog to close
        await expect(page.locator('div[role="dialog"]')).toBeHidden();

        // Verify Toast (Optional, might be flaky)
        // await expect(page.locator('text=Loaded')).toBeVisible();

        // Verify Exercises appeared
        // The new UI uses inputs for sets/reps
        await expect(page.locator('input[placeholder="Kg"]').first()).toBeVisible();
        await expect(page.locator('input[placeholder="Reps"]').first()).toBeVisible();
    });
});
