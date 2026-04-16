# Manual Test Execution Plan (End-to-End Scenarios)

> **Scope**: Extensive full-flow manual testing suite mimicking realistic user journeys from entry to checkout. Every test involves moving through the application's states rather than validating isolated atomic units.
> **Assigned To**: QA Department
> **Environment**: Production / GitHub Pages `https://jason-pham.github.io/rem-waste/`
> **Requirements Mapped**: `ASSESSMENT.md §6` (≥35 tests, ≥10 negative, ≥6 edge, ≥4 API failures, ≥4 state transitions).

## 📊 Suite Coverage Breakdown

| Test Category | Target (Min) | Actual Mapped |
| :--- | :---: | :---: |
| **Total Test Cases** | 35 | **36** |
| 🔴 Negative Flow Tests | 10 | **10** |
| 🟡 Edge Case Flows | 6 | **6** |
| 🟠 API Failure Injections | 4 | **4** |
| 🔵 State Transition Flows | 4 | **5** |
| 🟢 Positive Flows | - | **11** |

---

## 🟢 Positive E2E Journeys (11)

| ID | Scenario Title | Area | Test Steps (E2E Journey) | Expected Outcome | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-P01** | End-to-End Standard Booking (Default Path) | Positive | 1. Open App.<br>2. Submit `SW1A 1AA` and select '10 Downing Street'.<br>3. Continue to Step 2. Select 'General Waste'.<br>4. Continue to Step 3. Select '4 Yard Skip'.<br>5. Continue to Review. Verify Pricing.<br>6. Click 'Confirm Booking'. | System routes to the Success screen generating a valid `BK-` ID suffix. | ✅ Pass |
| **TC-P02** | End-to-End Heavy Waste Journey | Positive | 1. Open App.<br>2. Submit `SW1A 1AA` and select an address.<br>3. At Step 2, select **only** 'Heavy Waste'.<br>4. Proceed to Step 3. Select '6 Yard Skip'.<br>5. Proceed to Step 4 and 'Confirm Booking'. | System processes booking. The heavy waste flag is successfully transmitted in the `/api/booking/confirm` payload. | ✅ Pass |
| **TC-P03** | End-to-End Plasterboard (<10%) Journey | Positive | 1. Open App and process `SW1A 1AA`.<br>2. At Step 2, select 'Plasterboard' -> 'Under 10% of load'.<br>3. Proceed to Step 3, choose an '8 Yard Skip'.<br>4. Verify Review mappings and Confirm. | Journey succeeds. The nested sub-option `under_10` accurately appears in the review summary and API payload. | ✅ Pass |
| **TC-P04** | End-to-End Plasterboard (10-25%) Journey | Positive | 1. Open App and process `SW1A 1AA`.<br>2. Select 'Plasterboard' -> 'Between 10% and 25%'.<br>3. Choose a valid Skip and Confirm Booking. | Journey succeeds mapping the `10_to_25` payload value accurately. | ✅ Pass |
| **TC-P05** | End-to-End Plasterboard (>25%) Journey | Positive | 1. Open App and process `SW1A 1AA`.<br>2. Select 'Plasterboard' -> 'Over 25% of load'.<br>3. Choose a valid Skip and Confirm Booking. | Journey succeeds mapping the `over_25` payload value accurately. | ✅ Pass |
| **TC-P06** | End-to-End Mixed Multi-Waste Journey | Positive | 1. Open App and process `SW1A 1AA`.<br>2. At Step 2, select 'General', 'Heavy', AND 'Plasterboard' (<10%).<br>3. Select the '6 Yard Skip' at Step 3.<br>4. Confirm Booking. | The checkout accepts a combined matrix of waste parameters gracefully without validation clashes. | ✅ Pass |
| **TC-P07** | End-to-End Manual Address Entry Journey | Positive | 1. Enter `EC1A 1BB` to force the 0-results empty state.<br>2. Click "Enter Manually".<br>3. Provide 'Line 1' and 'City' data.<br>4. Select General Waste, 4-yard skip, and Confirm. | Custom string addresses are rendered correctly in the final Review visual and accepted by the backend. | ✅ Pass |
| **TC-P08** | Sequential Book-Again Journey | Positive | 1. Complete TC-P01 to reach the Success UI.<br>2. Click 'Book another skip'.<br>3. Complete a brand new booking identically. | The framework resets cleanly. A brand new `BK-` ID distinct from the first is issued. | ✅ Pass |
| **TC-P09** | End-to-End Maximum Capacity Request | Positive | 1. Process `SW1A 1AA`.<br>2. Select 'General Waste'.<br>3. Select '14 Yard Skip' (maximum size).<br>4. Confirm at Checkout. | Booking successfully targets the highest pricing tier and maps the `14-yard` enum. | ✅ Pass |
| **TC-P10** | End-to-End Minimum Capacity Request | Positive | 1. Process `SW1A 1AA`.<br>2. Select 'General Waste'.<br>3. Select '4 Yard Skip' (minimum size).<br>4. Confirm at Checkout. | Booking successfully targets the lowest pricing tier and maps the `4-yard` enum. | ✅ Pass |
| **TC-P11** | Review Screen Arithmetic Integrity | Positive | 1. Drive flow to Step 4 via General Waste, 8-yard skip.<br>2. Halt at Checkout.<br>3. Manually calculate Base Rate + VAT (20%) + Permit Fee vs 'Total' DOM element. | The rendered subtotal, VAT, permit, and final composite totals perfectly align with deterministic calculations. | ✅ Pass |

## 🔴 Negative E2E Trajectories (10)

| ID | Scenario Title | Area | Test Steps (E2E Journey) | Expected Outcome | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-N01** | E2E Block: Invalid Starting Format | Negative | 1. Open App.<br>2. Attempt to start journey by typing 'QWERTY 123'.<br>3. Press 'Find address'. | Journey is halted at origin. UI refuses network transmission and alerts to invalid UK formatting. | ✅ Pass |
| **TC-N02** | E2E Block: Zero Database Hits Abandonment | Negative | 1. Enter `EC1A 1BB` (Empty State).<br>2. Refuse to fill the manual entry form.<br>3. Attempt to bypass to Step 2. | Progression is impossible. The router acts as a strict guard preventing downstream navigation without an address object. | ✅ Pass |
| **TC-N03** | E2E Block: Blank Waste Progression | Negative | 1. Secure `SW1A 1AA` address and push to Step 2.<br>2. Leave all checkboxes unchecked.<br>3. Click 'Continue'. | System refuses advancement to Step 3. An explicit error overlay demands at least one valid domain selection. | ✅ Pass |
| **TC-N04** | E2E Block: Orphaned Nested Input | Negative | 1. Secure `SW1A 1AA` address and push to Step 2.<br>2. Tick 'Plasterboard', but intentionally skip the sub-radio grouping.<br>3. Attempt to Continue. | System blocks progression. The plasterboard flag explicitly necessitates a paired volume metric. | ✅ Pass |
| **TC-N05** | E2E Block: Missing Skip Resolution | Negative | 1. Drive journey successfully to Step 3.<br>2. Select absolutely no containers.<br>3. Attempt to click 'Review Booking'. | Progression halted. Application demands a non-null payload property for the skip target. | ✅ Pass |
| **TC-N06** | E2E Block: Bypassing Restrictive Weights | Negative | 1. Drive flow targeting 'Heavy Waste' across Step 2.<br>2. Halt at Step 3.<br>3. Attempt to click and force submission with the '12 Yard Skip'. | The 12-yard block ignores pointer events/clicks. Progression remains impossible until a valid subset is clicked. | ✅ Pass |
| **TC-N07** | E2E Block: Malformed Manual Input | Negative | 1. Drive `EC1A 1BB` to manual entry toggle.<br>2. Purposely delete 'Line 1' leaving only 'City'.<br>3. Attempt to Continue. | Form validates emptiness and halts the user before Step 2, preventing corrupted geographical data. | ✅ Pass |
| **TC-N08** | Checkout Rejection: Rate Limit/Double Fire | Negative | 1. Complete flow perfectly through Step 1 to 4.<br>2. Spam-click 'Confirm Booking' very rapidly multiple times on a slow network profile. | System captures mouse intent and locks the button state on first action. The backend is invoked exactly ONE time. | ✅ Pass |
| **TC-N09** | Checkout API Intrusion: Parameter Drop | Negative | 1. Reach Checkout.<br>2. Via DevTools network interception, rip `postcode` out of the JSON outbound POST.<br>3. Release interception. | The backend Zod schema trips a strict 400 rejection mapping back to a localized frontend error dialog. | ✅ Pass |
| **TC-N10** | Checkout API Intrusion: Price Tampering | Negative | 1. Reach Checkout via 8-yard skip (£230).<br>2. Intercept the outbound `POST /api/booking/confirm` and change `price` to `10`.<br>3. Release interception. | Mock handler validates `skipSize` + `price` against the catalogue and returns HTTP 400 `PRICE_MISMATCH`. The UI surfaces the booking-failed alert; success screen is not reached. Covered by automation: `tests/e2e/step4-review.spec.ts::TC-N10` + contract test `tests/api/booking-confirm.spec.ts::tampered price rejected with PRICE_MISMATCH`. | ✅ Pass |

## 🟡 Edge Case E2E Flows (6)

| ID | Scenario Title | Area | Test Steps (E2E Journey) | Expected Outcome | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-E01** | Journey via Aggressive Normalization | Edge | 1. Open app.<br>2. Type `sw1a 1aa` (lowercase).<br>3. Journey straight through to Checkout. | The payload maps as canonical `SW1A 1AA` securely bypassing formatting fragility. | ✅ Pass |
| **TC-E02** | Journey via Whitespace Bloat | Edge | 1. Open app.<br>2. Type `   SW1A   1AA   `.<br>3. Proceed normally to confirmation stage. | Trimming operations execute safely; user flow operates identically to standard formatting without breaking endpoints. | ✅ Pass |
| **TC-E03** | Rapid Skip Catalogue Cycling | Edge | 1. Drive to Step 3 securely.<br>2. Instantly alternative click between 4-yard and 6-yard blocks 20+ times.<br>3. Review Booking. | The React tree handles synthetic events efficiently without tearing; the final step correctly captures the LAST clicked element. | ✅ Pass |
| **TC-E04** | XSS Injection Attack Vector | Edge | 1. Trigger `EC1A 1BB` manual fallback.<br>2. Set City to `<script>alert('XSS')</script>`.<br>3. Drive to Step 4 Review screen. | The review screen strictly treats the string as safe text; no alert box fires proving DOM sanitization over custom data. | ✅ Pass |
| **TC-E05** | Mid-Flow Refresh Returns to Step 1 (Known Limitation) | Edge | 1. Drive the user to Step 3 (Skip Selection).<br>2. Command a hard browser reload (Refresh Tab). | App state is intentionally not persisted (see `README.md` § *Known limitations*). Refresh returns the user to a clean Step 1. No stack traces, no partial renders, no stale progress indicator. | ✅ Pass |
| **TC-E06** | Final Stage Wi-Fi Disconnect | Edge | 1. Drive flow meticulously to Step 4 Checkout.<br>2. Toggle workstation network completely to "Offline".<br>3. Try to Confirm Booking. | The `fetch()` failure is caught gracefully preventing an endless spinner infinite loop. User is notified via alert. | ✅ Pass |

## 🟠 API Failure Injection Flows (4)

| ID | Scenario Title | Area | Test Steps (E2E Journey) | Expected Outcome | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-A01** | Network Outage during Directory Search | API | 1. Open app.<br>2. Intercept `POST /api/postcode/lookup` routing a `500 Server Error`.<br>3. Enter `SW1A 1AA` and hit search. | Journey dies gracefully at origin. UI paints an "unavailable" error overlay prohibiting dangerous empty-state progression. | ✅ Pass |
| **TC-A02** | Network Outage during Waste Mapping | API | 1. Pass Postcode Step safely.<br>2. Intercept `POST /api/waste-types` returning `500 Server Error`.<br>3. Submit General Waste choice. | UI spinner safely stops, throwing a retryable error boundary rather than blank routing. | ✅ Pass |
| **TC-A03** | Network Outage during Skip Hydrating | API | 1. Drive to Step 2 and choose waste.<br>2. Intercept `GET /api/skips` returning `500 Server Error`.<br>3. Continue. | Step 3 paints an error block. Users cannot proceed to Step 4 without fetching the pricing tables. | ✅ Pass |
| **TC-A04** | Upstream Database Disconnect on Checkout | API | 1. Navigate a perfect journey to Checkout.<br>2. Intercept `POST /api/booking/confirm` issuing a `500 Error`.<br>3. Confirm booking. | Loading spinner halts gracefully natively throwing a Toast/Alert allowing the user to preserve their input and "Retry". | ✅ Pass |

## 🔵 State Transition Logic Journeys (5)

| ID | Scenario Title | Area | Test Steps (E2E Journey) | Expected Outcome | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-T01** | E2E State Recovery (Error -> 200) | Transition | 1. Run deterministic `BS1 4DJ` failure lookup.<br>2. Transition from UI Error pane to clicking 'Retry'.<br>3. Process the recovered 200 response straight through to checkout. | Internal state components correctly shift from Error bounds back into loading grids effortlessly allowing booking completion. | ✅ Pass |
| **TC-T02** | Deep Backwards Navigation Extraction | Transition | 1. Methodically construct a path to Review (Step 4).<br>2. Methodically click 'Back' sequentially pushing backwards all the way to Step 1.<br>3. Verify values. | Redux/Session bindings repopulate every single radio button properly traversing the component lifecycle backwards. | ✅ Pass |
| **TC-T03** | Dynamic Constraint Unlocking Pipeline | Transition | 1. Drive flow tagging 'Heavy Waste' across Step 2.<br>2. Verify '12-yard' is disabled on Step 3.<br>3. Walk BACK to Step 2 & replace selection with 'General'.<br>4. Walk FORWARD to Step 3. | 12-yard skips are re-computed and visually transition to interactive cleanly proving cross-step prop cascades. | ✅ Pass |
| **TC-T04** | Parent Switch Cascade Destruction | Transition | 1. Drive flow to Step 3 selecting skips based on SW1A 1AA.<br>2. Leap backwards to Step 1 and change postcode completely to `EC1A 1BB`.<br>3. Proceed forward. | Downstream address, waste, and skip targets are permanently purged preventing incompatible parameter bleed across geographies. | ✅ Pass |
| **TC-T05** | Form Sub-Option Collapse Integrity | Transition | 1. On Step 2, click 'Plasterboard' causing the 3 volume radios to transition in.<br>2. Select 'Under 10%'.<br>3. Uncheck 'Plasterboard' completely. | The nested components transition entirely from the DOM, guaranteeing removed components are scrubbed from local payload memory. | ✅ Pass |

---
**End of Full E2E Execution Plan**
