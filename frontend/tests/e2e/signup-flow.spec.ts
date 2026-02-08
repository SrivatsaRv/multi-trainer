import { test, expect } from '@playwright/test';

const timestamp = Date.now();
const TRAINER_EMAIL = `e2e-trainer-${timestamp}@example.com`;
const TRAINER_NAME = `E2E Trainer ${timestamp}`;
const TRAINER_PASSWORD = 'StrongPassword123!';

test.describe('Trainer Signup Flow', () => {
    test('should register a new trainer and complete onboarding', async ({ page }) => {
        // 1. Visit Register Page
        await page.goto('/auth/register?role=TRAINER');

        // 2. Fill Registration Form
        await page.fill('input[name="full_name"]', TRAINER_NAME);
        await page.fill('input[name="email"]', TRAINER_EMAIL);
        await page.fill('input[name="password"]', TRAINER_PASSWORD);
        await page.fill('input[name="confirmPassword"]', TRAINER_PASSWORD);

        // Submit
        await page.click('button[type="submit"]');

        // 3. Verify Redirect to Onboarding
        // Wait for URL to contain /auth/onboarding/trainer
        await page.waitForURL(/\/auth\/onboarding\/trainer/);

        // Verify Onboarding Page Content
        await expect(page.locator('h1')).toContainText('Trainer Profile Setup');

        // 4. Fill Onboarding Form
        await page.fill('textarea[name="bio"]', 'I am an automated E2E test trainer profile.');

        // Submit
        await page.click('button[type="submit"]');

        // 5. Verify Redirect to Dashboard
        await page.waitForURL(/\/dashboard/);

        // Verify Dashboard Access
        await expect(page.locator('body')).toContainText('Overview');
        // Check if name is displayed (if header has it)
        // await expect(page.locator('header')).toContainText(TRAINER_NAME); 
    });
});
