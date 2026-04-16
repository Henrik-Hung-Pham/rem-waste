import { test, expect } from '../fixtures/test-fixtures';

/**
 * Step 3 — Skip selection.
 *
 * §2 mandates ≥8 skip options with mixed enabled/disabled, §4 mandates heavy
 * waste disables at least 2, §3 mandates normalization and disabled logic.
 */
test.describe('Step 3 — Skip selection', () => {
  test.describe('general waste', () => {
    test.beforeEach(async ({ postcodePage, wastePage }) => {
      await postcodePage.lookup('SW1A 1AA');
      await postcodePage.selectAddress('addr_sw1a_01');
      await postcodePage.continueButton.click();
      await wastePage.toggleGeneral();
      await wastePage.continueButton.click();
    });

    test('renders ≥8 skips, all enabled, no heavy-waste notice', async ({
      page,
      skipPage,
    }) => {
      await expect(skipPage.heading).toBeVisible();
      await expect(skipPage.list).toBeVisible();

      const total = await page.locator('[data-testid^="skip-"][data-disabled]').count();
      expect(total).toBeGreaterThanOrEqual(8);

      await expect(skipPage.disabledCards()).toHaveCount(0);
      await expect(skipPage.heavyWasteNotice).toBeHidden();
    });

    test('Continue is disabled until a skip is selected', async ({ skipPage }) => {
      await expect(skipPage.continueButton).toBeDisabled();
      await skipPage.select('4-yard');
      await expect(skipPage.continueButton).toBeEnabled();
    });

    test('selecting a skip marks only that card aria-checked=true', async ({
      skipPage,
    }) => {
      await skipPage.select('6-yard');
      await expect(skipPage.card('6-yard')).toHaveAttribute('aria-checked', 'true');
      await expect(skipPage.card('4-yard')).toHaveAttribute('aria-checked', 'false');

      // Switching selection updates aria-checked on both cards.
      await skipPage.select('8-yard');
      await expect(skipPage.card('8-yard')).toHaveAttribute('aria-checked', 'true');
      await expect(skipPage.card('6-yard')).toHaveAttribute('aria-checked', 'false');
    });

    test('every skip card renders a £ price', async ({ page, skipPage }) => {
      await expect(skipPage.card('4-yard')).toBeVisible();
      const prices = page.locator('[data-testid$="-price"][data-testid^="skip-"]');
      const count = await prices.count();
      expect(count).toBeGreaterThanOrEqual(8);
      for (let i = 0; i < count; i++) {
        await expect(prices.nth(i)).toHaveText(/£\d+/);
      }
    });
  });

  test.describe('heavy waste', () => {
    test.beforeEach(async ({ postcodePage, wastePage, skipPage }) => {
      await postcodePage.lookup('SW1A 1AA');
      await postcodePage.selectAddress('addr_sw1a_01');
      await postcodePage.continueButton.click();
      await wastePage.toggleHeavy();
      await wastePage.continueButton.click();
      // Wait for the skips response to paint before any test queries cards —
      // the heavy-waste notice renders in the header, so asserting on the
      // notice alone doesn't wait for /api/skips to resolve.
      await expect(skipPage.list).toBeVisible();
      await expect(skipPage.card('4-yard')).toBeVisible();
    });

    test('shows the heavy-waste notice and ≥2 disabled skips', async ({ skipPage }) => {
      await expect(skipPage.heavyWasteNotice).toBeVisible();
      const disabled = await skipPage.disabledCards().count();
      expect(disabled).toBeGreaterThanOrEqual(2);
    });

    test('each disabled skip renders an explanation', async ({ page, skipPage }) => {
      await expect(skipPage.list).toBeVisible();
      await expect(skipPage.disabledCards().first()).toBeVisible();
      const testids = await skipPage.disabledCards().evaluateAll((els) =>
        els.map((e) => (e as HTMLElement).getAttribute('data-testid')),
      );
      expect(testids.length).toBeGreaterThan(0);
      for (const tid of testids) {
        await expect(page.getByTestId(`${tid}-reason`)).toBeVisible();
      }
    });

    test('clicking a disabled skip does not select it', async ({ skipPage }) => {
      await expect(skipPage.list).toBeVisible();
      await expect(skipPage.disabledCards().first()).toBeVisible();
      const first = skipPage.disabledCards().first();
      await first.click({ force: true }).catch(() => undefined);
      await expect(first).toHaveAttribute('aria-checked', 'false');
      await expect(skipPage.continueButton).toBeDisabled();
    });
  });
});
