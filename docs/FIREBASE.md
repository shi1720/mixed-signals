# Firebase deployment

Public atlas: https://mixed-signals.web.app

The unchanged React atlas is bundled as a Vite frontend and served by Firebase Hosting. `/api/**` is routed to the `mixed-signals-api` Cloud Run gateway in `us-central1`. The gateway retains the existing Cloudflare Worker and D1 database as its server-side upstream. This is a frontend/entry-point migration, not a D1 database migration. Production submissions, receipts, aggregates, retention policy, suppression rules, and campaign dates are unchanged.

The previous provider hostname is configured only in the runtime's `UPSTREAM_ORIGIN` environment variable. It is absent from frontend bundles, metadata, calendar downloads, and README links. Browser requests remain on the Firebase origin.

## Privacy and correctness

- Firebase forwards only the `__session` cookie. The gateway translates it to and from the original backend cookie, retaining HttpOnly, Secure, SameSite=Lax, Path=/, and the 30-day lifetime. API responses are private and never cached.
- Writes must originate from one of the exact `APP_ORIGINS`. Only seven known routes and their original methods can be forwarded. The gateway sends no client-supplied credentials, host headers, IP headers, or arbitrary destination URLs.
- JSON requests retain the 4 KiB limit. Original validation, errors, retry limits, receipt handling and withdrawal remain on the existing backend. Upstream outages return a visible 503, never invented results.
- Calendar downloads point to the new public origin. Fonts are served locally with their licenses. Unknown paths return a useful 404.
- The server-side network rate limit now sees Cloud Run egress, so clients can share its 60-write-per-hour network bucket. The session limit is unchanged. Before opening a new public campaign at scale, migrate the backend or add a securely authenticated gateway identity mechanism; do not spoof a trusted client-IP header.
- Old browser cookies and local storage cannot cross origins. Existing downloaded receipt tokens remain valid for the original records and can be restored on the Firebase site. Keep the original backend running; do not delete its D1 database.
- Season 001 closed on 12 September 2026. Empty qualifying live results are real; the 24-city illustrative examples remain explicitly labeled. Deployment does not restart collection or create synthetic public reports.

## Build and test

```sh
npm ci
npm run check:all
npm run test:gateway
npm run build:firebase
npm run test:e2e:firebase
npx playwright test --config playwright.firebase.config.ts
```

`test:e2e:firebase` runs the same complete 38 desktop/mobile survey journeys against the actual static build and gateway with an isolated local Worker and D1 database. It never targets the public survey. The separate Firebase suite is read-only and checks the published atlas, stable private cookies, real results, calendar, 404, layout and accessibility.

The existing `npm run build`, `npm run dev`, and original local Worker tests remain supported.

## Deploy

Use Node 22 and authenticated Google Cloud/Firebase CLIs. Set the existing Worker origin in an operator environment variable without committing credentials or private data.

```sh
npm run build:firebase
gcloud run deploy mixed-signals-api --source firebase/gateway \
  --project gen-lang-client-0444960702 --region us-central1 \
  --service-account mixed-signals-runtime@gen-lang-client-0444960702.iam.gserviceaccount.com \
  --allow-unauthenticated --max-instances 2 --memory 256Mi --cpu 1 \
  --timeout 30 --concurrency 40 \
  --set-env-vars "^|^UPSTREAM_ORIGIN=${UPSTREAM_ORIGIN}|APP_ORIGINS=https://mixed-signals.web.app,https://mixed-signals.firebaseapp.com"
npx firebase-tools@15.30.1 deploy --only hosting --project gen-lang-client-0444960702
```

The runtime uses a dedicated service account with no additional project roles and an unprivileged OS user. It requires no database credentials or secret material. Do not remove the upstream service until a separately verified data migration is complete.
