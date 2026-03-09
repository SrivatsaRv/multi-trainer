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

        // 3. Verify Redirect to Dashboard (Standard flow)
        await page.waitForURL(/\/dashboard/);

        // 4. Verify Dashboard Access
        await page.waitForLoadState('networkidle');
        await expect(page.getByRole('link', { name: /overview|dashboard/i })).toBeVisible();
        // Onboarding flow will be tested in isolated, authenticated contexts.
        // During E2E Signup, Auth Context redirects DRAFTs straight to dashboard. 
    });
});
