# Deployment and operation

## Reference deployment

The reference site is [Mixed Signals](https://mixed-signals-atlas.sg127977958.chatgpt.site), backed by a Cloudflare Worker and D1 database provisioned through Sites. The site source and migration definitions are public. Private records and local SQLite files are not in Git or the deployment archive.

`.openai/hosting.json` identifies the reference Site. Forking the repository does not grant control of that Site. Do not reuse its `project_id` when creating your own Site. For an independent deployment, follow the Cloudflare path below or register a separate Site in your own account.

No OpenAI API key, map token, Firestore project, email account, or other application secret is required. The rate-limit salt is generated once inside the database. It never reaches the browser.

## Local development

```bash
npm ci
npm run db:migrate
npm run dev
```

The printed URL is authoritative; the server chooses another port if its default is occupied. Local migrations are applied using `wrangler.local.json`. Its placeholder UUID is only for the local emulator. It must never be used for a remote production database.

To test the compiled Worker locally:

```bash
npm run build
npm start -- --port 3108
```

For a fully reproducible browser suite, use `npm run test:e2e`, which creates a disposable campaign, applies migrations, builds the Worker, and starts its own local server. The suite refuses a non-local base URL.

## Independent Cloudflare deployment

This path requires your Cloudflare account and may incur provider charges. Commands are provided for the owner to run; no account or billing changes are needed to build the project locally.

1. Clone the source and run `npm ci`.
2. Set your own season dates and public origin as described below.
3. Sign in and create a D1 database:

   ```bash
   npx wrangler login
   npx wrangler d1 create your-mixed-signals
   ```

4. Copy the returned database UUID, then build and generate a reviewed deployment configuration:

   ```bash
   npm run check
   npm run test:python
   npm run eval:verify
   npm run build
   node scripts/cloudflare-config.mjs your-mixed-signals YOUR_DATABASE_UUID
   ```

5. Apply schema migrations to **your** database and deploy the validated build:

   ```bash
   npx wrangler d1 migrations apply DB --remote --config dist/server/wrangler.deploy.json
   npx wrangler deploy --config dist/server/wrangler.deploy.json
   ```

The helper writes only a configuration file under `dist/`; it does not create, publish, or mutate resources. Its main entry and assets remain relative to the built Worker directory. Rebuild and regenerate the configuration for each source change. Generated deployment configuration is not committed.

After deployment, verify `/api/health`, `/api/status`, `/api/results`, the globe and the calendar URL. During collection, results must have `cities:[]`. Do not submit fabricated reports to validate a live public campaign. Complete synthetic write/retry/deletion tests against the isolated local runtime first.

## Starting a new season

The shipped campaign is intentionally fixed, not reset by each visitor. Before starting an independent experiment:

1. Edit `lib/campaign.ts` with a **new unique campaign ID**, opening timestamp and reveal timestamp exactly seven days later. Set these before accepting any real reports.
2. Update the season/date copy in `app/page.tsx` and `components/atlas/info.tsx` so the plain-language instructions match the timestamps. This first release supports one active season, not an administrative campaign editor.
3. Change the fixed calendar origin in `app/api/reminder/route.ts` to your trusted public HTTPS origin. Never derive calendar links from an untrusted forwarded host header.
4. Update the source repository links and page metadata for your fork.
5. Run the verification suite. Update fixed expected dates in tests intentionally. Do not silently move an already announced deadline or overwrite a completed season's snapshot.

Before changing the active campaign, retire and purge the previous season's raw records after its retention window, or keep an explicit maintenance job for that campaign. The current maintenance function targets only the configured campaign ID.

Local receipt/draft storage keys and database uniqueness are namespaced by campaign ID. A completed season's snapshot should remain immutable even when adding a future campaign.

## Schema changes

Edit `db/schema.ts`, run `npm run db:generate`, inspect the resulting SQL, then apply the new migration locally. Production migrations must be additive and preserve applied migration history. The Sites packaging flow includes generated migrations automatically. Never put survey fixtures or backfills into a schema migration.

## Operations and retention

- Health: `/api/health` verifies the submissions table; a failure yields 503.
- Collection status: `/api/status` returns the authoritative server clock and phase.
- Reveal: the first request after the deadline creates the release atomically. No scheduler is necessary to unlock results.
- Raw retention: the first status/session/results request at least 30 days after reveal freezes the release and purges raw reports transactionally. If no one visits, cleanup waits for the next visit.
- Strict retention: a scheduled Worker can invoke `maintainRetention(db)` from `lib/server/maintenance.ts`. The reference release does not claim a strict scheduled cleanup service.
- Backups/logs: provider backups and connection logging have separate retention settings. Review those in your account before treating application-level deletion as infrastructure-wide erasure.
- Rate limits: 30 attempted writes/deletions per session per hour; 60 per supplied network address per hour. Successful identical submission retries do not consume this budget.
- Scaling: set budget alerts and provider limits; load-test the real deployment before a large campaign. No high-traffic benchmark is claimed.

## GCP migration boundary

GCP was an allowed option, not a dependency of this release. The existing deployable stack was chosen to deliver a complete service without additional cloud credentials. A migration could retain the React client and pure domain modules, host a compatible API on Cloud Run, and replace the persistence service with Firestore transactions or Cloud SQL. The unique submission, cutoff, immutable reveal and deletion-ordering tests must pass against that implementation. No Firestore adapter or GCP deployment is represented as already implemented.
