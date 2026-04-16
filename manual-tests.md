# Manual Test Cases — rem-waste Booking Flow

> **Scope**: manual test suite covering the 4-step skip-booking flow.
> **Rubric**: `ASSESSMENT.md §6` — ≥35 cases, ≥10 negative, ≥6 edge, ≥4 API-failure, ≥4 state-transition, strict markdown table format.
> **System under test**: `ui/` app running at `http://localhost:5173`, backed by MSW mocks.
> **Bucketing plan**: `docs/test-strategy.md` § *Manual-test bucketing*.

## Totals

| Metric | Count | Minimum |
| --- | --- | --- |
| **Total** | 39 | ≥35 |
| Positive | 10 | — |
| Negative | 11 | ≥10 |
| Edge | 7 | ≥6 |
| API-failure | 6 | ≥4 |
| State-transition | 5 | ≥4 |

## Environment

| Field | Value |
| --- | --- |
| App URL | `http://localhost:5173` |
| Backend | MSW service worker (in-browser) |
| Browser | Chromium 131 · Firefox 133 · WebKit 18.2 |
| Viewport — desktop | 1280 × 800 |
| Viewport — mobile | 375 × 667 (iPhone SE) |
| Deterministic postcodes | `SW1A 1AA` (12+ addr), `EC1A 1BB` (0 addr), `M1 1AE` (latency), `BS1 4DJ` (500 → 200 on retry) |

## Conventions

- **Type** — Positive · Negative · Edge · API-failure · State-transition.
- **Priority** — P0 (blocker) · P1 (critical path) · P2 (important) · P3 (nice-to-have).
- **Steps** — numbered, each starts from a clean tab at `/` unless stated otherwise.
- **Status** — `Pass` · `Fail · <bug-id>` · `Blocked`.
- **Last run** — 2026-04-16 on build `2026-04-16:milestone-3`.

---

## Postcode — Step 1 (12)

| ID | Title | Type | Priority | Preconditions | Steps | Expected | Actual | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PC-P-01 | SW1A 1AA returns ≥12 addresses and Continue becomes enabled after selection | Positive | P0 | On Step 1. | 1. Type `SW1A 1AA` into the postcode field. 2. Click **Find address**. 3. Select the first address radio. | Spinner shows while loading. ≥12 address options render. Continue disabled until an address is chosen, enabled after. | As expected. | Pass |
| PC-P-02 | Mixed-case `sw1a 1aa` normalizes and succeeds | Positive | P2 | On Step 1. | 1. Type `sw1a 1aa`. 2. Click Find. | Request payload is `"SW1A 1AA"` (uppercased, single space). ≥12 addresses render. | As expected. | Pass |
| PC-N-01 | Empty submit is blocked client-side | Negative | P1 | On Step 1. | 1. Leave field empty. 2. Attempt to submit. | Submit button disabled. No network request fires. | As expected. | Pass |
| PC-N-02 | Garbled input `ZZZ 999` shows inline validation, no request | Negative | P1 | On Step 1. | 1. Type `ZZZ 999`. 2. Press Enter. | Inline error *"Enter a valid UK postcode"* displayed; no `POST /api/postcode/lookup` fires. | As expected. | Pass |
| PC-N-03 | 20-character garbage string rejected inline | Negative | P2 | On Step 1. | 1. Type `abcdefghijklmnopqrst`. 2. Submit. | Client-side error; no network call. | As expected. | Pass |
| PC-N-04 | Whitespace-only string is treated as empty | Negative | P2 | On Step 1. | 1. Enter 5 spaces. 2. Attempt to submit. | Button remains disabled; no request fires. | As expected. | Pass |
| PC-E-01 | Lowercase, no internal space `sw1a1aa` accepted and normalized | Edge | P2 | On Step 1. | 1. Type `sw1a1aa`. 2. Submit. | Address list for `SW1A 1AA` renders; the outgoing request uses the canonical form. | As expected. | Pass |
| PC-E-02 | Leading/trailing whitespace trimmed `  SW1A 1AA  ` | Edge | P3 | On Step 1. | 1. Paste `  SW1A 1AA  ` (leading/trailing spaces). 2. Submit. | Results for `SW1A 1AA` render. | As expected. | Pass |
| PC-A-01 | BS1 4DJ: 500 on first call, success on retry | API-failure | P0 | On Step 1. | 1. Type `BS1 4DJ`. 2. Click Find. 3. Click **Retry** when the error alert appears. | First call returns 500 → error alert + Retry visible. Retry re-fires the lookup; second call returns 200 and populates addresses; alert is hidden. | As expected. | Pass |
| PC-A-02 | M1 1AE: simulated latency shows spinner ≥1 s, then resolves | API-failure | P1 | On Step 1, network tab open. | 1. Type `M1 1AE`. 2. Click Find. 3. Observe the spinner. 4. Wait for completion. | Spinner visible for ~2.5 s (matches fixture). Then Manchester addresses render. Continue disabled until selection. | As expected. | Pass |
| PC-A-03 | Postcode lookup that never resolves: user-cancellable via new request (abort) | API-failure | P2 | On Step 1; throttle network in DevTools to "Slow 3G" or use `M1 1AE`. | 1. Type `M1 1AE`, click Find — spinner appears. 2. Without waiting, change input to `SW1A 1AA` and click Find again. | First in-flight request is aborted (visible in Network as `cancelled`); only the SW1A 1AA result list renders. No race where Manchester addresses appear after Westminster. | As expected — `AbortController` cancels the prior call. | Pass |
| PC-T-01 | Changing postcode after selection clears the previously selected address | State-transition | P1 | Completed PC-P-01; an address is selected. | 1. Replace the postcode with `EC1A 1BB`. 2. Click Find. | Empty state renders. Previously selected address is cleared; Continue is disabled and hidden (no address list). | As expected. | Pass |

## Waste Type — Step 2 (7)

| ID | Title | Type | Priority | Preconditions | Steps | Expected | Actual | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| WT-P-01 | General waste alone submits a valid payload | Positive | P0 | Reached Step 2 via SW1A 1AA. | 1. Tick **General waste**. 2. Click Continue. | `POST /api/waste-types` sent with `{ heavyWaste: false, plasterboard: false, plasterboardOption: null }`. 200 response advances to Step 3. | As expected. | Pass |
| WT-P-02 | Heavy alone submits `{ heavyWaste: true, plasterboard: false, plasterboardOption: null }` | Positive | P0 | Reached Step 2. | 1. Tick **Heavy waste**. 2. Click Continue. | Correct payload sent; advances to Step 3 with a visible "some skips unavailable" notice. | As expected. | Pass |
| WT-N-01 | Submitting with no selection is blocked | Negative | P1 | Reached Step 2. | 1. Click Continue with nothing ticked. | Inline validation *"Select at least one waste type…"*. No request fires. | As expected. | Pass |
| WT-N-02 | Plasterboard ticked but no handling option blocks submit; validation auto-clears once an option is chosen | Negative | P1 | Reached Step 2. | 1. Tick **Plasterboard** only. 2. Click Continue without choosing a radio. 3. Tick any handling option. | Inline validation *"Choose how much plasterboard…"*. No request fires. After step 3, the validation message disappears immediately (no second click required). | As expected after BUG-001 fix. | Pass |
| WT-E-01 | Heavy + plasterboard + general all accepted and payload is correct | Edge | P2 | Reached Step 2. | 1. Tick Heavy. 2. Tick Plasterboard. 3. Choose **10–25%**. 4. Continue. | Payload `{ heavyWaste: true, plasterboard: true, plasterboardOption: "10_to_25" }`. Step 3 renders with disabled skips + heavy notice. | As expected. | Pass |
| WT-A-01 | `POST /api/waste-types` 500 surfaces error + Retry works | API-failure | P1 | Reached Step 2; override the route to 500 once via DevTools or test fixture. | 1. Tick Heavy. 2. Force the first submit to 500. 3. Click Retry in the alert. | First submit fails with a visible error + Retry button. Retry succeeds and advances. | *Route override via MSW dev handler.* | Pass |
| WT-T-01 | Plasterboard deselect clears `plasterboardOption` in state and in outgoing payload | State-transition | P0 | Reached Step 2. | 1. Tick Plasterboard. 2. Pick **Over 25%**. 3. Untick Plasterboard. 4. Tick General. 5. Continue. | Handling options disappear. Outgoing payload has `plasterboardOption: null`. | See [`bug-reports.md`](./bug-reports.md) BUG-001 if the option is not cleared. | Pass |

## Skip — Step 3 (8)

| ID | Title | Type | Priority | Preconditions | Steps | Expected | Actual | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SK-P-01 | 4-yard selectable under general waste | Positive | P0 | Reached Step 3 under general waste. | 1. Click the 4-yard card. 2. Click Continue. | Card gains selected styling + `aria-checked="true"`. Advances to Step 4. | As expected. | Pass |
| SK-P-02 | Enabled skip under heavy waste is selectable | Positive | P0 | Reached Step 3 under heavy waste. | 1. Click 6-yard. 2. Continue. | Card selects; 10/12/14-yard remain disabled and cannot be chosen. | As expected. | Pass |
| SK-N-01 | Clicking a disabled skip does not select it | Negative | P1 | Reached Step 3 under heavy waste. | 1. Click 12-yard. | No selection change; `aria-checked="false"` remains; Continue stays disabled. | As expected. | Pass |
| SK-N-02 | Continue is blocked with no skip selected | Negative | P1 | Reached Step 3. | 1. Click Continue immediately. | Button is disabled. | As expected. | Pass |
| SK-E-01 | Size normalization `4-yard` renders as *4 Yard Skip* label | Edge | P2 | Reached Step 3. | 1. Inspect the card labels. | Labels read *"4 Yard Skip"*, *"6 Yard Skip"*, etc. Raw `-yard` not shown. | As expected. | Pass |
| SK-E-02 | At 375 px, disabled skip reason is still visible and legible | Edge | P2 | Reached Step 3 under heavy waste in 375×667 viewport. | 1. Scroll to each disabled card. | Reason text ("Not available for heavy waste") wraps within the card and remains readable. | As expected. | Pass |
| SK-A-01 | `GET /api/skips` 500 → error + Retry works | API-failure | P1 | Reached Step 3; force skip endpoint to 500 once. | 1. Arrive at Step 3. 2. Observe error alert. 3. Click Retry. | Error + Retry visible; Retry re-fires and populates the list. | *Forced via MSW override.* | Pass |
| SK-T-01 | Toggle Heavy OFF in Step 2 after reaching Step 3 re-enables previously-disabled skips | State-transition | P0 | Reached Step 3 under heavy waste. | 1. Click Back to Step 2. 2. Untick Heavy, tick General. 3. Continue. | Step 3 re-renders with a fresh `GET /api/skips?heavyWaste=false`; 10/12/14-yard are now enabled. | As expected. | Pass |

## Review — Step 4 (7)

| ID | Title | Type | Priority | Preconditions | Steps | Expected | Actual | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RV-P-01 | Happy-path confirm returns a booking ID matching `^BK-\d+$` | Positive | P0 | Reached Step 4 with a valid selection. | 1. Click Confirm booking. | Success screen appears with a booking ID; original selection summary is preserved. | As expected. | Pass |
| RV-P-02 | Editing back to Step 2 and returning updates the summary | Positive | P1 | On Step 4 with general + 4-yard. | 1. Back to Step 2. 2. Switch to Heavy. 3. Advance to Step 3, pick 6-yard. 4. Advance to Step 4. | Summary shows Heavy waste + 6 Yard Skip + updated price breakdown. | As expected. | Pass |
| RV-N-01 | Rapid double-click on Confirm fires exactly one request | Negative | P0 | On Step 4. | 1. Double-click Confirm rapidly. 2. Inspect Network. | Exactly one `POST /api/booking/confirm`. Button disables after first click. | As expected. | Pass |
| RV-N-02 | Network offline during confirm surfaces error and re-enables retry | Negative | P2 | On Step 4; set network offline. | 1. Confirm. | Error alert with Retry. Confirm button re-enables after failure. | As expected. | Pass |
| RV-E-01 | Price breakdown lines sum exactly to displayed Total | Edge | P1 | On Step 4 with any skip. | 1. Read skip hire + permit fee + VAT from the breakdown. 2. Sum by hand. | `skip + permit = subtotal`; `subtotal + VAT = total`; displayed VAT = 20 % of subtotal. | As expected. | Pass |
| RV-A-01 | `POST /api/booking/confirm` 500 → retry → success | API-failure | P1 | On Step 4; force first call to 500. | 1. Confirm. 2. Click Retry on the error alert. | First call 500 shows error; Retry re-fires and succeeds. | *MSW override.* | Pass |
| RV-T-01 | After successful confirm, browser Back does not allow re-submission | State-transition | P1 | Completed RV-P-01. | 1. Click browser Back. | Either the flow is reset to Step 1 or the Confirm button remains in a terminal state (success screen stays). No duplicate booking fires. | Currently resets to Step 1 (in-memory state cleared). | Pass |

## Cross-cutting (5)

| ID | Title | Type | Priority | Preconditions | Steps | Expected | Actual | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CC-P-01 | Full flow keyboard-only (Tab / Enter / Space) | Positive | P1 | Clean load. | 1. Navigate through all four steps using only the keyboard. | Focus moves logically forward, visible focus ring on every control; no unreachable elements; final success screen announced via `role="status"`. | As expected. | Pass |
| CC-P-02 | Full flow at 375×667 mobile viewport | Positive | P1 | Mobile viewport. | 1. Complete the full flow (general waste, any skip). | All controls tappable (≥44 px), no horizontal scroll, skip cards stack in 1 column. | As expected. | Pass |
| CC-N-01 | Refreshing mid-flow behaves as specified (state lost → returns to Step 1) | Negative | P3 | On Step 3. | 1. Hard refresh. | Flow returns to Step 1. No orphan payload sent. Documented behaviour — state is not persisted. | As expected. | Pass |
| CC-E-01 | `prefers-reduced-motion` honoured (spinner animation suspended) | Edge | P3 | OS set to reduced motion. | 1. Trigger a loading state (`M1 1AE`). | Spinner does not rotate; static indicator still announces progress via `role="status"`. | As expected. | Pass |
| CC-T-01 | Rapid Back/Forward between steps leaves no orphan selections | State-transition | P1 | Completed Step 3 with a skip selected. | 1. Back to Step 2. 2. Back to Step 1. 3. Forward to Step 2. 4. Forward to Step 3. | Earlier selections preserved (postcode, address, waste type, skip) when re-entering without changing upstream inputs. | As expected. | Pass |

---

## Sub-minima roll-up

| Bucket | IDs | Count | Required |
| --- | --- | --- | --- |
| Negative | PC-N-01, PC-N-02, PC-N-03, PC-N-04, WT-N-01, WT-N-02, SK-N-01, SK-N-02, RV-N-01, RV-N-02, CC-N-01 | 11 | ≥10 |
| Edge | PC-E-01, PC-E-02, WT-E-01, SK-E-01, SK-E-02, RV-E-01, CC-E-01 | 7 | ≥6 |
| API-failure | PC-A-01, PC-A-02, PC-A-03, WT-A-01, SK-A-01, RV-A-01 | 6 | ≥4 |
| State-transition | PC-T-01, WT-T-01, SK-T-01, RV-T-01, CC-T-01 | 5 | ≥4 |
| Positive | PC-P-01, PC-P-02, WT-P-01, WT-P-02, SK-P-01, SK-P-02, RV-P-01, RV-P-02, CC-P-01, CC-P-02 | 10 | — |
| **Total** | | **39** | **≥35** |
