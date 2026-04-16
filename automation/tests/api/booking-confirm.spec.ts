import { z } from 'zod';
import { test, expect } from '../fixtures/test-fixtures';
import { apiCall } from './_helpers';

const Response = z.object({
  status: z.literal('success'),
  bookingId: z.string().regex(/^BK-\d+$/),
});

function post(data: unknown) {
  return {
    method: 'POST' as const,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data),
  };
}

test.describe('POST /api/booking/confirm — contract', () => {
  const happyPayload = {
    postcode: 'SW1A 1AA',
    addressId: 'addr_sw1a_01',
    heavyWaste: false,
    plasterboard: false,
    skipSize: '4-yard',
    price: 120,
  };

  test('happy path returns bookingId', async ({ freshPage }) => {
    const res = await apiCall(freshPage, '/api/booking/confirm', post(happyPayload));
    expect(res.status).toBe(200);
    Response.parse(res.body);
  });

  test('missing required field returns 400', async ({ freshPage }) => {
    const { price: _omit, ...bad } = happyPayload;
    const res = await apiCall(freshPage, '/api/booking/confirm', post(bad));
    expect(res.status).toBe(400);
  });

  test('TC-N10 — tampered price rejected with PRICE_MISMATCH', async ({ freshPage }) => {
    const tampered = { ...happyPayload, price: 10 };
    const res = await apiCall(freshPage, '/api/booking/confirm', post(tampered));
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: 'PRICE_MISMATCH' });
  });

  test('unknown skipSize rejected with UNKNOWN_SKIP_SIZE', async ({ freshPage }) => {
    const bad = { ...happyPayload, skipSize: '99-yard' };
    const res = await apiCall(freshPage, '/api/booking/confirm', post(bad));
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: 'UNKNOWN_SKIP_SIZE' });
  });
});
