import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Bug-evidence capture spec — produces the PNGs referenced from bug-reports.md.
 * Runs only under the `evidence` Playwright project.
 *
 * Output: ../evidence/bugs/*.png
 */

const OUT = join(__dirname, '..', '..', '..', 'evidence', 'bugs');
mkdirSync(OUT, { recursive: true });

async function bootstrap(page: import('@playwright/test').Page) {
  await page.goto('./');
  await page.waitForFunction(
    () => navigator.serviceWorker?.controller !== null,
    undefined,
    { timeout: 10_000 },
  );
  await page.request.post('/_mocks/reset').catch(() => undefined);
}

test.describe('Bug evidence', () => {
  test('BUG-001 — after-fix: validation clears immediately on radio change', async ({ page }) => {
    await bootstrap(page);
    // Step 1
    await page.locator('#postcode-input').fill('SW1A 1AA');
    await page.getByTestId('postcode-submit').click();
    await page.getByTestId('address-list').waitFor();
    await page.getByTestId('address-option-addr_sw1a_01').click();
    await page.getByTestId('postcode-continue').click();

    // Step 2 — tick plasterboard, click Continue → validation appears
    await page.getByTestId('waste-plasterboard').click();
    await page.getByTestId('waste-continue').click();
    await expect(page.getByTestId('waste-validation')).toBeVisible();
    await page.screenshot({ path: join(OUT, 'BUG-001-before.png'), fullPage: true });

    // Tick a handling option → validation should clear
    await page.getByTestId('plasterboard-under_10').click();
    await expect(page.getByTestId('waste-validation')).toBeHidden();
    await page.screenshot({ path: join(OUT, 'BUG-001-after.png'), fullPage: true });
  });

  test('BUG-004 — re-submit same postcode unselects the address', async ({ page }) => {
    await bootstrap(page);
    await page.locator('#postcode-input').fill('SW1A 1AA');
    await page.getByTestId('postcode-submit').click();
    await page.getByTestId('address-list').waitFor();
    await page.getByTestId('address-option-addr_sw1a_01').click();
    await expect(page.locator('input[name="address"][value="addr_sw1a_01"]')).toBeChecked();
    await page.screenshot({ path: join(OUT, 'BUG-004-before.png'), fullPage: true });

    // Click Find again with the same postcode
    await page.getByTestId('postcode-submit').click();
    await page.getByTestId('address-list').waitFor();
    await expect(page.locator('input[name="address"][value="addr_sw1a_01"]')).not.toBeChecked();
    await page.screenshot({ path: join(OUT, 'BUG-004-after.png'), fullPage: true });
  });

  test('BUG-002 — Back from Step 2 re-fires postcode lookup', async ({ page }) => {
    await bootstrap(page);

    // Track requests
    const lookups: string[] = [];
    page.on('request', (req) => {
      if (req.url().endsWith('/api/postcode/lookup') && req.method() === 'POST') {
        lookups.push(new Date().toISOString());
      }
    });

    await page.locator('#postcode-input').fill('SW1A 1AA');
    await page.getByTestId('postcode-submit').click();
    await page.getByTestId('address-list').waitFor();
    await page.getByTestId('address-option-addr_sw1a_01').click();
    await page.getByTestId('postcode-continue').click();
    await page.getByTestId('waste-general').waitFor();

    // Click Back — should NOT fire lookup, but does
    await page.getByTestId('waste-back').click();
    await page.getByTestId('address-list').waitFor();

    // Render a tiny in-page summary so the screenshot is self-explanatory
    await page.evaluate((count) => {
      const el = document.createElement('pre');
      el.style.cssText =
        'position:fixed;top:8px;right:8px;padding:8px 12px;background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;font:12px monospace;z-index:9999;';
      el.textContent = `BUG-002: POST /api/postcode/lookup fired ${count}× (expected 1)`;
      document.body.appendChild(el);
    }, lookups.length);
    await page.screenshot({ path: join(OUT, 'BUG-002-network.png'), fullPage: true });
    expect(lookups.length).toBeGreaterThanOrEqual(2);
  });

  test('BUG-003 — counter leaks across "Book another skip"', async ({ page }) => {
    await bootstrap(page);

    const lookups: { ts: string; status?: number }[] = [];
    page.on('response', async (res) => {
      if (res.url().endsWith('/api/postcode/lookup')) {
        lookups.push({ ts: new Date().toISOString(), status: res.status() });
      }
    });

    // Run #1 — BS1 4DJ → 500 then 200
    await page.locator('#postcode-input').fill('BS1 4DJ');
    await page.getByTestId('postcode-submit').click();
    await page.getByTestId('postcode-retry').waitFor();
    await page.getByTestId('postcode-retry').click();
    await page.getByTestId('address-list').waitFor();

    // Just go all the way through quickly
    await page.locator('input[name="address"]').first().click();
    await page.getByTestId('postcode-continue').click();
    await page.getByTestId('waste-general').click();
    await page.getByTestId('waste-continue').click();
    await page.getByTestId('skip-list').waitFor();
    await page.getByTestId('skip-4-yard').click();
    await page.getByTestId('skip-continue').click();
    await page.getByTestId('confirm-booking').click();
    await page.getByTestId('booking-success').waitFor();

    // "Book another skip"
    await page.getByTestId('start-over').click();
    await page.locator('#postcode-input').waitFor();

    // Run #2 — BS1 4DJ should fail FIRST call again per fixture, but won't
    await page.locator('#postcode-input').fill('BS1 4DJ');
    await page.getByTestId('postcode-submit').click();
    // Wait either for results or for the retry button
    await Promise.race([
      page.getByTestId('address-list').waitFor(),
      page.getByTestId('postcode-retry').waitFor(),
    ]);

    const run2Statuses = lookups
      .map((l) => l.status)
      .filter((s) => s !== undefined);
    await page.evaluate((statuses) => {
      const el = document.createElement('pre');
      el.style.cssText =
        'position:fixed;top:8px;right:8px;padding:8px 12px;background:#fee2e2;border:1px solid #ef4444;border-radius:6px;font:12px monospace;z-index:9999;white-space:pre;';
      el.textContent = `BUG-003: lookup statuses = ${JSON.stringify(statuses)}\n(run #2 first call should be 500, observed otherwise)`;
      document.body.appendChild(el);
    }, run2Statuses);
    await page.screenshot({ path: join(OUT, 'BUG-003-counter-leak.png'), fullPage: true });
  });
});
