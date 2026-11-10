import { expect, test } from '@playwright/test';
test.describe('FITCORE Web E2E', () => {
    test('registers a gym owner, creates a branch, and navigates core modules', async ({ page }) => {
        const uniqueEmail = `e2e_${Date.now()}@fitcore.test`;
        await page.goto('http://localhost:5173/register');
        await page.getByPlaceholder('Aarav').fill('E2E');
        await page.getByPlaceholder('Mehta').fill('Owner');
        await page.locator('select').selectOption('gym_admin');
        await page.getByPlaceholder('Iron Pulse Performance Club').fill('E2E Barbell Club');
        await page.getByPlaceholder('you@domain.com').fill(uniqueEmail);
        await page.getByPlaceholder('Min 8 chars, 1 uppercase, 1 number').fill('Password123');
        await page.getByRole('button', { name: 'Create account' }).click();
        await expect(page).toHaveURL(/\/dashboard/);
        await expect(page.getByText('Welcome, E2E Owner')).toBeVisible();
        await page.getByRole('link', { name: 'Workouts & Exercises' }).click();
        await expect(page.getByText('Workouts & Exercise Library')).toBeVisible();
        await page.getByRole('link', { name: 'Nutrition & Food DB' }).click();
        await expect(page.getByText('Nutrition & Hydration Tracking')).toBeVisible();
    });
});
