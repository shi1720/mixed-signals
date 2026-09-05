# HTTP API contract

All responses except the calendar use `Cache-Control: no-store`. Private/mutation errors use `{ "error": "human-readable message", "code": "stable_code" }` without database details. State-changing requests require the exact site origin, JSON content type, a valid browser cookie, and a body no larger than 4,096 bytes, enforced while streaming.

| Route | Method | Behavior |
|---|---|---|
| `/api/health` | GET | Checks the expected D1 table and returns `{status:"ok",service:"mixed-signals"}`. 503 on failure. |
| `/api/status` | GET | Campaign metadata, server timestamp, authoritative phase, and retention maintenance. |
| `/api/session` | GET | Issues/reuses HttpOnly browser cookie and returns whether that browser submitted this season. Never returns answers or secrets. |
| `/api/signals` | POST | Validates and accepts one report, or returns an identical successful retry. |
| `/api/results` | GET | Empty `cities` before reveal; suppressed, frozen city summaries after reveal. |
| `/api/signals/delete` | POST | Deletes raw report for the holder of its private receipt. Snapshot freezes first after deadline. |
| `/api/reminder` | GET | Downloads an actual UTF-8 iCalendar event with UTC start/end and a reminder. |

## Submission

```json
{
  "cityId": "london",
  "answers": {
    "spark": 4, "followThrough": 3, "affordability": 3,
    "clarity": 2, "authenticity": 4, "ghosting": 4,
    "logistics": 3, "hope": 4
  },
  "habitat": "friends",
  "adult": true,
  "resident": true,
  "consent": true,
  "idempotencyKey": "<client-generated UUID>",
  "deletionToken": "<64 lowercase hex characters from 32 random bytes>",
  "website": ""
}
```

The UI generates and saves the request before submission. `website` is an optional empty honeypot field. Unknown fields are rejected. Habitat is one of `apps`, `friends`, `irl`, `hobbies`, or `none`.

New success returns 201; identical replay returns 200. Both return `id`, `cityId`, `revealsAt`, `forecast`, and `replayed`. They do not return raw answers or secret hashes. The client pairs the result with its preexisting deletion secret to create the receipt. New receipts optionally retain the three derived `scores` from the API’s `forecast` result. They never recompute a successful retry from edited draft answers. Older receipts without scores remain valid for deletion; the UI explains that separate scores cannot be reconstructed from them.

Common failures: 401 missing session, 403 invalid/missing origin, 409 used browser/key or changed retry, 410 closed season, 413 oversized body, 415 wrong media type, 422 schema failure, 429 rate limit, 503 service failure. A concurrent SQL cutoff rejection with a stale Worker clock is conservatively treated as conflict; no report is accepted.

## Withdrawal

Body: `{ "id": "<submission UUID>", "deletionToken": "<private secret>" }`.

The receipt is a bearer deletion capability. A different browser may use it after initializing its own anonymous session. The public UI does that automatically. A wrong or already-used receipt returns `deleted:false`, without indicating whether the ID exists. Repeating a successful deletion is safe.

No route enumerates report IDs, individual answers, browser hashes, network hashes, or deletion hashes.

## Display labels and compatibility

The UI calls `chemistry` Connection, `fog` Mixed messages, and `friction` Date hassles. This is a presentation change. Server response keys, CSV columns, question semantics, database rows, and existing snapshots are unchanged. No additional raw-data endpoint was added.
