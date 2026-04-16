import { test, expect } from '../fixtures/test-fixtures';

/**
 * Flow B — BS1 4DJ (retry) → heavy waste + plasterboard → disabled skips →
 * enabled skip → review → double-click confirm → success.
 *
 * Covers:  §2 heavy + plasterboard + 3 handling options, disabled skips, error+retry
 *          §3 Step 2 branching, Step 3 disabled logic, Step 4 double-submit prevention
 *          §4 BS1 4DJ retry + heavy-waste disabling
 *          §8 flow #2
 */
test('Flow B — BS1 4DJ retry → heavy+plasterboard → disabled skips → confirm (single-fire)', async ({
  page,
  postcodePage,
  wastePage,
  skipPage,
  reviewPage,
}) => {
  // --- Step 1: retry after 500 ---
  await postcodePage.lookup('BS1 4DJ');
  const errorAlert = page.getByRole('alert');
  await expect(errorAlert).toBeVisible();
  await expect(postcodePage.retry).toBeVisible();

  const [retryResponse] = await Promise.all([
    page.waitForResponse(
      (res) => res.url().endsWith('/api/postcode/lookup') && res.status() === 200,
    ),
    postcodePage.retry.click(),
  ]);
  expect(retryResponse.status()).toBe(200);
  await expect(postcodePage.addressList).toBeVisible();
  await expect(errorAlert).toBeHidden();

  await postcodePage.selectAddress('addr_bs1_01');
  await postcodePage.continueButton.click();

  // --- Step 2: heavy + plasterboard + handling option ---
  await expect(wastePage.heading).toBeVisible();
  await wastePage.toggleHeavy();
  await wastePage.togglePlasterboard();
  // The three plasterboard handling options appear.
  await expect(wastePage.plasterboardOptions).toBeVisible();
  await expect(page.getByTestId('plasterboard-under_10')).toBeVisible();
  await expect(page.getByTestId('plasterboard-10_to_25')).toBeVisible();
  await expect(page.getByTestId('plasterboard-over_25')).toBeVisible();

  await wastePage.selectHandlingOption('under_10');

  const [wasteRequest] = await Promise.all([
    page.waitForRequest(
      (r) => r.url().endsWith('/api/waste-types') && r.method() === 'POST',
    ),
    wastePage.continueButton.click(),
  ]);
  expect(wasteRequest.postDataJSON()).toEqual({
    heavyWaste: true,
    plasterboard: true,
    plasterboardOption: 'under_10',
  });

  // --- Step 3: disabled skips visible, cannot be selected ---
  await expect(skipPage.heading).toBeVisible();
  await expect(skipPage.heavyWasteNotice).toBeVisible();
  // Wait for the skip list to paint. The notice lives in the header and
  // renders before /api/skips resolves, so gating on it alone races the
  // disabled-card count.
  await expect(skipPage.list).toBeVisible();
  await expect(skipPage.card('4-yard')).toBeVisible();

  // At least 2 skips disabled (§4 mandate).
  const disabledCount = await skipPage.disabledCards().count();
  expect(disabledCount).toBeGreaterThanOrEqual(2);

  // Each disabled skip shows a reason.
  for (const testid of await skipPage.disabledCards().evaluateAll((els) =>
    els.map((e) => (e as HTMLElement).getAttribute('data-testid')),
  )) {
    await expect(page.getByTestId(`${testid}-reason`)).toBeVisible();
  }

  // Clicking a disabled skip should not select it (stays aria-checked=false).
  const firstDisabled = skipPage.disabledCards().first();
  await firstDisabled.click({ force: true }).catch(() => {}); // disabled may reject
  await expect(firstDisabled).toHaveAttribute('aria-checked', 'false');

  // Pick an enabled skip.
  await skipPage.select('6-yard');
  await expect(skipPage.card('6-yard')).toHaveAttribute('aria-checked', 'true');
  await skipPage.continueButton.click();

  // --- Step 4: review includes all selections ---
  await expect(reviewPage.heading).toBeVisible();
  await expect(page.getByTestId('review-waste')).toContainText('Heavy waste');
  await expect(page.getByTestId('review-waste')).toContainText('Plasterboard');
  await expect(page.getByTestId('review-waste')).toContainText('Under 10%');
  await expect(page.getByTestId('review-skip')).toHaveText(/6 Yard Skip/);

  // Double-click Confirm — assert exactly one /booking/confirm request fires.
  const confirmCalls: string[] = [];
  page.on('request', (req) => {
    if (req.url().endsWith('/api/booking/confirm')) confirmCalls.push(req.url());
  });

  const [confirmRes] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/api/booking/confirm')),
    (async () => {
      // Two rapid clicks. The second should no-op because the button disables synchronously.
      await reviewPage.confirmButton.click();
      await reviewPage.confirmButton.click({ force: true }).catch(() => {});
    })(),
  ]);
  expect(confirmRes.status()).toBe(200);

  // Wait a tick to let any stray second request arrive, then assert single-fire.
  await expect.poll(() => confirmCalls.length, { timeout: 2_000 }).toBe(1);

  await expect(page.getByTestId('booking-success')).toBeVisible();
  await expect(page.getByTestId('booking-id')).toHaveText(/^BK-\d+$/);
});
