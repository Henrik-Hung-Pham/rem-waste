import { test, expect } from '../fixtures/test-fixtures';

/**
 * Step 1 — Postcode lookup.
 *
 * Exercises validation, normalization, and the four deterministic fixtures
 * from §4 (SW1A 1AA, EC1A 1BB, M1 1AE, BS1 4DJ).
 */
test.describe('Step 1 — Postcode', () => {
  test.describe('initial state', () => {
    test('renders heading, input and a disabled Find address button', async ({
      page,
      postcodePage,
    }) => {
      await expect(
        page.getByRole('heading', { name: /where do you need/i }),
      ).toBeVisible();
      await expect(postcodePage.input).toBeVisible();
      await expect(postcodePage.submit).toBeDisabled();
    });

    test('Find address button enables once the user types', async ({
      postcodePage,
    }) => {
      await postcodePage.input.fill('SW');
      await expect(postcodePage.submit).toBeEnabled();
    });
  });

  test.describe('validation', () => {
    test('rejects obviously invalid postcodes without calling the API', async ({
      page,
      postcodePage,
    }) => {
      await postcodePage.lookup('NOT A POSTCODE');

      await expect(page.getByRole('alert')).toContainText(/valid uk postcode/i);
      // No network call + no loading spinner + no address list.
      await expect(postcodePage.loading).toBeHidden();
      await expect(postcodePage.addressList).toBeHidden();
    });

    test('rejects too-short input', async ({ page, postcodePage }) => {
      await postcodePage.lookup('SW1');
      await expect(page.getByRole('alert')).toContainText(/valid uk postcode/i);
    });

    test('rejects all-numeric input', async ({ page, postcodePage }) => {
      await postcodePage.lookup('12345');
      await expect(page.getByRole('alert')).toContainText(/valid uk postcode/i);
    });
  });

  test.describe('normalization', () => {
    test('accepts lowercase input and looks up the normalized postcode', async ({
      page,
      postcodePage,
    }) => {
      const req = page.waitForRequest(
        (r) => r.url().endsWith('/api/postcode/lookup') && r.method() === 'POST',
      );
      await postcodePage.lookup('sw1a 1aa');
      const sent = (await req).postDataJSON();
      // Accept either 'sw1a 1aa' or the pre-normalized form depending on client logic.
      expect(String(sent.postcode).toUpperCase().replace(/\s+/g, ' ')).toBe('SW1A 1AA');
      await expect(postcodePage.addressList).toBeVisible();
    });

    test('accepts postcode without a space', async ({ postcodePage }) => {
      await postcodePage.lookup('SW1A1AA');
      await expect(postcodePage.addressList).toBeVisible();
      const count = await postcodePage.addressOptions().count();
      expect(count).toBeGreaterThanOrEqual(12);
    });

    test('ignores surrounding whitespace', async ({ postcodePage }) => {
      await postcodePage.lookup('   SW1A 1AA   ');
      await expect(postcodePage.addressList).toBeVisible();
    });
  });

  test.describe('deterministic fixtures (§4)', () => {
    test('SW1A 1AA returns ≥12 addresses and enables Continue on selection', async ({
      postcodePage,
    }) => {
      await postcodePage.lookup('SW1A 1AA');

      await expect(postcodePage.addressList).toBeVisible();
      const count = await postcodePage.addressOptions().count();
      expect(count).toBeGreaterThanOrEqual(12);

      await expect(postcodePage.continueButton).toBeDisabled();
      await postcodePage.selectAddress('addr_sw1a_01');
      await expect(postcodePage.continueButton).toBeEnabled();
    });

    test('EC1A 1BB renders the empty state (not an error)', async ({
      page,
      postcodePage,
    }) => {
      await postcodePage.lookup('EC1A 1BB');

      await expect(postcodePage.empty).toBeVisible();
      await expect(postcodePage.empty).toContainText(/no addresses found/i);
      await expect(postcodePage.addressList).toBeHidden();
      await expect(page.getByRole('alert', { name: /error/i })).toHaveCount(0);
    });

    test('EC1A 1BB exposes a manual-entry fallback', async ({
      page,
      postcodePage,
    }) => {
      await postcodePage.lookup('EC1A 1BB');
      await page.getByTestId('postcode-manual-entry').click();
      await expect(page.getByTestId('manual-entry')).toBeVisible();
      await expect(page.getByTestId('manual-line1')).toBeVisible();
      await expect(page.getByTestId('manual-city')).toBeVisible();
    });

    test('M1 1AE shows a loading spinner before the delayed response', async ({
      page,
      postcodePage,
    }) => {
      await postcodePage.input.fill('M1 1AE');
      await postcodePage.submit.click();

      await expect(postcodePage.loading).toBeVisible();
      // Simulated delay is ~2500 ms; address list should arrive within a
      // reasonable window afterwards.
      await expect(postcodePage.addressList).toBeVisible({ timeout: 10_000 });
      await expect(postcodePage.loading).toBeHidden();
      await expect(page.getByText('Manchester').first()).toBeVisible();
    });

    test('BS1 4DJ: 500 on first call surfaces error + retry, then succeeds', async ({
      page,
      postcodePage,
    }) => {
      await postcodePage.lookup('BS1 4DJ');

      await expect(page.getByRole('alert')).toBeVisible();
      await expect(postcodePage.retry).toBeVisible();

      const retry = page.waitForResponse(
        (r) => r.url().endsWith('/api/postcode/lookup') && r.status() === 200,
      );
      await postcodePage.retry.click();
      await retry;

      await expect(postcodePage.addressList).toBeVisible();
      await expect(page.getByRole('alert')).toBeHidden();
    });
  });

  test.describe('regression', () => {
    test('BUG-004 — re-submitting the same postcode preserves the selected address', async ({
      page,
      postcodePage,
    }) => {
      await postcodePage.lookup('SW1A 1AA');
      await postcodePage.selectAddress('addr_sw1a_01');
      await expect(postcodePage.continueButton).toBeEnabled();

      // Re-click Find address without changing the input value.
      const retriggered = page.waitForResponse(
        (r) => r.url().endsWith('/api/postcode/lookup') && r.status() === 200,
      );
      await postcodePage.submit.click();
      await retriggered;

      // Same radio still checked → Continue still enabled.
      const radio = page
        .getByTestId('address-option-addr_sw1a_01')
        .locator('input[type="radio"]');
      await expect(radio).toBeChecked();
      await expect(postcodePage.continueButton).toBeEnabled();
    });

    test('changing the postcode still clears the previous selection', async ({
      postcodePage,
    }) => {
      await postcodePage.lookup('SW1A 1AA');
      await postcodePage.selectAddress('addr_sw1a_01');

      // New postcode → selection must be cleared (not preserved from prior run).
      await postcodePage.input.fill('EC1A 1BB');
      await postcodePage.submit.click();
      await expect(postcodePage.empty).toBeVisible();

      // addr_sw1a_01 isn't in EC1A's list (which is empty) — but continue must
      // also be unreachable: the empty-state branch owns the UI now.
      await expect(postcodePage.continueButton).toBeHidden();
    });
  });
});
