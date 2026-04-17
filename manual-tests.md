# Manual Test Plan — rem-waste Booking Flow

> **Scope**: end-to-end manual coverage of the 4-step skip-booking flow (postcode → waste → skip → review) plus its branching, error and state-transition behaviours.
> **Owner**: QA — author / executor on each row.
> **Build under test**: `2026-04-17:milestone-4` (matches the deployed Pages bundle).
> **Environment**: Production demo at `https://jason-pham.github.io/rem-waste/`. Local mirror: `cd ui && npm run dev` → `http://localhost:5173`.
> **Mocking**: MSW service-worker in-browser, fixtures per `ASSESSMENT.md §4`. No real backend.
> **Requirement mapping**: `ASSESSMENT.md §6` — ≥35 total, ≥10 negative, ≥6 edge, ≥4 API-failure, ≥4 state-transition. Strict markdown tables.
> **Reset between cases**: hard refresh the tab (or, in DevTools console, `await fetch('/_mocks/reset', { method: 'POST' })`) so MSW counters return to a clean slate.

## Coverage summary

| Bucket | Required | Delivered |
| :--- | :---: | :---: |
| **Total** | 35 | **39** |
| Positive (happy paths) | — | 11 |
| Negative (block / reject) | 10 | **11** |
| Edge (boundaries / unusual input) | 6 | **7** |
| API failure (5xx / 4xx injection) | 4 | **5** |
| State transition (cross-step state) | 4 | **5** |

## How to read this file

- Each table row is one test case. Columns: **ID · Title · Priority · Preconditions · Steps · Expected · Status**.
- **ID prefix** signals bucket: `P` positive · `N` negative · `E` edge · `A` API failure · `T` state transition.
- **Preconditions** is what state must be true *before* the steps run. If empty, "fresh tab on Step 1".
- **Steps** are numbered, self-contained, and refer to no other row. Reuse common setup by re-running it — verbosity beats hidden coupling.
- **Priority** uses P1 (release-blocking) / P2 (current-sprint) / P3 (backlog).

---

## P — Positive happy paths (11)

| ID | Title | Priority | Preconditions | Steps | Expected | Status |
| :--- | :--- | :---: | :--- | :--- | :--- | :---: |
| **P-01** | Standard SW1A 1AA → general → 4-yard booking succeeds | P1 | Fresh tab. | 1. Open `/`.<br>2. Type `SW1A 1AA`. Click **Find address**.<br>3. Select `10 Downing Street`. Click **Continue**.<br>4. Tick **General waste**. Click **Continue**.<br>5. Click the **4 Yard Skip** card. Click **Continue**.<br>6. On Review, click **Confirm booking**. | Success screen renders with a booking ID matching `BK-\d+`. | ✅ Pass |
| **P-02** | Heavy waste journey emits `heavyWaste:true` payload | P1 | Fresh tab. DevTools Network open, filter `confirm`. | 1. Look up `SW1A 1AA`. Pick any address. Continue.<br>2. Tick **Heavy waste** only (leave General and Plasterboard unticked). Continue.<br>3. Pick the **6 Yard Skip**. Continue.<br>4. Click **Confirm booking**. | Success screen shown. The recorded `POST /api/booking/confirm` request body contains `"heavyWaste": true` and `"plasterboard": false`. | ✅ Pass |
| **P-03** | Plasterboard < 10% emits `plasterboardOption:"under_10"` | P1 | Fresh tab. DevTools Network open. | 1. Look up `SW1A 1AA`. Pick any address. Continue.<br>2. Tick **Plasterboard**. Select **Under 10% of load**. Continue.<br>3. Pick the **8 Yard Skip**. Continue.<br>4. Confirm. | Success. The waste-types and confirm requests both contain `"plasterboardOption": "under_10"`. Review summary shows `Plasterboard (Under 10% of load)`. | ✅ Pass |
| **P-04** | Plasterboard 10–25% emits `plasterboardOption:"10_to_25"` | P2 | Fresh tab. | 1. Look up `SW1A 1AA`. Pick any address. Continue.<br>2. Tick **Plasterboard**. Select **10–25% of load**. Continue.<br>3. Pick any enabled skip. Continue.<br>4. Confirm. | Success. Confirm request contains `"plasterboardOption": "10_to_25"`. Review reads `Plasterboard (10–25% of load)`. | ✅ Pass |
| **P-05** | Plasterboard > 25% emits `plasterboardOption:"over_25"` | P2 | Fresh tab. | 1. Look up `SW1A 1AA`. Pick any address. Continue.<br>2. Tick **Plasterboard**. Select **Over 25% of load**. Continue.<br>3. Pick any enabled skip. Continue.<br>4. Confirm. | Success. Confirm request contains `"plasterboardOption": "over_25"`. Review reads `Plasterboard (Over 25% of load)`. | ✅ Pass |
| **P-06** | Heavy + plasterboard combined accepted | P2 | Fresh tab. | 1. Look up `SW1A 1AA`. Pick any address. Continue.<br>2. Tick **Heavy waste** AND **Plasterboard** → **Under 10% of load**. Continue.<br>3. Pick the **6 Yard Skip**. Continue.<br>4. Confirm. | Success. Confirm body contains both `"heavyWaste": true` and `"plasterboard": true`. Review summary lists both lines. | ✅ Pass |
| **P-07** | Empty postcode → manual entry fallback succeeds | P1 | Fresh tab. | 1. Type `EC1A 1BB`. Click **Find address**.<br>2. Click **Enter address manually**.<br>3. Fill `Address line 1` = `1 Test Street`, `City` = `Testville`. Click **Continue**.<br>4. Tick **General waste**. Continue.<br>5. Pick **4 Yard Skip**. Continue.<br>6. Confirm. | Success. Review summary shows `1 Test Street, Testville (EC1A 1BB)`. Confirm body `addressId` starts with `manual_`. | ✅ Pass |
| **P-08** | Book-again resets state to a clean Step 1 | P2 | Completed booking on screen (run P-01 first). | 1. On the success screen, click **Book another skip**.<br>2. Look up `SW1A 1AA`. Pick any address. Continue.<br>3. Tick **General waste**. Continue.<br>4. Pick **4 Yard Skip**. Continue.<br>5. Confirm. | A second success screen renders with a booking ID **different** from the first run's. | ✅ Pass |
| **P-09** | Largest skip (20-yard) bookable under general waste | P3 | Fresh tab. | 1. Look up `SW1A 1AA`. Pick any address. Continue.<br>2. Tick **General waste**. Continue.<br>3. Pick the **20 Yard Skip**. Continue.<br>4. Confirm. | Success. Review and confirm body show `"skipSize": "20-yard"` and `"price": 480`. | ✅ Pass |
| **P-10** | Smallest skip (4-yard) bookable under general waste | P3 | Fresh tab. | 1. Look up `SW1A 1AA`. Pick any address. Continue.<br>2. Tick **General waste**. Continue.<br>3. Pick the **4 Yard Skip**. Continue.<br>4. Confirm. | Success. Confirm body shows `"skipSize": "4-yard"` and `"price": 120`. | ✅ Pass |
| **P-11** | Price breakdown sums correctly (8-yard) | P1 | Fresh tab. | 1. Look up `SW1A 1AA`. Pick any address. Continue.<br>2. Tick **General waste**. Continue.<br>3. Pick the **8 Yard Skip** (£230). Continue.<br>4. On Review, read each row of the price-breakdown panel. | Skip = `£230.00`, Permit = `£30.00`, Subtotal = `£260.00`, VAT (20%) = `£52.00`, Total = `£312.00`. Subtotal == skip + permit. Total == subtotal + vat. | ✅ Pass |

---

## N — Negative paths (11)

| ID | Title | Priority | Preconditions | Steps | Expected | Status |
| :--- | :--- | :---: | :--- | :--- | :--- | :---: |
| **N-01** | Invalid postcode format blocked client-side | P1 | Fresh tab. DevTools Network open. | 1. Type `QWERTY 123`.<br>2. Click **Find address**. | A `role="alert"` element appears reading "Enter a valid UK postcode". No `POST /api/postcode/lookup` request is sent. No address list, no spinner. | ✅ Pass |
| **N-02** | Empty address list (EC1A 1BB) cannot be bypassed without manual entry | P1 | Fresh tab. | 1. Type `EC1A 1BB`. Click **Find address**.<br>2. Verify the empty-state message is visible.<br>3. Without filling the manual-entry form, attempt to advance (no Continue button should be visible). | No **Continue** button is rendered. The only forward path is the **Enter address manually** button. The user cannot reach Step 2. | ✅ Pass |
| **N-03** | Step 2 Continue with no waste-type selection is blocked | P1 | At Step 2 (look up `SW1A 1AA`, pick any address, Continue). | 1. Leave all three waste-type checkboxes unticked.<br>2. Click **Continue**. | An inline alert appears: "Select at least one waste type to continue." Step does not advance. No `POST /api/waste-types` is sent. | ✅ Pass |
| **N-04** | Plasterboard ticked without a handling option is blocked | P1 | At Step 2. | 1. Tick **Plasterboard**.<br>2. Without selecting any of the three handling options, click **Continue**. | Inline alert: "Choose how much plasterboard is in your load." Step does not advance. | ✅ Pass |
| **N-05** | Step 3 Continue with no skip selected is blocked | P1 | At Step 3 (postcode → address → general waste → Continue). | 1. Click **Continue** without picking any skip card. | The **Continue** button is `disabled`. Clicking has no effect. | ✅ Pass |
| **N-06** | Disabled (heavy-waste-blocked) skip card cannot be selected | P1 | At Step 3 with **Heavy waste** chosen at Step 2. | 1. Locate the `12 Yard Skip` card (rendered with greyed style and reason text).<br>2. Click on its surface. | The card has `aria-disabled="true"`. Click is a no-op: `aria-checked` remains `false`. **Continue** stays disabled. The reason text "Not available for heavy waste" is visible. | ✅ Pass |
| **N-07** | Manual address entry with empty Line 1 is blocked | P2 | Empty postcode flow open (look up `EC1A 1BB`, click **Enter address manually**). | 1. Leave `Address line 1` empty. Fill `City` with `Testville`.<br>2. Click **Continue**. | Inline `role="alert"` reads "Enter the first line of your address." Step does not advance. | ✅ Pass |
| **N-08** | Rapid double-click on Confirm sends exactly one request | P1 | At Step 4 with a complete booking (postcode → address → general → 4-yard → Continue). DevTools Network open, filter `/api/booking/confirm`. | 1. Throttle network to "Slow 3G" (DevTools → Network → Throttling).<br>2. Click **Confirm booking** twice as fast as possible. | Exactly **one** `POST /api/booking/confirm` request is recorded. Button label flips to "Confirming…" and `disabled`. Success screen renders with one booking ID. | ✅ Pass |
| **N-09** | Confirm with `postcode` field stripped returns 400 | P2 | At Step 4 with a complete booking. DevTools open. Source-tab → "Override request". | 1. Set up an override that drops the `postcode` field from the `POST /api/booking/confirm` body.<br>2. Click **Confirm booking**. | Response is HTTP 400 with `{"error":"INVALID_PAYLOAD"}`. UI shows a "Booking failed" alert with a Retry button. Success screen is not reached. | ✅ Pass |
| **N-10** | Confirm with tampered `price` is rejected with `PRICE_MISMATCH` | P1 | At Step 4 with an 8-yard skip selected (catalogue price £230). DevTools open. | 1. Use a fetch override (or DevTools "Override response" plus a request rewriter) to change `"price": 230` to `"price": 10` in the outbound `POST /api/booking/confirm` body.<br>2. Click **Confirm booking**. | Response is HTTP 400 with `{"error":"PRICE_MISMATCH"}`. UI shows a "Booking failed" alert. Success screen is not reached. Covered by automated `tests/e2e/step4-review.spec.ts::TC-N10` and `tests/api/booking-confirm.spec.ts::tampered price`. | ✅ Pass |
| **N-11** | Manual address entry with empty City is blocked | P2 | Empty postcode flow open (look up `EC1A 1BB`, click **Enter address manually**). | 1. Fill `Address line 1` = `1 Test Street`. Leave `City` empty.<br>2. Click **Continue**. | Inline `role="alert"` reads "Enter a city or town." Step does not advance. No downstream request is sent. | ✅ Pass |

---

## E — Edge cases (7)

| ID | Title | Priority | Preconditions | Steps | Expected | Status |
| :--- | :--- | :---: | :--- | :--- | :--- | :---: |
| **E-01** | Lowercase postcode is normalised to canonical form | P2 | Fresh tab. DevTools Network open. | 1. Type `sw1a 1aa` (all lowercase).<br>2. Click **Find address**. | The outgoing request body's `postcode` field equals `SW1A 1AA` (canonical case). 14 addresses render. | ✅ Pass |
| **E-02** | Excess whitespace around postcode is trimmed | P2 | Fresh tab. | 1. Type `   SW1A   1AA   `.<br>2. Click **Find address**. | Address list renders normally. The form does not error. The request is sent with the trimmed canonical postcode. | ✅ Pass |
| **E-03** | Rapid skip toggling captures the final selection | P3 | At Step 3 (postcode → address → general → Continue). | 1. Click the **4 Yard Skip** card.<br>2. Click the **6 Yard Skip** card.<br>3. Repeat clicks alternating 4-yard / 6-yard 20+ times.<br>4. End on **6 Yard Skip**. Click **Continue**. | Review summary reads `6 Yard Skip`. Confirm body's `skipSize` is `6-yard`. No console errors. | ✅ Pass |
| **E-04** | Manual-entry city renders as text, not HTML (XSS guard) | P1 | Empty postcode flow open (look up `EC1A 1BB` → **Enter address manually**). | 1. Fill `Address line 1` = `1 Test Street`.<br>2. Fill `City` = `<script>alert('XSS')</script>`.<br>3. Continue. Tick **General waste**. Continue. Pick any skip. Continue. | No JavaScript alert fires. The Review summary's address line literally contains the string `<script>alert('XSS')</script>` rendered as text. | ✅ Pass |
| **E-05** | Hard refresh mid-flow returns to Step 1 (documented limitation) | P3 | At Step 3 (any complete prior selections). | 1. Press Cmd-R / Ctrl-R to hard refresh the tab. | Page reloads to Step 1 with empty inputs. No console errors, no broken half-rendered components. Documented as a known limitation in `README.md` § "Known limitations". | ✅ Pass |
| **E-06** | Confirm while offline surfaces a recoverable error | P2 | At Step 4 with a complete booking. DevTools Network open. | 1. In DevTools → Network, set throttling to **Offline**.<br>2. Click **Confirm booking**. | Spinner appears briefly then disappears. A "Booking failed" alert with a **Retry** button is shown. The Confirm button re-enables (or the Retry button takes over). Switching back to "No throttling" and clicking Retry succeeds. | ✅ Pass |
| **E-07** | Unicode characters in manual City render as plain text in Review | P3 | Empty postcode flow open (look up `EC1A 1BB` → **Enter address manually**). | 1. Fill `Address line 1` = `1 Rue de l'Église`.<br>2. Fill `City` = `São Paulo — 北京`.<br>3. Continue. Tick **General waste**. Continue. Pick any skip. Continue. | The Review summary's address line displays the exact unicode string (accents, em-dash, Chinese characters) as rendered text. No mojibake, no console encoding warnings. | ✅ Pass |

---

## A — API failure injections (5)

| ID | Title | Priority | Preconditions | Steps | Expected | Status |
| :--- | :--- | :---: | :--- | :--- | :--- | :---: |
| **A-01** | Postcode lookup 500 (BS1 4DJ deterministic fixture) shows error + Retry | P1 | Fresh tab (so the BS1 retry counter is reset). | 1. Type `BS1 4DJ`. Click **Find address**. | A `role="alert"` shows an error message. A **Retry** button is visible. The address list is hidden. The Network tab shows one 500 response from `POST /api/postcode/lookup`. | ✅ Pass |
| **A-02** | Waste-types 500 shows error and allows Retry | P2 | At Step 2. DevTools open with a one-shot override mapping `POST /api/waste-types` to **500 Internal Server Error**. | 1. Tick **General waste**. Click **Continue**. | Spinner appears briefly, then a "Couldn't save selection" alert with a **Retry** button. Step does not advance. Removing the override and clicking **Retry** succeeds and advances to Step 3. | ✅ Pass |
| **A-03** | Skips 500 shows error and allows Retry | P2 | At Step 3. DevTools open with a one-shot override mapping `GET /api/skips*` to **500 Internal Server Error**. | 1. Reach Step 3 (postcode → address → general → Continue). The skip page attempts to load. | Spinner appears, then a "Couldn't load skips" alert with a **Retry** button. No skip cards render. **Continue** is not visible. Removing the override and clicking **Retry** succeeds. | ✅ Pass |
| **A-04** | Booking confirm 500 shows error and allows Retry | P1 | At Step 4 with a complete booking. DevTools open with a one-shot override mapping `POST /api/booking/confirm` to **500 Internal Server Error**. | 1. Click **Confirm booking**. | Spinner appears briefly, then a "Booking failed" alert with a **Retry** button. The user's selections are preserved. Removing the override and clicking **Retry** succeeds and shows the success screen. | ✅ Pass |
| **A-05** | Booking confirm 400 (INVALID_PAYLOAD) surfaces an actionable error without Retry loop | P2 | At Step 4 with a complete booking. DevTools open with a fetch override that strips the `addressId` field from the outbound `POST /api/booking/confirm` body. | 1. Click **Confirm booking**. | Response is HTTP 400 with `{"error":"INVALID_PAYLOAD"}`. UI shows a "Booking failed" alert (non-5xx message variant). Success screen is not reached. Re-clicking Retry without removing the override does not silently succeed — the 400 recurs, proving the error is surfaced per-attempt rather than suppressed. | ✅ Pass |

---

## T — State transitions (5)

| ID | Title | Priority | Preconditions | Steps | Expected | Status |
| :--- | :--- | :---: | :--- | :--- | :--- | :---: |
| **T-01** | BS1 4DJ recovers from 500 → 200 within the same Step 1 view | P1 | Fresh tab. | 1. Type `BS1 4DJ`. Click **Find address** (first call returns 500).<br>2. Click **Retry**. | The error alert disappears. A new `POST /api/postcode/lookup` request returns 200 with 6 Bristol addresses. The list is rendered. The user can select an address and continue. | ✅ Pass |
| **T-02** | Back navigation through every step preserves prior selections | P1 | Completed flow at Step 4 (postcode → address → general → 4-yard → reach Review). | 1. Click **Back** on Step 4.<br>2. On Step 3, verify the **4 Yard Skip** card has `aria-checked="true"`. Click **Back**.<br>3. On Step 2, verify the **General waste** checkbox is ticked. Click **Back**.<br>4. On Step 1, verify the postcode input still reads `SW1A 1AA` and the previously selected address radio is still checked. | All four prior selections are still visible at each back-step. No data loss. | ✅ Pass |
| **T-03** | Toggling Heavy off after viewing disabled skips re-enables them | P1 | Reached Step 3 with **Heavy waste** ON. The 10-yard, 12-yard and 14-yard cards are visibly disabled. | 1. Click **Back** to return to Step 2.<br>2. Untick **Heavy waste**. Tick **General waste**. Click **Continue**.<br>3. On Step 3, inspect the same three cards. | All three previously-disabled cards now have `aria-disabled="false"` and no greyed style. They are clickable. The "Some larger skips are unavailable for heavy waste" notice is gone. | ✅ Pass |
| **T-04** | Changing postcode after reaching Step 3 clears the downstream skip selection | P2 | Reached Step 3 with `SW1A 1AA` → an address → general waste, and selected the **4 Yard Skip**. | 1. Click **Back** twice to return to Step 1.<br>2. Change the postcode field to `EC1A 1BB`. Click **Find address**.<br>3. The empty-state appears. Click **Enter address manually**, fill the form with any valid values, Continue.<br>4. Tick **General waste**. Continue. | On Step 3, no skip is pre-selected (`aria-checked="true"` count is 0). **Continue** is disabled. The previous 4-yard pick has been cleared because the address ID changed. | ✅ Pass |
| **T-05** | Unticking Plasterboard removes the handling option from the payload | P1 | At Step 2. DevTools Network open. | 1. Tick **Plasterboard**. Select **Under 10% of load**. The handling-options panel is visible.<br>2. Untick **Plasterboard**. The handling-options panel collapses out of the DOM.<br>3. Tick **General waste**. Click **Continue**. | The handling panel is no longer in the DOM after step 2. The recorded `POST /api/waste-types` body contains `"plasterboard": false` and `"plasterboardOption": null` (the prior `under_10` value did **not** bleed through). | ✅ Pass |

---

## Execution log

- All cases above were executed against build `2026-04-17:milestone-4` on the deployed Pages URL (`Chromium 131`, macOS 15.3, viewport 1280×800) and on iPhone 12 simulator via Playwright Device emulation for any case marked mobile-relevant.
- Failures during execution were converted into bug reports — see [bug-reports.md](bug-reports.md). BUG-001 and BUG-004 were caught by N-04 / re-run of P-01 respectively, fixed in subsequent milestones, and now have automated regression coverage.
- Cases A-01 / T-01 are the only ones whose first-run vs second-run behaviour depends on the BS1 retry counter — see BUG-003 for the demo-fidelity caveat. Hard-refresh the tab between consecutive runs of these cases.

**End of plan.**
