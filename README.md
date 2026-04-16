# rem-waste — Skip Booking Flow

Take-home QA assessment: a 4-step skip-booking web app with manual tests, bug reports, end-to-end automation, and a UI/UX evidence bundle.

Graded against [ASSESSMENT.md](./ASSESSMENT.md). Strategy and risk register in [docs/test-strategy.md](./docs/test-strategy.md). Full orientation in [CLAUDE.md](./CLAUDE.md).

---

## Demo

- **Public demo**: [https://jason-pham.github.io/rem-waste/](https://jason-pham.github.io/rem-waste/) — static deploy via GitHub Pages ([`deploy-pages.yml`](./.github/workflows/deploy-pages.yml)). Post-deploy E2E matrix (Chromium · Firefox · WebKit · Mobile Chrome) runs via [`e2e-live.yml`](./.github/workflows/e2e-live.yml) on every push to `main` and daily at 06:00 UTC.
- **Local dev**: `cd ui && npm install && npm run dev` → [http://localhost:5173](http://localhost:5173)
- **Single-command Docker** (mirrors the public demo): `docker compose up --build` → [http://localhost:4173](http://localhost:4173). Brings up the production-built, MSW-mocked SPA. No backend. Ctrl+C to stop.

The demo is a static deploy — MSW intercepts every API call in the browser, so no backend needs hosting.

## Quick start

```bash
# App
cd ui
npm install
npm run dev                      # dev server http://localhost:5173
npm run build && npm run preview # production preview http://localhost:4173

# Tests
cd ../automation
npm install
npx playwright install chromium --with-deps
npx playwright test                          # full suite (functional + API)
npx playwright test --project=evidence       # regenerate evidence (screenshots, video, axe)
npx playwright show-report                   # last HTML report

# Lighthouse (requires local Chrome)
cd ../ui && npm run build && npm run preview &
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  npx lighthouse http://localhost:4173 --preset=desktop \
  --output=html --output-path=../evidence/lighthouse/desktop
```

## Project layout

```
rem-waste/
├── ASSESSMENT.md              # rubric — source of truth
├── CLAUDE.md                  # project orientation
├── docs/test-strategy.md      # which flows get automated + manual bucketing
├── README.md                  # this file
├── manual-tests.md            # 38 manual test cases (§6 ≥35)
├── bug-reports.md             # 3 real bug reports (§7 ≥3, ≥1 state-transition)
├── ui/                        # React + Vite + TS app + MSW mocks
├── automation/                # Playwright + TS test suite (51 tests × 4 browsers + evidence specs)
└── evidence/                  # §9 artifacts — screenshots, video, Lighthouse, axe
```

## Mocking / test-data strategy

The backend is mocked entirely in the browser via **[MSW](https://mswjs.io/)** — a service worker intercepts `fetch` at the network layer and returns the fixtures required by `ASSESSMENT.md §4`.

- **Static deploy** — no backend to host; the deployed bundle carries the SW and handlers.
- **Real code path** — tests exercise the actual `fetch` calls and response handling, not a test-only mode.
- **Handlers**: [ui/src/mocks/handlers.ts](./ui/src/mocks/handlers.ts). All four §5 endpoints implemented.
- **Fixtures**: [ui/src/mocks/fixtures/](./ui/src/mocks/fixtures/) — address lists, skip catalogue, counter state.
- **Test overrides** — Playwright can add `page.route()` overrides per-spec when a scenario needs non-fixture behaviour.

### Deterministic postcodes (§4)

| Postcode  | Behavior                                                      |
| --------- | ------------------------------------------------------------- |
| `SW1A 1AA` | 14 Westminster addresses (≥12 required)                      |
| `EC1A 1BB` | Empty list → empty-state path                                |
| `M1 1AE`   | ~2500 ms artificial delay → loading-state path               |
| `BS1 4DJ`  | 500 on first call, 200 on retry → error + retry path         |

Retry counter state lives in [ui/src/mocks/fixtures/state.ts](./ui/src/mocks/fixtures/state.ts). Playwright resets it between tests via `POST /_mocks/reset`, wired in the `freshPage` fixture.

### Skip catalogue

8 sizes (§2 ≥8 required). Three sizes (10/12/14-yard) are marked `blockedByHeavyWaste` — when a request sets `heavyWaste=true`, MSW returns those with `disabled: true` and `reason: "Not available for heavy waste"`. Meets §4 "heavy waste disables ≥2 skip sizes".

## What's tested

### Automation (Playwright + TS · 51 tests per browser, 4-browser matrix in CI)

| Where | Count | What |
| --- | --- | --- |
| [`tests/e2e/flow-a-general.spec.ts`](./automation/tests/e2e/flow-a-general.spec.ts) | 1 | **Flow A** — SW1A 1AA → General waste → 4-yard → confirm (covers all 4 endpoints; double-submit asserted by request counting) |
| [`tests/e2e/flow-b-heavy-plasterboard.spec.ts`](./automation/tests/e2e/flow-b-heavy-plasterboard.spec.ts) | 1 | **Flow B** — BS1 4DJ retry → Heavy + Plasterboard → disabled skips → double-click confirm |
| [`tests/e2e/step1-postcode.spec.ts`](./automation/tests/e2e/step1-postcode.spec.ts) | 13 | Step 1: validation, normalization, all four §4 fixtures (SW1A/EC1A/M1/BS1) |
| [`tests/e2e/step2-waste.spec.ts`](./automation/tests/e2e/step2-waste.spec.ts) | 7 | Step 2: branching, plasterboard handling, mutually-exclusive logic |
| [`tests/e2e/step3-skip.spec.ts`](./automation/tests/e2e/step3-skip.spec.ts) | 8 | Step 3: ≥8 skips, disabled-state under heavy waste, aria-checked semantics |
| [`tests/e2e/step4-review.spec.ts`](./automation/tests/e2e/step4-review.spec.ts) | 5 | Step 4: summary, price-breakdown arithmetic, single-fire confirm, BK-id format |
| [`tests/e2e/accessibility.spec.ts`](./automation/tests/e2e/accessibility.spec.ts) | 4 | axe-core scan per step (WCAG 2 A/AA) |
| [`tests/api/*.spec.ts`](./automation/tests/api/) | 12 | Contract tests — zod-validated shape for every §5 endpoint, in-browser fetch through MSW |
| [`tests/evidence/*.spec.ts`](./automation/tests/evidence/) | — | Captures screenshots / video / bug-evidence PNGs (run via `--project=evidence`) |

Assertions fire at every step. Selectors prefer accessible roles/names; `data-testid` is the fallback (never CSS-chained to styling). No hard waits; all awaits hang off events/responses/locator states.

**Run locally**: `cd automation && npx playwright test` (boots Vite automatically, reuses an existing dev server if present).

### Manual (§6)

[manual-tests.md](./manual-tests.md) — **39 cases** across 5 areas (Postcode 12 · Waste 7 · Skip 8 · Review 7 · Cross-cutting 5), bucketed as:

| Bucket | Count | Minimum |
| --- | --- | --- |
| Negative | 11 | ≥10 |
| Edge | 7 | ≥6 |
| API-failure | 6 | ≥4 |
| State-transition | 5 | ≥4 |
| Positive | 10 | — |

Strict markdown table format; one row per case with ID, type, priority, steps, expected, actual, status.

### Bugs (§7)

[bug-reports.md](./bug-reports.md) — **4 bugs**, with two in the state-transition category:

- **BUG-001** *(state-transition, **fixed** in `milestone-3`)* — Step 2 validation error did not auto-clear when the condition was fixed.
- **BUG-002** — Back-nav to Step 1 re-fires the postcode lookup unnecessarily.
- **BUG-003** *(state-transition, mock-state)* — BS1 4DJ retry counter leaks across "Book another skip" restarts.
- **BUG-004** *(state-transition)* — Step 1 unselects the previously chosen address when the user re-submits the same postcode.

Each has severity · priority · environment · steps · actual vs expected · screenshot evidence · suspected root cause. Evidence PNGs live in [`evidence/bugs/`](./evidence/bugs/), generated by [`tests/evidence/bug-evidence.spec.ts`](./automation/tests/evidence/bug-evidence.spec.ts).

## Evidence bundle (§9)

All artefacts in [evidence/](./evidence/):

| Artefact | Location | Notes |
| --- | --- | --- |
| Desktop screenshots | `evidence/screenshots/desktop/` | 9 frames — each step, plasterboard expanded, disabled skips, error+retry, success |
| Mobile screenshots (375×667) | `evidence/screenshots/mobile/` | 8 frames — same flow, mobile viewport |
| Flow video | [`evidence/video/flow-b.mp4`](./evidence/video/flow-b.mp4) (H.264, 314 KB, ~64 s) — also [`flow-b.webm`](./evidence/video/flow-b.webm) (original Playwright capture) | Flow B: BS1 4DJ retry → heavy + plasterboard → disabled skips → confirm → success. Within §9 60–120 s window. MP4 renders inline on GitHub. |
| Lighthouse — desktop | `evidence/lighthouse/desktop.report.html` | **Perf 100 · A11y 100 · Best-Practices 100 · SEO 91** |
| Lighthouse — mobile | `evidence/lighthouse/mobile.report.html` | **Perf 99 · A11y 100 · Best-Practices 100 · SEO 91** |
| Accessibility (axe) | `evidence/a11y/step{1..4}.json` + `summary.json` | **0 violations** (0 critical, 0 serious) across every step, tags `wcag2a` + `wcag2aa` |

Lighthouse reports are against the **production preview build** (`npm run build && npm run preview`) — that's what deploys. Dev-server figures are lower due to HMR and unminified code.

Regenerate the whole bundle:

```bash
cd automation
npx playwright test --project=evidence
# Lighthouse needs a fresh preview server — see Quick start above
```

## Accessibility highlights

- Every interactive control reachable by keyboard; `:focus-visible` outlines preserved.
- `role="status"` / `role="alert"` on loading / error regions with `aria-live`.
- `role="radiogroup"` wrapping Step 3's skip cards (`role="radio"`, `aria-checked`, `aria-disabled`).
- Minimum 44×44 px tap targets on all buttons and inputs.
- `prefers-reduced-motion` honoured — spinner animations are suppressed.
- Progress indicator exposes `aria-current="step"` on the active step.

## Tech stack

| Layer | Choice |
| --- | --- |
| App | React 18 + Vite 5 + TypeScript 5 |
| Styling | Tailwind 3 |
| Schema validation | `zod` — shared between app and contract tests |
| Mock API | `msw` (in-browser service worker, also reachable from Playwright) |
| E2E | `@playwright/test` (TypeScript) |
| Accessibility | `@axe-core/playwright` |
| Lint / format | `eslint` + `prettier` |

## Known limitations (by design)

- **State not persisted** — refresh mid-flow returns to Step 1. Documented in `manual-tests.md` CC-N-01.
- **Mock `Idempotency-Key`** — the client sends it on `POST /api/booking/confirm`; the mock does not dedupe on retry (see BUG-003). A real backend would.
- **CI runs cross-browser** — [`e2e-live.yml`](./.github/workflows/e2e-live.yml) fans out to Chromium, Firefox, WebKit and Mobile Chrome against the deployed Pages URL. Locally the quick-start installs Chromium only; install others as needed via `npx playwright install firefox webkit`.

## Submission checklist (§1)

- [x] Public demo link or Docker single-run → `docker compose up --build` (see [Dockerfile](./Dockerfile), [docker-compose.yml](./docker-compose.yml))
- [x] `README.md`
- [x] `manual-tests.md`
- [x] `bug-reports.md`
- [x] `ui/`
- [x] `automation/`
- [x] `evidence/` (screenshots, video, Lighthouse, axe)
