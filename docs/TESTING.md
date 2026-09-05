# Verification and limits

The project uses independent layers of verification. A green suite is evidence for these contracts, not a claim of an external audit or unlimited production capacity.

## Run the suite

```bash
npm ci
npm run check:all
npx playwright install chromium
npm run test:e2e
npm run build
npm audit --audit-level=moderate
```

Node 22.13+ is required for the `node:sqlite` test adapter. Python 3.10+ is required for the release validator and evaluation harness. CI uses Node 22 and Python 3.12 on Ubuntu.

## What each layer verifies

| Layer | Scope |
| --- | --- |
| Strict TypeScript and Oxlint | Application types, hooks, accessibility rules and unused code |
| 25 domain tests | Campaign boundaries, schema validation, city search, calendar escaping and complete-case forecast scoring |
| 27 SQL integration tests | Actual SQLite statements, uniqueness under concurrent requests, idempotency, independent SQL deadline rejection, suppression, immutable snapshots, deletion ordering, retention and bounded request parsing |
| 300 generated cases within one domain test | Null answers never become scores; complete values remain bounded |
| 12 Python tests | Streaming CSV validation, private-column rejection, sample thresholds, malformed input and explicit preview handling |
| 20 browser cases | Ten scenarios in desktop Chromium and an iPhone-sized Chromium viewport, exercising the compiled Worker with a real local D1 emulator |
| Three evaluation tasks | Each deliberately broken baseline fails its regression suite; applying its actual golden patch restores passing behavior |

Browser coverage includes search, filters, city details, share state, sealed results, calendar downloads, survey validation, real submissions, reload persistence, transient failures, lost responses, immutable retries after editing, cross-browser receipt recovery, confirmed withdrawal, unmatched receipt handling, keyboard operation, reduced motion, layout overflow, 404s and automated WCAG checks on the atlas and survey.

## Disposable browser environment

`npm run test:e2e` runs `scripts/e2e-server.mjs`. It copies source into a temporary directory, creates a fresh local D1 database, sets a seven-day test campaign around the current time **only inside that copy**, builds the Worker, and serves it on `127.0.0.1:3107`. Shutdown removes that temporary environment. This keeps browser tests useful after the public campaign has ended. There is no test-clock override, privileged testing endpoint or fixture seeding in the production application.

The exact fixed production timestamps are separately covered by domain and SQL tests. A test can also target an existing local server with `E2E_BASE_URL=http://localhost:3002 npm run test:e2e`; that server must currently be collecting. The configuration rejects non-local URLs so synthetic submissions cannot reach the public experiment.

Browser screenshots go to `docs/images/`. Failure traces and reports are ignored by Git and retained briefly as CI failure artifacts. Test receipts and local database files must never be published.

## Database adapter versus deployed runtime

The fast integration suite uses SQLite through `node:sqlite`, wrapped in the minimal D1 interface consumed by the service. It runs the real migration and real SQL. Its controllable SQL clock tests a request that crosses the deadline independently of JavaScript's clock. Its transaction adapter is useful for deterministic correctness tests, but does not reproduce all distributed Cloudflare behavior.

The browser suite complements this by exercising the compiled application and D1 via Wrangler/Miniflare, including actual HTTP, cookies and browser storage. Neither environment is a large-scale distributed load test. Production release checks use read-only health, status, result and calendar requests; fabricated reports are kept out of the public database.

## Accessibility and review

Axe checks WCAG 2 A/AA and 2.1 AA rules on desktop and mobile atlas/survey states. Manual checks cover tab navigation, dialog focus, close controls, reduced motion, mobile layouts and the city list alternative to the globe. Automated checks do not establish complete WCAG conformance or replace assistive-technology testing with people.

Independent agents reviewed the product and security boundaries. Their feedback produced concrete fixes including receipt recovery, truthful deletion confirmation, immutable retries, minimum-answer instructions, contrast adjustments, snapshot scan avoidance and implemented retention. They are development reviews, not an independent professional security audit.

## Known boundaries

- Chromium is tested; Safari and Firefox are not separately certified.
- No production throughput, availability SLA, bot-proof identity or formal differential privacy is claimed.
- The Dockerfile is supplied for reproducibility; the reported local checks run directly through npm and Python.
- Evaluation tasks are public, deliberately seeded calibration exercises. Their test suites are not hidden and their runner is not a sandbox for hostile agent code.
- Provider backups and logs have their own retention settings. Application deletion does not prove deletion from every infrastructure backup.
