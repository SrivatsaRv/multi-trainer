import { test, expect } from '@playwright/test';

test.describe('API-First Re-architecture UI Verification', () => {
    test.beforeEach(async ({ page }) => {
        // We use the port 3000 for the newly containerized frontend
        await page.goto('http://localhost:3000');
    });

    test('should have visible and accessible CTA buttons in Hero pointing to onboarding', async ({ page }) => {
        const gymButton = page.getByRole('link', { name: 'Start as Gym' });
        const trainerButton = page.getByRole('link', { name: 'Join as Trainer' });

        await expect(gymButton).toBeVisible();
        await expect(trainerButton).toBeVisible();

        // Verify API-first routes
        await expect(gymButton).toHaveAttribute('href', '/onboard-as-gym');
        await expect(trainerButton).toHaveAttribute('href', '/onboard-as-trainer');
    });

    test('should verify marketplace navigation', async ({ page }) => {
        const gymLink = page.getByRole('link', { name: 'Gyms', exact: true });
        const trainerLink = page.getByRole('link', { name: 'Trainers', exact: true });

        await expect(gymLink).toBeVisible();
        await expect(trainerLink).toBeVisible();

        await gymLink.click();
        await expect(page).toHaveURL(/.*\/gyms/);
        await expect(page.locator('h1')).toContainText('Partner Gyms');
    });

    test('should verify feature section CTAs point to new onboarding', async ({ page }) => {
        const gymFeatureBtn = page.getByRole('link', { name: 'Start onboarding your facility' });
        const trainerFeatureBtn = page.getByRole('link', { name: 'Create your professional profile' });

        await expect(gymFeatureBtn).toBeVisible();
        await expect(trainerFeatureBtn).toBeVisible();

        await expect(gymFeatureBtn).toHaveAttribute('href', '/onboard-as-gym');
        await expect(trainerFeatureBtn).toHaveAttribute('href', '/onboard-as-trainer');
    });
});
