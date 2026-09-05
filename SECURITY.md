# Security and privacy

Please do not publish private receipts, response records, cookies, or infrastructure credentials in an issue. Report vulnerabilities using GitHub's private vulnerability reporting interface if enabled. If it is unavailable, open an issue asking for a private contact route without including exploit details or personal data.

## What is enforced

- Exact-origin mutation requests, JSON media type checking, and a streamed 4 KiB body limit.
- Strict runtime validation, finite integer ratings, known city IDs, explicit age/residence/aggregation confirmations, no arbitrary fields.
- Prepared statements and database constraints. No interpolated SQL values.
- HttpOnly host-only session cookies, Secure on HTTPS, SameSite=Lax.
- Database uniqueness for browser/campaign and idempotency key/campaign.
- Receipt secrets generated from 32 cryptographically random bytes; only SHA-256 hashes in the database.
- Session-bound payload equality on retries; no cross-session idempotency replay.
- SQL acceptance deadline and snapshot-absence checks.
- Transactional immutable release creation and suppression before public JSON serialization.
- No public raw-data route, free-text comments, exact-location collection or identity fields.
- CSP, frame denial, content-type protections, referrer policy and disabled sensitive browser permissions.
- An hourly session limit and, when supplied by the platform, a network limit using a keyed daily hash. Raw network addresses are not stored by application code.

## Deliberate limitations

This is a small public experiment, not a formally anonymous research system. Browser tokens and network hashes are pseudonymous. The infrastructure provider processes connection metadata, and the site owner controls the database. Ten-response suppression and score rounding reduce exposure but are not differential privacy.

A person can clear cookies, change devices, or coordinate multiple submissions. The rate limiter is a deterrent, not proof of identity. A shared network may hit its limit. There is no CAPTCHA or identity verification, because those would change the experiment's participation and privacy tradeoffs.

The current CSP allows inline scripts/styles for the framework. Production does not allow `unsafe-eval`. There are no untrusted HTML inputs. A stricter nonce-based policy is a possible hardening task, not a feature claimed by this release.

A private receipt is a bearer deletion capability. Anyone holding it may delete its report. Loss of both the receipt and the browser's pending request can make individual withdrawal impossible. Raw retention still applies.

## Retention

Raw reports are removed on the first status/session/results request at least 30 days after the reveal. A snapshot is established before deletion in the same transaction. With zero traffic, deletion waits for the next request. Strict date-based deletion requires an operator-scheduled job. Rate-limit records expire logically after two hours and are physically cleaned during later activity.

The daily network hash uses a secret stored in D1, not a public salt. Hash keys do not appear in public API responses. Infrastructure backups and provider logging follow provider settings and are outside the application's traffic-driven deletion guarantee.

## Before scaling up

Use provider protections and budget alerts, load-test the actual deployment, review connection metadata and backup retention settings, arrange a support contact, and decide whether stronger abuse controls justify their privacy cost. The repository makes no third-party audit or large-scale reliability claim.
