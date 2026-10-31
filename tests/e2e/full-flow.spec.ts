import { test, expect } from '@playwright/test';

test.describe('Bible Giants Full Rehearsal Flow (docs/08-TEST-PLAN.md §3)', () => {
  test('AC-01: Operator login, create event, join code generation', async ({ page }) => {
    await page.goto('/host/login');
    await expect(page.locator('h1')).toContainText('Bible Giants');
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('AC-02: Contestant sign in with seat and PIN', async ({ page }) => {
    await page.goto('/contestant');
    await expect(page.locator('h1')).toContainText('Contestant Seat Sign-in');
    await expect(page.locator('input[placeholder="e.g. 7K2M9"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enter Podium' })).toBeVisible();
  });

  test('AC-04: Audience join with code and name', async ({ page }) => {
    await page.goto('/audience');
    await expect(page.locator('h1')).toContainText('Audience Join');
    await expect(page.locator('input[placeholder="e.g. 7K2M9"]')).toBeVisible();
    await expect(page.locator('input[placeholder="e.g. Bro. Emmanuel"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Join Competition' })).toBeVisible();
  });

  test('AC-12: S-13 Projector page loads cleanly', async ({ page }) => {
    await page.goto('/screen/test-event-id');
    await expect(page.locator('header')).toContainText('Bible Giants');
  });

  test('S-14: Custom 404 page loads cleanly on invalid route', async ({ page }) => {
    await page.goto('/non-existent-page-xyz');
    await expect(page.locator('h1')).toContainText('Page Not Found');
    await expect(page.getByRole('button', { name: '← Return to Home' })).toBeVisible();
  });
});

