import { test, expect } from '../fixtures/test-fixtures';

/**
 * Step 4 — Review & confirm.
 *
 * Covers §3 Step 4 mandates: summary, price breakdown, confirm booking,
 * double-submit prevention.
 */
test.describe('Step 4 — Review & confirm', () => {
  test.beforeEach(async ({ postcodePage, wastePage, skipPage }) => {
    await postcodePage.lookup('SW1A 1AA');
    await postcodePage.selectAddress('addr_sw1a_01');
    await postcodePage.continueButton.click();

    await wastePage.toggleGeneral();
    await wastePage.continueButton.click();

    await skipPage.select('8-yard');
    await skipPage.continueButton.click();
  });

  test('summary reflects every earlier selection', async ({ page, reviewPage }) => {
    await expect(reviewPage.heading).toBeVisible();
    await expect(page.getByTestId('review-address')).toContainText('10 Downing Street');
    await expect(page.getByTestId('review-address')).toContainText('SW1A 1AA');
    await expect(page.getByTestId('review-waste')).toHaveText(/General waste/);
    await expect(page.getByTestId('review-skip')).toHaveText(/8 Yard Skip/);
  });

  test('price breakdown is arithmetically consistent', async ({ reviewPage }) => {
    const b = await reviewPage.readBreakdown();
    expect(b.subtotal).toBeCloseTo(b.skip + b.permit, 2);
    expect(b.total).toBeCloseTo(b.subtotal + b.vat, 2);
    expect(b.total).toBeGreaterThan(0);
  });

  test('Back returns to Step 3 with the skip still selected', async ({
    reviewPage,
    skipPage,
  }) => {
    await reviewPage.backButton.click();
    await expect(skipPage.heading).toBeVisible();
    await expect(skipPage.card('8-yard')).toHaveAttribute('aria-checked', 'true');
  });

  test('confirm fires exactly once even on rapid double-click', async ({
    page,
    reviewPage,
  }) => {
    const calls: string[] = [];
    page.on('request', (req) => {
      if (req.url().endsWith('/api/booking/confirm')) calls.push(req.url());
    });

    const response = page.waitForResponse((r) => r.url().endsWith('/api/booking/confirm'));
    await reviewPage.confirmButton.click();
    await reviewPage.confirmButton.click({ force: true }).catch(() => undefined);
    await response;

    await expect.poll(() => calls.length, { timeout: 2_000 }).toBe(1);
    await expect(page.getByTestId('booking-success')).toBeVisible();
  });

  test('TC-N10 — tampered price rejected by catalogue validation; UI shows error', async ({
    page,
    reviewPage,
  }) => {
    // Intercept fetch inside the browser context (where MSW lives) so we can
    // tamper with the outbound body *before* the service worker sees it.
    // This simulates a malicious client (DevTools request-editor) altering
    // the price field; the MSW handler rejects with PRICE_MISMATCH.
    await page.evaluate(() => {
      const original = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        const url = typeof input === 'string' ? input : (input as Request).url;
        if (url.endsWith('/api/booking/confirm') && init?.body) {
          const body = JSON.parse(init.body as string);
          body.price = 10; // tamper
          return original(input, { ...init, body: JSON.stringify(body) });
        }
        return original(input, init);
      };
    });

    const response = page.waitForResponse((r) => r.url().endsWith('/api/booking/confirm'));
    await reviewPage.confirmButton.click();
    const res = await response;
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toMatchObject({ error: 'PRICE_MISMATCH' });

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByTestId('booking-success')).toBeHidden();
  });

  test('successful confirm surfaces a BK-<digits> booking ID', async ({
    page,
    reviewPage,
  }) => {
    await reviewPage.confirmButton.click();
    await expect(page.getByTestId('booking-success')).toBeVisible();
    await expect(page.getByTestId('booking-id')).toHaveText(/^BK-\d+$/);
  });
});
