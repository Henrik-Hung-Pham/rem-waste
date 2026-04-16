import { http, HttpResponse, delay } from 'msw';
import { normalizePostcode } from '../api/schemas';
import {
  SW1A_1AA_ADDRESSES,
  BS1_4DJ_ADDRESSES,
  M1_1AE_ADDRESSES,
} from './fixtures/addresses';
import { buildSkips, SKIP_CATALOGUE } from './fixtures/skips';
import { mockState, resetMockState } from './fixtures/state';

/**
 * Handlers for ASSESSMENT.md §4 deterministic fixtures + §5 API contract.
 *
 *   SW1A 1AA → ≥12 addresses
 *   EC1A 1BB → 0 addresses (empty state)
 *   M1 1AE   → simulated latency (~2500 ms) then populated list
 *   BS1 4DJ  → first call 500, subsequent calls succeed
 *
 * Any other valid-looking postcode → small fallback list.
 * Invalid postcodes → 400.
 */
export const handlers = [
  // Test-only reset endpoint. Playwright hits this in beforeEach to clear counters.
  http.post('/_mocks/reset', () => {
    resetMockState();
    return HttpResponse.json({ ok: true });
  }),

  http.post('/api/postcode/lookup', async ({ request }) => {
    const body = (await request.json().catch(() => null)) as { postcode?: unknown } | null;
    const raw = typeof body?.postcode === 'string' ? body.postcode : '';
    const normalized = normalizePostcode(raw);

    if (!/^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/.test(normalized)) {
      return HttpResponse.json(
        { error: 'INVALID_POSTCODE', message: 'Enter a valid UK postcode' },
        { status: 400 },
      );
    }

    switch (normalized) {
      case 'SW1A 1AA':
        return HttpResponse.json({ postcode: normalized, addresses: SW1A_1AA_ADDRESSES });

      case 'EC1A 1BB':
        return HttpResponse.json({ postcode: normalized, addresses: [] });

      case 'M1 1AE':
        await delay(2500);
        return HttpResponse.json({ postcode: normalized, addresses: M1_1AE_ADDRESSES });

      case 'BS1 4DJ': {
        mockState.bs1RetryCounter += 1;
        if (mockState.bs1RetryCounter === 1) {
          return HttpResponse.json(
            { error: 'UPSTREAM_ERROR', message: 'Address service unavailable' },
            { status: 500 },
          );
        }
        return HttpResponse.json({ postcode: normalized, addresses: BS1_4DJ_ADDRESSES });
      }

      default:
        return HttpResponse.json({
          postcode: normalized,
          addresses: [
            { id: 'addr_generic_1', line1: '1 High Street', city: 'Anytown' },
            { id: 'addr_generic_2', line1: '2 High Street', city: 'Anytown' },
          ],
        });
    }
  }),

  http.post('/api/waste-types', async ({ request }) => {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (
      !body ||
      typeof body.heavyWaste !== 'boolean' ||
      typeof body.plasterboard !== 'boolean' ||
      (body.plasterboardOption !== null &&
        !['under_10', '10_to_25', 'over_25'].includes(body.plasterboardOption as string))
    ) {
      return HttpResponse.json(
        { error: 'INVALID_PAYLOAD', message: 'Invalid waste-types payload' },
        { status: 400 },
      );
    }
    // Plasterboard true requires an option.
    if (body.plasterboard && body.plasterboardOption === null) {
      return HttpResponse.json(
        { error: 'MISSING_OPTION', message: 'Plasterboard handling option is required' },
        { status: 400 },
      );
    }
    return HttpResponse.json({ ok: true });
  }),

  http.get('/api/skips', ({ request }) => {
    const url = new URL(request.url);
    const postcode = url.searchParams.get('postcode') ?? '';
    const heavyWaste = url.searchParams.get('heavyWaste') === 'true';
    if (!postcode) {
      return HttpResponse.json(
        { error: 'MISSING_POSTCODE', message: 'postcode is required' },
        { status: 400 },
      );
    }
    return HttpResponse.json({ skips: buildSkips(heavyWaste) });
  }),

  http.post('/api/booking/confirm', async ({ request }) => {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const required = ['postcode', 'addressId', 'heavyWaste', 'plasterboard', 'skipSize', 'price'];
    if (!body || required.some((k) => !(k in body))) {
      return HttpResponse.json(
        { error: 'INVALID_PAYLOAD', message: 'Missing required booking fields' },
        { status: 400 },
      );
    }
    // Server-side catalogue validation — rejects tampered prices and unknown
    // skip sizes. Matches manual TC-N10 (Price Tampering) expectation.
    const entry = SKIP_CATALOGUE.find((s) => s.size === body.skipSize);
    if (!entry) {
      return HttpResponse.json(
        { error: 'UNKNOWN_SKIP_SIZE', message: 'Unknown skip size' },
        { status: 400 },
      );
    }
    if (typeof body.price !== 'number' || body.price !== entry.price) {
      return HttpResponse.json(
        { error: 'PRICE_MISMATCH', message: 'Submitted price does not match catalogue' },
        { status: 400 },
      );
    }
    // Deterministic booking ID — stable per-session counter so tests can assert shape.
    mockState.bookingCounter += 1;
    const bookingId = `BK-${String(10000 + mockState.bookingCounter)}`;
    return HttpResponse.json({ status: 'success', bookingId });
  }),
];
