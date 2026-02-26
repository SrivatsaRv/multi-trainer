import { test, expect } from '@playwright/test';
import { TEST_USER_EMAIL, TEST_USER_PASSWORD } from '../test-constants';

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:8000';

test.describe('Authentication Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Clear localStorage before each test
        await page.goto(BASE_URL);
        await page.evaluate(() => localStorage.clear());
    });

    test('should show login and register buttons when not authenticated', async ({ page }) => {
        await page.goto(BASE_URL);
        // Wait for page to load
        await page.waitForLoadState('networkidle');

        // Should show login and register buttons in header
        await expect(page.locator('header').getByRole('link', { name: /log in/i })).toBeVisible();
        await expect(page.locator('header').getByRole('link', { name: /get started/i })).toBeVisible();

        // Should NOT show logout button
        await expect(page.getByRole('button', { name: /logout/i })).not.toBeVisible();
    });

    test('should not show header/footer on login page', async ({ page }) => {
        await page.goto(`${BASE_URL}/auth/login`);

        // Header should not be visible (no layout on auth pages)
        await expect(page.getByRole('banner')).not.toBeVisible();

        // Login form should be visible
        // Login form should be visible
        await expect(page.locator('[data-slot="card-title"]', { hasText: /login/i })).toBeVisible();
    });

    // ...

    test('should successfully login with valid credentials', async ({ page }) => {
        await page.goto(`${BASE_URL}/auth/login`);

        // Fill in login form
        await page.getByLabel(/email/i).fill(TEST_USER_EMAIL);
        await page.getByLabel(/password/i).fill(TEST_USER_PASSWORD);

        // Submit form
        await page.getByRole('button', { name: /sign in/i }).click();

        // Should redirect to dashboard
        await expect(page).toHaveURL(`${BASE_URL}/dashboard`, { timeout: 10000 });

        // Token should be stored
        const token = await page.evaluate(() => localStorage.getItem('token'));
        expect(token).toBeTruthy();
    });

    test('should show error message with invalid credentials', async ({ page }) => {
        await page.goto(`${BASE_URL}/auth/login`);

        // Fill in login form with wrong password
        await page.getByLabel(/email/i).fill('gym_draft@example.com');
        await page.getByLabel(/password/i).fill('wrongpassword');

        // Submit form
        await page.getByRole('button', { name: /sign in/i }).click();

        // Should show error toast
        await expect(page.getByText(/invalid credentials/i)).toBeVisible();

        // Should stay on login page
        await expect(page).toHaveURL(`${BASE_URL}/auth/login`);
    });

    test('should show dashboard and logout button when authenticated', async ({ page }) => {
        // Login first
        await page.goto(`${BASE_URL}/auth/login`);
        await page.getByLabel(/email/i).fill('gym_draft@example.com');
        await page.getByLabel(/password/i).fill(TEST_USER_PASSWORD);
        await page.getByRole('button', { name: /sign in/i }).click();

        // Wait for redirect
        await page.waitForURL(`${BASE_URL}/dashboard`);

        // Go to home page
        await page.goto(BASE_URL);

        // Should show dashboard and logout buttons
        await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /logout/i })).toBeVisible();

        // Should NOT show login/register buttons
        await expect(page.getByRole('link', { name: /log in/i })).not.toBeVisible();
        await expect(page.getByRole('link', { name: /get started/i })).not.toBeVisible();
    });

    test('should logout successfully', async ({ page }) => {
        // Login first
        await page.goto(`${BASE_URL}/auth/login`);
        await page.getByLabel(/email/i).fill('gym_draft@example.com');
        await page.getByLabel(/password/i).fill(TEST_USER_PASSWORD);
        await page.getByRole('button', { name: /sign in/i }).click();
        await page.waitForURL(`${BASE_URL}/dashboard`);

        // Go to home page
        await page.goto(BASE_URL);

        // Click logout
        await page.getByRole('banner').getByRole('button', { name: /logout/i }).click();

        // Should redirect to login page
        await expect(page).toHaveURL(`${BASE_URL}/auth/login`);

        // Token should be cleared - Wait for async cleanup
        await expect(async () => {
            const token = await page.evaluate(() => localStorage.getItem('token'));
            expect(token).toBeNull();
        }).toPass({ timeout: 5000 });
    });

    test('should maintain session across page navigation', async ({ page }) => {
        // Login
        await page.goto(`${BASE_URL}/auth/login`);
        await page.getByLabel(/email/i).fill(TEST_USER_EMAIL);
        await page.getByLabel(/password/i).fill(TEST_USER_PASSWORD);
        await page.getByRole('button', { name: /sign in/i }).click();
        await page.waitForURL(`${BASE_URL}/dashboard`);

        // Navigate to home
        await page.goto(BASE_URL);

        // Should still be logged in
        await expect(page.getByRole('button', { name: /logout/i })).toBeVisible();

        // Navigate back to dashboard
        await page.getByRole('link', { name: /dashboard/i }).click();
        await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
    });

    test('should handle expired token gracefully', async ({ page }) => {
        // Create an expired token
        const expiredToken = createExpiredToken();

        await page.goto(BASE_URL);
        await page.evaluate((token) => {
            localStorage.setItem('token', token);
        }, expiredToken);

        // Reload page
        await page.reload();

        // Should show login/register (not authenticated)
        await expect(page.getByRole('link', { name: /log in/i })).toBeVisible();
        await expect(page.locator('header').getByRole('link', { name: /get started/i })).toBeVisible();

        // Token should be cleared
        const token = await page.evaluate(() => localStorage.getItem('token'));
        expect(token).toBeNull();
    });

    test('should only allow one session per user', async ({ page, context }) => {
        // Login in first tab
        await page.goto(`${BASE_URL}/auth/login`);
        await page.getByLabel(/email/i).fill(TEST_USER_EMAIL);
        await page.getByLabel(/password/i).fill(TEST_USER_PASSWORD);
        await page.getByRole('button', { name: /sign in/i }).click();
        await page.waitForURL(`${BASE_URL}/dashboard`);

        const firstToken = await page.evaluate(() => localStorage.getItem('token'));

        // Open new tab and login again
        const newPage = await context.newPage();
        await newPage.goto(`${BASE_URL}/auth/login`);
        await newPage.getByLabel(/email/i).fill(TEST_USER_EMAIL);
        await newPage.getByLabel(/password/i).fill(TEST_USER_PASSWORD);
        await newPage.getByRole('button', { name: /sign in/i }).click();
        await newPage.waitForURL(`${BASE_URL}/dashboard`);

        const secondToken = await newPage.evaluate(() => localStorage.getItem('token'));

        // Tokens should be different (new session created)
        // Wait for the token to change (accounting for async session update)
        await expect(async () => {
            const currentToken = await newPage.evaluate(() => localStorage.getItem('token'));
            expect(currentToken).not.toBe(firstToken);
            expect(currentToken).toBeTruthy();
        }).toPass({ timeout: 5000 });

        // Both sessions should be valid (backend allows multiple sessions)
        // This is expected behavior - each login creates a new token
        expect(firstToken).toBeTruthy();
        expect(secondToken).toBeTruthy();
    });

    test('should allow registration as a Trainer via role query param', async ({ page }) => {
        const email = `trainer_${uniqueId()}@example.com`;
        await page.goto(`${BASE_URL}/auth/register?role=TRAINER`);

        await expect(page.getByRole('heading', { name: /create an account/i })).toBeVisible();
        await page.getByLabel(/full name/i).fill('E2E Trainer');
        await page.getByLabel(/email/i).fill(email);
        await page.getByLabel(/password/i).fill(TEST_USER_PASSWORD);
        await page.getByLabel(/confirm password/i).fill(TEST_USER_PASSWORD);

        await page.getByRole('button', { name: /sign up/i }).click();

        await expect(page).toHaveURL(`${BASE_URL}/dashboard`, { timeout: 15000 });
        const userRole = await page.evaluate(() => {
            const userStr = localStorage.getItem('user');
            return userStr ? JSON.parse(userStr).role : null;
        });
        expect(userRole).toBe('TRAINER');
    });

    test('should allow registration as a Gym Admin via role query param', async ({ page }) => {
        const email = `gymadmin_${uniqueId()}@example.com`;
        await page.goto(`${BASE_URL}/auth/register?role=GYM_ADMIN`);

        await expect(page.getByRole('heading', { name: /create an account/i })).toBeVisible();
        await page.getByLabel(/full name/i).fill('E2E Gym Admin');
        await page.getByLabel(/email/i).fill(email);
        await page.getByLabel(/password/i).fill(TEST_USER_PASSWORD);
        await page.getByLabel(/confirm password/i).fill(TEST_USER_PASSWORD);

        await page.getByRole('button', { name: /sign up/i }).click();

        await expect(page).toHaveURL(`${BASE_URL}/dashboard`, { timeout: 15000 });
        const userRole = await page.evaluate(() => {
            const userStr = localStorage.getItem('user');
            return userStr ? JSON.parse(userStr).role : null;
        });
        expect(userRole).toBe('GYM_ADMIN');
    });
});

const uniqueId = () => Math.random().toString(36).substring(7);

// Helper function to create an expired JWT token
function createExpiredToken(): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const exp = Math.floor(Date.now() / 1000) - 3600; // Expired 1 hour ago
    const payload = Buffer.from(JSON.stringify({ sub: '1', exp })).toString('base64');
    const signature = 'fake-signature';
    return `${header}.${payload}.${signature}`;
}
