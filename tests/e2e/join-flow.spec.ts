import { test, expect } from '@playwright/test';

test.describe('Contestant and Audience Join Flow (Phase 4)', () => {
  test('S-02: Audience Join page loads with 5-character code input and display name', async ({ page }) => {
    await page.goto('/audience');
    await expect(page.locator('h1')).toContainText('Bible Giants');
    await expect(page.locator('input[placeholder="e.g. 7K2M9"]')).toBeVisible();
    await expect(page.locator('input[placeholder="e.g. Deborah O."]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Join Competition' })).toBeVisible();
  });

  test('S-04: Contestant Sign-in page loads with seat selector and 4-digit PIN', async ({ page }) => {
    await page.goto('/contestant');
    await expect(page.locator('h1')).toContainText('Bible Giants');
    await expect(page.locator('input[placeholder="e.g. 7K2M9"]')).toBeVisible();
    // 8 seat buttons
    await expect(page.getByRole('button', { name: '#1' })).toBeVisible();
    await expect(page.getByRole('button', { name: '#8' })).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enter Contest' })).toBeVisible();
  });

  test('S-01: Landing page buttons link correctly to Contestant and Audience portals', async ({ page }) => {
    await page.goto('/');

    const contestantBtn = page.getByRole('link', { name: 'I am a Contestant' });
    await expect(contestantBtn).toBeVisible();

    const audienceBtn = page.getByRole('link', { name: 'I am in the Audience' });
    await expect(audienceBtn).toBeVisible();
  });
});

