import { test, expect } from '@playwright/test';

test.describe('API-First Re-architecture UI Verification', () => {
    test.beforeEach(async ({ page }) => {
        // We use the port 3000 for the newly containerized frontend
        await page.goto('http://localhost:3000');
    });

    test('should have visible and accessible CTA buttons in Hero pointing to onboarding', async ({ page }) => {
        const getStartedButton = page.locator('#hero').getByRole('link', { name: 'Get Started' });
        const loginButton = page.locator('#hero').getByRole('link', { name: 'Full Login' });

        await expect(getStartedButton).toBeVisible();
        await expect(loginButton).toBeVisible();

        // Verify API-first routes
        await expect(getStartedButton).toHaveAttribute('href', '/auth/register');
        await expect(loginButton).toHaveAttribute('href', '/auth/login');
    });

    test('should verify marketplace navigation', async ({ page }) => {
        const gymLink = page.getByRole('link', { name: 'For Gyms', exact: true });
        const trainerLink = page.getByRole('link', { name: 'For Trainers', exact: true });

        await expect(gymLink).toBeVisible();
        await expect(trainerLink).toBeVisible();

        // Note: These are anchor links to sections now
        await expect(gymLink).toHaveAttribute('href', '#gyms');
        await expect(trainerLink).toHaveAttribute('href', '#trainers');
    });

    test('should verify feature section CTAs point to new onboarding', async ({ page }) => {
        const gymFeatureBtn = page.getByRole('link', { name: 'Start onboarding your facility' });
        const trainerFeatureBtn = page.getByRole('link', { name: 'Create your professional profile' });

        await expect(gymFeatureBtn).toBeVisible();
        await expect(trainerFeatureBtn).toBeVisible();

        await expect(gymFeatureBtn).toHaveAttribute('href', '/auth/register?role=GYM_ADMIN');
        await expect(trainerFeatureBtn).toHaveAttribute('href', '/auth/register?role=TRAINER');
    });
});
