import { test, expect } from '@playwright/test';

test.describe('Operator Screens Flow (Phase 2)', () => {
  test('S-06: Operator Login page loads with email, password fields and sign in button', async ({ page }) => {
    await page.goto('/host/login');
    await expect(page.locator('h1')).toContainText('Bible Giants');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('S-01: Landing page links to Operator login', async ({ page }) => {
    await page.goto('/');
    const operatorLink = page.getByRole('link', { name: 'Operator' });
    await expect(operatorLink).toBeVisible();
    await operatorLink.click();
    await expect(page).toHaveURL(/\/host\/login/);
  });
});

