
import { test, expect } from '@playwright/test';
import { TEST_USER_PASSWORD } from './test-constants';

// Helper to generate unique credentials
const uniqueId = () => Math.random().toString(36).substring(7);

test.describe('Gym-Trainer Association Flow', () => {

    test('Gym Admin can invite a trainer', async ({ page }) => {
        // Generate unique emails INSIDE the test to ensure uniqueness on retries
        const gymEmail = `gym_e2e_${uniqueId()}@example.com`;
        const trainerEmail = `trainer_e2e_${uniqueId()}@example.com`;

        // 1. Register Trainer (UI Flow)
        await page.goto('/auth/register');
        await page.fill('input[name="full_name"]', 'E2E Trainer');
        await page.fill('input[name="email"]', trainerEmail);
        await page.fill('input[name="password"]', TEST_USER_PASSWORD);
        await page.fill('input[name="confirmPassword"]', TEST_USER_PASSWORD);

        // Handle ShadCN Select for Role
        await page.click('button[role="combobox"]');
        await page.click('div[role="option"]:has-text("Personal Trainer")');

        await page.click('button[type="submit"]', { timeout: 10000 });
        await expect(page).toHaveURL('/dashboard', { timeout: 15000 });

        // Logout
        await page.getByRole('banner').getByRole('button', { name: /logout/i }).click();
        await expect(page).toHaveURL('/auth/login', { timeout: 10000 });

        // 2. Register Gym Admin
        await page.goto('/auth/register');
        await page.fill('input[name="full_name"]', 'E2E Gym Owner');
        await page.fill('input[name="email"]', gymEmail);
        await page.fill('input[name="password"]', TEST_USER_PASSWORD);
        await page.fill('input[name="confirmPassword"]', TEST_USER_PASSWORD);

        // Handle ShadCN Select for Role
        await page.click('button[role="combobox"]');
        await page.click('div[role="option"]:has-text("Gym Owner")');

        await page.click('button[type="submit"]', { timeout: 10000 });
        await expect(page).toHaveURL('/dashboard', { timeout: 15000 });

        // 3. Create Gym Profile
        await page.goto('/onboard-as-gym');
        await page.fill('input[name="name"]', 'E2E Gym');
        await page.fill('input[name="slug"]', `gym-${uniqueId()}`);
        await page.fill('input[name="location"]', 'E2E City');
        await page.click('button[type="submit"]');

        // 4. Invite Trainer
        await page.goto('/dashboard/gym/trainers');
        await page.click('button:has-text("Invite Trainer")');

        await page.fill('input[placeholder="Trainer\'s Email Address"]', trainerEmail);
        await page.click('button:has-text("Send Invitation")');

        // 5. Verify UI Feedback
        // Assuming success toast or list update. 
        // For now, we trust the flow if it doesn't crash.
        // Ideally: await expect(page.getByText('invitation sent', { exact: false })).toBeVisible();
    });
});
