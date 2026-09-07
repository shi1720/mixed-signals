import { z } from 'zod';
import { CAMPAIGN, campaignPhase } from '../campaign';
import { submissionSchema } from '../survey';
import { personalForecast } from '../forecast';
import {
  ApiError,
  hash,
  requireOrigin,
  readJson,
  requireSession,
  getSession,
  randomToken,
  sessionCookie,
  json,
} from './http';
import { snapshotStatement, readSnapshot } from './aggregation';
import { maintainRetention } from './maintenance';
const submitSchema = submissionSchema.extend({
  deletionToken: z.string().regex(/^[a-f0-9]{64}$/),
});
export async function createSession(request: Request, db: D1Database) {
  await maintainRetention(db);
  const token = getSession(request) ?? randomToken();
  const sessionHash = await hash(token);
  const existing = await db
    .prepare(
      'SELECT id,city_id FROM submissions WHERE campaign_id=? AND session_hash=?',
    )
    .bind(CAMPAIGN.id, sessionHash)
    .first<{ id: string; city_id: string }>();
  return json(
    {
      submitted: !!existing,
      phase: campaignPhase(),
      cityId: existing?.city_id ?? null,
      campaignId: CAMPAIGN.id,
    },
    200,
    { 'Set-Cookie': sessionCookie(request, token) },
  );
}
async function rateLimit(
  request: Request,
  db: D1Database,
  sessionHash: string,
) {
  const now = Math.floor(Date.now() / 1000),
    hour = Math.floor(now / 3600);
  const keys: [string, number][] = [[`session:${sessionHash}:${hour}`, 30]];
  // Only the platform's CF-Connecting-IP is considered. Never trust X-Forwarded-For.
  const ip = request.headers.get('cf-connecting-ip');
  if (ip) {
    await db
      .prepare(
        "INSERT INTO app_secrets(key,value) VALUES ('rate_limit_salt',?) ON CONFLICT(key) DO NOTHING",
      )
      .bind(randomToken())
      .run();
    const salt = await db
      .prepare("SELECT value FROM app_secrets WHERE key='rate_limit_salt'")
      .first<{ value: string }>();
    if (!salt) throw new Error('Rate limit salt unavailable.');
    keys.push([
      `network:${await hash(salt.value + ':' + Math.floor(now / 86400) + ':' + ip)}:${hour}`,
      60,
    ]);
  }
  const results = await db.batch(
    keys.map(([key]) =>
      db
        .prepare(
          'INSERT INTO rate_limits(key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count',
        )
        .bind(key, now + 7200),
    ),
  );
  if (
    results.some(
      (r, i) => Number((r.results[0] as { count: number }).count) > keys[i][1],
    )
  )
    throw new ApiError(
      429,
      'Too many requests from this connection. Please try again in an hour.',
      'rate_limited',
    );
  await db
    .prepare('DELETE FROM rate_limits WHERE expires_at < ?')
    .bind(now)
    .run();
}
export async function submitSignal(request: Request, db: D1Database) {
  requireOrigin(request);
  const sessionHash = await hash(requireSession(request));
  const parsed = submitSchema.safeParse(await readJson(request));
  if (!parsed.success)
    throw new ApiError(
      422,
      parsed.error.issues[0]?.message ?? 'Please check your answers.',
      'invalid_submission',
    );
  const input = parsed.data;
  const { idempotencyKey, deletionToken, website: _, ...canonical } = input;
  const payloadHash = await hash(JSON.stringify(canonical));
  const deletionHash = await hash(deletionToken);
  // Fast retries do not consume limits, and cannot alter or retrieve another session's data.
  const prior = await db
    .prepare(
      'SELECT id,payload_hash,idempotency_key,city_id,deletion_hash FROM submissions WHERE campaign_id=? AND session_hash=?',
    )
    .bind(CAMPAIGN.id, sessionHash)
    .first<{
      id: string;
      payload_hash: string;
      idempotency_key: string;
      city_id: string;
      deletion_hash: string;
    }>();
  if (prior) {
    if (
      prior.idempotency_key !== idempotencyKey ||
      prior.payload_hash !== payloadHash ||
      prior.deletion_hash !== deletionHash
    )
      throw new ApiError(
        409,
        'This browser has already submitted a response to this survey.',
        'already_submitted',
      );
    return json({
      id: prior.id,
      cityId: prior.city_id,
      revealsAt: CAMPAIGN.revealsAt,
      forecast: personalForecast(input.answers),
      replayed: true,
    });
  }
  if (campaignPhase() !== 'collecting')
    throw new ApiError(
      410,
      campaignPhase() === 'upcoming'
        ? 'This survey has not opened yet.'
        : 'This survey has closed. Community results are ready to explore.',
      'campaign_closed',
    );
  await rateLimit(request, db, sessionHash);
  const id = crypto.randomUUID(),
    a = input.answers;
  const row = await db
    .prepare(`INSERT INTO submissions(id,campaign_id,city_id,session_hash,idempotency_key,payload_hash,deletion_hash,spark,follow_through,affordability,clarity,authenticity,ghosting,logistics,hope,habitat,created_at,consent_version)
 SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch(),'2026-09-05'
 WHERE unixepoch()>=? AND unixepoch()<? AND NOT EXISTS(SELECT 1 FROM snapshots WHERE campaign_id=?)
 ON CONFLICT DO NOTHING RETURNING id`)
    .bind(
      id,
      CAMPAIGN.id,
      input.cityId,
      sessionHash,
      idempotencyKey,
      payloadHash,
      deletionHash,
      a.spark,
      a.followThrough,
      a.affordability,
      a.clarity,
      a.authenticity,
      a.ghosting,
      a.logistics,
      a.hope,
      input.habitat,
      Date.parse(CAMPAIGN.opensAt) / 1000,
      Date.parse(CAMPAIGN.revealsAt) / 1000,
      CAMPAIGN.id,
    )
    .first<{ id: string }>();
  if (!row) {
    const same = await db
      .prepare(
        'SELECT id,payload_hash,idempotency_key,deletion_hash FROM submissions WHERE campaign_id=? AND session_hash=?',
      )
      .bind(CAMPAIGN.id, sessionHash)
      .first<{
        id: string;
        payload_hash: string;
        idempotency_key: string;
        deletion_hash: string;
      }>();
    if (
      same &&
      same.payload_hash === payloadHash &&
      same.idempotency_key === idempotencyKey &&
      same.deletion_hash === deletionHash
    )
      return json({
        id: same.id,
        cityId: input.cityId,
        revealsAt: CAMPAIGN.revealsAt,
        forecast: personalForecast(a),
        replayed: true,
      });
    if (campaignPhase() !== 'collecting')
      throw new ApiError(
        410,
        'The collection window has just closed.',
        'campaign_closed',
      );
    throw new ApiError(
      409,
      'This browser or receipt has already been used this season.',
      'already_submitted',
    );
  }
  return json(
    {
      id: row.id,
      cityId: input.cityId,
      revealsAt: CAMPAIGN.revealsAt,
      forecast: personalForecast(a),
      replayed: false,
    },
    201,
  );
}
const deleteSchema = z
  .object({ id: z.uuid(), deletionToken: z.string().regex(/^[a-f0-9]{64}$/) })
  .strict();
export async function deleteSignal(request: Request, db: D1Database) {
  requireOrigin(request);
  const sessionHash = await hash(requireSession(request));
  const input = deleteSchema.safeParse(await readJson(request));
  if (!input.success)
    throw new ApiError(
      422,
      'That deletion receipt is not valid.',
      'invalid_receipt',
    );
  await rateLimit(request, db, sessionHash);
  // An atomic batch establishes the immutable closed-season snapshot before deleting.
  const results = await db.batch([
    snapshotStatement(db),
    db
      .prepare(
        'DELETE FROM submissions WHERE id=? AND campaign_id=? AND deletion_hash=? RETURNING id',
      )
      .bind(input.data.id, CAMPAIGN.id, await hash(input.data.deletionToken)),
  ]);
  return json({
    deleted: results[1].results.length > 0,
    aggregateRetained: campaignPhase() === 'revealed',
  });
}
export async function status(db: D1Database) {
  await maintainRetention(db);
  await db.prepare('SELECT 1 FROM submissions LIMIT 1').first();
  return json({
    campaign: CAMPAIGN,
    phase: campaignPhase(),
    serverNow: new Date().toISOString(),
  });
}
export async function results(db: D1Database) {
  await maintainRetention(db);
  if (campaignPhase() !== 'revealed')
    return json({
      phase: campaignPhase(),
      revealsAt: CAMPAIGN.revealsAt,
      cities: [],
      message: 'Real signals are sealed until the shared reveal.',
    });
  return json({
    phase: 'revealed',
    revealsAt: CAMPAIGN.revealsAt,
    cities: await readSnapshot(db),
    methodologyVersion: '1.0',
    sample: 'voluntary, unrepresentative contributors',
  });
}
