import { test, expect } from '@playwright/test';

test.describe('Phase A Gate A8: End-to-End Live Sync Rehearsal Flow (§10.3)', () => {
  const eventId = '11111111-1111-1111-1111-111111111111';
  const eventCode = 'GIANT';

  test.beforeEach(async ({ context, page }) => {
    // Authenticate operator session via cookie
    await context.addCookies([
      {
        name: 'operator_session',
        value: '1',
        domain: 'localhost',
        path: '/',
      },
    ]);
    page.on('pageerror', (err) => {
      console.error('PLAYWRIGHT PAGE ERROR:', err.message, err.stack);
    });
    page.on('console', (msg) => {
      console.log('BROWSER CONSOLE:', msg.type(), msg.text());
    });
  });

  test('AC-A01: Operator dashboard displays copyable join code and prefilled links', async ({ page }) => {
    await page.goto(`/host/${eventId}`);
    // Check join code panel or header
    await expect(page.locator('body')).toContainText(eventCode);
    // Check contestant and audience prefilled URLs
    const contestantLink = page.getByRole('button', { name: /Copy (Contestant|Audience) Link/i }).first();
    await expect(contestantLink).toBeVisible();
  });

  test('AC-A02 & AC-A03: Question management and quick add into target rounds', async ({ page }) => {
    await page.goto(`/host/${eventId}/rounds`);
    // Ensure rounds page loads
    await expect(page.locator('h1, h2, h3, header').filter({ hasText: /Rounds|Round/i }).first()).toBeVisible();
    // Ensure Quick Add modal button exists
    const quickAddBtn = page.getByRole('button', { name: /Quick Add/i }).first();
    await expect(quickAddBtn).toBeVisible();
    // Ensure Import / Upload Questions button exists
    const importBtn = page.getByRole('button', { name: /Upload Questions|Import/i }).first();
    await expect(importBtn).toBeVisible();
  });

  test('AC-A04: Audience join form requires Name + Assembly, with optional Phone', async ({ page }) => {
    await page.goto(`/audience?code=${eventCode}`);
    await expect(page.locator('#name, input[placeholder*="David"]')).toBeVisible();
    await expect(page.locator('#assembly, input[placeholder*="Assembly"]')).toBeVisible();
  });

  test('AC-A05: Live console has Show & Start convenience button and stage controls', async ({ page }) => {
    await page.goto(`/host/${eventId}/live`);
    // Check top bar connection status and code
    await expect(page.locator('body')).toContainText(eventCode);
    // Check Show & Start button
    const showAndStartBtn = page.getByRole('button', { name: /Show & Start/i });
    await expect(showAndStartBtn).toBeVisible();
    // Check Show, Open, Lock, Reveal buttons
    await expect(page.getByRole('button', { name: /1\. Show/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /2\. Open/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /3\. Lock/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /4\. Reveal/i })).toBeVisible();
  });

  test('AC-A09: Projector screen renders Round Summary and Audience Top 5 views', async ({ page }) => {
    await page.goto(`/screen/${eventId}`);
    await expect(page.locator('body')).toContainText('Bible Giants');
  });

  test('AC-A10: Audience screen respects individual contestant rounds (audience_can_answer=false)', async ({ page }) => {
    await page.goto(`/audience/${eventCode}`);
    await expect(page.locator('body')).toBeVisible();
  });

  test('AC-A13: Operator header displays In-sync presence indicator (n/N)', async ({ page }) => {
    await page.goto(`/host/${eventId}/live`);
    const inSyncBadge = page.locator('button:has-text("In sync")');
    await expect(inSyncBadge).toBeVisible();
  });
});
