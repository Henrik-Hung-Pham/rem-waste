import { test, expect } from '../fixtures/test-fixtures';

/**
 * Flow A — General waste happy path.
 *
 * Covers:  §2 general waste, 12+ addresses, 8+ skips, price breakdown
 *          §3 all four steps  ·  §4 SW1A 1AA  ·  §5 all four endpoints
 *
 * Assertion at every step per §8.
 */
test('Flow A — SW1A 1AA → general waste → 4-yard → confirm booking', async ({
  page,
  postcodePage,
  wastePage,
  skipPage,
  reviewPage,
}) => {
  // --- Step 1: postcode lookup ---
  await expect(
    page.getByRole('heading', { name: /where do you need/i }),
  ).toBeVisible();

  await postcodePage.lookup('SW1A 1AA');
  await expect(postcodePage.addressList).toBeVisible();
  const addressCount = await postcodePage.addressOptions().count();
  expect(addressCount).toBeGreaterThanOrEqual(12);

  await postcodePage.selectAddress('addr_sw1a_01');
  await expect(postcodePage.continueButton).toBeEnabled();
  await postcodePage.continueButton.click();

  // --- Step 2: waste type (general) ---
  await expect(wastePage.heading).toBeVisible();

  const [wasteRequest] = await Promise.all([
    page.waitForRequest(
      (req) => req.url().endsWith('/api/waste-types') && req.method() === 'POST',
    ),
    (async () => {
      await wastePage.toggleGeneral();
      await wastePage.continueButton.click();
    })(),
  ]);
  expect(wasteRequest.postDataJSON()).toEqual({
    heavyWaste: false,
    plasterboard: false,
    plasterboardOption: null,
  });

  // --- Step 3: skip selection ---
  await expect(skipPage.heading).toBeVisible();
  await expect(skipPage.list).toBeVisible();
  // Outer card elements have data-disabled; inner price/reason spans do not.
  const sizeCards = await page.locator('[data-testid^="skip-"][data-disabled]').count();
  expect(sizeCards).toBeGreaterThanOrEqual(8);
  // No disabled skips under general waste
  await expect(skipPage.disabledCards()).toHaveCount(0);
  // Notice hidden under general waste
  await expect(skipPage.heavyWasteNotice).toBeHidden();

  await skipPage.select('4-yard');
  await expect(skipPage.continueButton).toBeEnabled();
  await skipPage.continueButton.click();

  // --- Step 4: review + confirm ---
  await expect(reviewPage.heading).toBeVisible();
  await expect(page.getByTestId('review-address')).toContainText('10 Downing Street');
  await expect(page.getByTestId('review-address')).toContainText('SW1A 1AA');
  await expect(page.getByTestId('review-waste')).toHaveText(/General waste/);
  await expect(page.getByTestId('review-skip')).toHaveText(/4 Yard Skip/);

  const breakdown = await reviewPage.readBreakdown();
  // Arithmetic sanity — subtotal = skip + permit; total = subtotal + vat
  expect(breakdown.subtotal).toBeCloseTo(breakdown.skip + breakdown.permit, 2);
  expect(breakdown.total).toBeCloseTo(breakdown.subtotal + breakdown.vat, 2);

  // Count every confirm request fired during a deliberate double-click.
  let confirmRequestCount = 0;
  page.on('request', (req) => {
    if (req.url().endsWith('/api/booking/confirm') && req.method() === 'POST') {
      confirmRequestCount += 1;
    }
  });

  const [confirmRequest] = await Promise.all([
    page.waitForRequest(
      (req) => req.url().endsWith('/api/booking/confirm') && req.method() === 'POST',
    ),
    (async () => {
      await reviewPage.confirmButton.click();
      // Second click should be a no-op — button must disable on first click.
      await reviewPage.confirmButton.click({ force: true, trial: false }).catch(() => {});
    })(),
  ]);
  const confirmBody = confirmRequest.postDataJSON();
  expect(confirmBody).toMatchObject({
    postcode: 'SW1A 1AA',
    addressId: 'addr_sw1a_01',
    heavyWaste: false,
    plasterboard: false,
    skipSize: '4-yard',
    price: 120,
  });

  // Success screen with booking ID shape
  await expect(page.getByTestId('booking-success')).toBeVisible();
  await expect(page.getByTestId('booking-id')).toHaveText(/^BK-\d+$/);

  // Double-submit prevention: exactly one POST despite two clicks.
  expect(confirmRequestCount).toBe(1);
});
