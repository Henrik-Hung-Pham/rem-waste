# rem-waste — QA Assessment Project

## What this is

A **build-and-test take-home assessment**: deliver a 4-step skip-booking web app **plus** manual tests, bug reports, automation, and UI/UX evidence. Graded strictly against the rubric in [ASSESSMENT.md](./ASSESSMENT.md). Read it before doing any work.

## Deliverables (mirrors `ASSESSMENT.md §1`)

- [ ] Public demo link **or** `docker compose up` single-command run
- [ ] `README.md` — setup, demo link, mocking strategy, evidence summary
- [ ] `manual-tests.md` — ≥35 cases (≥10 negative, ≥6 edge, ≥4 API-failure, ≥4 state-transition), strict markdown tables
- [ ] `bug-reports.md` — ≥3 bugs (≥1 branching/state), severity/priority/environment/steps/actual-vs-expected/evidence
- [ ] `ui/` — the booking flow app
- [ ] `automation/` — Playwright + TS, two E2E flows (general + heavy OR plasterboard)
- [ ] `evidence/` — mobile + desktop screenshots, 60–120s flow video, Lighthouse report, a11y (axe) report

## Committed tech stack

| Layer           | Choice                                          |
| --------------- | ----------------------------------------------- |
| App             | React + Vite + TypeScript                        |
| Styling         | Tailwind CSS (or plain CSS; keep it simple)      |
| Mock API        | MSW (Mock Service Worker) — browser + node       |
| E2E tests       | `@playwright/test` (TypeScript)                  |
| Schema validation | `zod`                                          |
| Lint / format   | `eslint` + `eslint-plugin-playwright` + `prettier` |
| CI              | GitHub Actions (optional but recommended)        |
| Evidence        | Playwright traces/video/screenshots, Lighthouse CLI, `@axe-core/playwright` |

MSW is the right call: mocks run in the browser via a service worker, so the public demo is a static deploy (Vercel/Netlify/GitHub Pages) with no backend to host — and the same handlers can be reused in Playwright tests via `page.route` overrides.

## Target folder structure

```
rem-waste/
├── ASSESSMENT.md           # rubric — source of truth
├── CLAUDE.md               # this file
├── README.md               # setup + demo link + mocking strategy
├── manual-tests.md         # ≥35 test cases
├── bug-reports.md          # ≥3 bugs
├── ui/                     # React + Vite app
│   ├── src/
│   │   ├── app/            # step components (postcode, waste, skip, review)
│   │   ├── api/            # typed API client
│   │   ├── mocks/          # MSW handlers + deterministic fixtures
│   │   └── ui/             # shared UI primitives
│   ├── public/mockServiceWorker.js
│   └── vite.config.ts
├── automation/             # Playwright tests
│   ├── tests/
│   │   ├── e2e/            # ≥2 flows: general, heavy/plasterboard
│   │   └── api/            # contract-level tests via request fixture
│   ├── pages/              # Page Objects
│   ├── fixtures/
│   │   ├── test-fixtures.ts
│   │   └── data.ts
│   └── playwright.config.ts
├── evidence/
│   ├── screenshots/
│   ├── video/              # 60–120s flow
│   ├── lighthouse/
│   └── a11y/
└── .github/workflows/
    ├── deploy-pages.yml    # build + deploy the SPA to GitHub Pages on push to main
    └── e2e-live.yml        # Playwright matrix against the live Pages URL (push, daily, manual)
```

## Agent workflow

1. **`test-strategist`** — map the rubric to concrete deliverables; pick the two E2E flows; bucket the 35+ manual cases by type.
2. **`app-builder`** — scaffold `ui/` with MSW, deterministic fixtures (SW1A 1AA / EC1A 1BB / M1 1AE / BS1 4DJ), and the four steps.
3. **`test-architect`** — scaffold `automation/`.
4. **`test-automation-engineer`** — implement the two required E2E flows; add API-contract tests for the four endpoints.
5. **`manual-test-author`** — author `manual-tests.md` hitting all minima.
6. **`bug-report-author`** — test the app hands-on; log real defects into `bug-reports.md`.
7. **`evidence-collector`** — screenshots (mobile + desktop), flow video, Lighthouse, axe reports.
8. **`test-code-reviewer`** — audit `automation/` before submit.
9. **`flaky-test-investigator`** — on any intermittent CI failure.
10. **`ci-pipeline-engineer`** — (optional) GitHub Actions running the suite.
11. **`submission-auditor`** — final gate: every non-negotiable line of the rubric ticked off.

## Hard rules

- **Match the API contract in `ASSESSMENT.md §5` verbatim** — paths, request/response shapes, field names. Do not invent fields.
- **Match the deterministic fixtures in §4 exactly.** Tests and graders will hit these specific postcodes.
- **Heavy waste disables ≥2 skip sizes.** Visible in the UI.
- **Stable selectors** — accessible roles/names first, `data-testid` as fallback. Never CSS-chained to styling.
- **Prevent double submit** in Step 4 (disable button + idempotency).
- **No hard waits** in tests.
- **No real credentials, PII, or secrets in the repo.**

## Quick commands (target state)

```bash
# app
cd ui && npm install && npm run dev        # local dev at http://localhost:5173
cd ui && npm run build && npm run preview  # production build

# tests
cd automation && npm install && npx playwright install --with-deps
cd automation && npx playwright test                    # full
cd automation && npx playwright test --ui               # watch
cd automation && npx playwright show-report             # last report

# evidence
npm run evidence:lighthouse
npm run evidence:a11y
```
