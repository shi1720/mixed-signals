import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { SqliteD1 } from '../helpers/sqlite-d1';
import {
  createSession,
  submitSignal,
  deleteSignal,
  results,
  status,
} from '@/lib/server/service';
import { snapshotStatement, readSnapshot } from '@/lib/server/aggregation';
import { maintainRetention } from '@/lib/server/maintenance';
import { ApiError, handle, readJson, randomToken } from '@/lib/server/http';
import { CAMPAIGN } from '@/lib/campaign';
import { EMPTY_ANSWERS, type Answers } from '@/lib/survey';
import { scoreAnswers, roundScore } from '@/lib/forecast';
let db: SqliteD1;
const origin = 'https://example.com';
const start = Date.parse(CAMPAIGN.opensAt),
  end = Date.parse(CAMPAIGN.revealsAt);
const all = (n: number): Answers =>
  Object.fromEntries(Object.keys(EMPTY_ANSWERS).map((k) => [k, n])) as Answers;
function body(overrides: Record<string, unknown> = {}) {
  return {
    cityId: 'london',
    answers: all(3),
    habitat: 'apps',
    adult: true,
    resident: true,
    consent: true,
    idempotencyKey: crypto.randomUUID(),
    deletionToken: randomToken(),
    ...overrides,
  };
}
function req(
  data: unknown,
  token = randomToken(),
  headers: Record<string, string> = {},
) {
  return new Request(origin + '/api/signals', {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      Cookie: `__Host-ms-session=${token}`,
      ...headers,
    },
    body: JSON.stringify(data),
  });
}
function clock(ms: number) {
  vi.spyOn(Date, 'now').mockReturnValue(ms);
  db.now = Math.floor(ms / 1000);
}
async function seed(
  count: number,
  cityId = 'london',
  answers = all(3),
  habitat = 'apps',
) {
  for (let i = 0; i < count; i++)
    await submitSignal(req(body({ cityId, answers, habitat })), db.binding());
}
async function published() {
  clock(end);
  return await readSnapshot(db.binding());
}
beforeEach(() => {
  db = new SqliteD1();
  clock(start + 3600000);
});
afterEach(() => {
  db.close();
  vi.restoreAllMocks();
});
describe('real SQL submission service', () => {
  it('issues secure HttpOnly cookies and private headers', async () => {
    const response = await createSession(
      new Request(origin + '/api/session'),
      db.binding(),
    );
    expect(response.headers.get('set-cookie')).toMatch(
      /__Host-ms-session=[a-f0-9]{64}; Path=\/; HttpOnly; SameSite=Lax; Max-Age=2592000; Secure/,
    );
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(await response.json()).toMatchObject({ submitted: false });
  });
  it('persists one report and never returns raw answers', async () => {
    const response = await submitSignal(req(body()), db.binding());
    expect(response.status).toBe(201);
    const result = (await response.json()) as Record<string, unknown>;
    expect(result).toHaveProperty('id');
    expect(result).not.toHaveProperty('answers');
    expect(
      db.sqlite.prepare('SELECT COUNT(*) as n FROM submissions').get()?.n,
    ).toBe(1);
  });
  it('accepts 20 concurrent retries exactly once', async () => {
    const input = body(),
      session = randomToken();
    const responses = await Promise.all(
      Array.from({ length: 20 }, () =>
        submitSignal(req(input, session), db.binding()),
      ),
    );
    const ids = await Promise.all(
      responses.map(async (r) => ((await r.json()) as { id: string }).id),
    );
    expect(new Set(ids).size).toBe(1);
    expect(
      db.sqlite.prepare('SELECT COUNT(*) as n FROM submissions').get()?.n,
    ).toBe(1);
  });
  it('rejects altered retry payload and a second key in the same browser', async () => {
    const session = randomToken(),
      input = body();
    await submitSignal(req(input, session), db.binding());
    await expect(
      submitSignal(req({ ...input, answers: all(4) }, session), db.binding()),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      submitSignal(req(body(), session), db.binding()),
    ).rejects.toMatchObject({ status: 409 });
  });
  it('does not allow idempotency keys to cross sessions', async () => {
    const input = body();
    await submitSignal(req(input), db.binding());
    await expect(submitSignal(req(input), db.binding())).rejects.toMatchObject({
      status: 409,
    });
  });
  it('replays a successful submission after closure but rejects new reports', async () => {
    const session = randomToken(),
      input = body();
    const first = await submitSignal(req(input, session), db.binding());
    clock(end);
    const retry = await submitSignal(req(input, session), db.binding());
    expect(await retry.json()).toMatchObject({
      id: ((await first.json()) as { id: string }).id,
      replayed: true,
    });
    await expect(submitSignal(req(body()), db.binding())).rejects.toMatchObject(
      { status: 410 },
    );
  });
  it('the database rejects a late insert even when the worker clock thinks it is open', async () => {
    clock(end - 10000);
    db.now = end / 1000;
    await expect(
      submitSignal(req(body()), db.binding()),
    ).rejects.toBeInstanceOf(ApiError);
    expect(
      db.sqlite.prepare('SELECT COUNT(*) as n FROM submissions').get()?.n,
    ).toBe(0);
  });
  it('does not accept submissions into a frozen season even with a stale clock', async () => {
    clock(end);
    await snapshotStatement(db.binding()).run();
    clock(end - 10000);
    await expect(submitSignal(req(body()), db.binding())).rejects.toMatchObject(
      { status: 409 },
    );
  });
  it('rejects missing and cross-site origins and missing sessions', async () => {
    await expect(
      submitSignal(
        req(body(), randomToken(), { Origin: 'https://evil.example' }),
        db.binding(),
      ),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      submitSignal(
        req(body(), randomToken(), { Origin: 'null' }),
        db.binding(),
      ),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      submitSignal(req(body(), randomToken(), { Cookie: '' }), db.binding()),
    ).rejects.toMatchObject({ status: 401 });
  });
  it('never exposes real signals before the deadline', async () => {
    await seed(12);
    const response = await results(db.binding());
    expect(await response.json()).toMatchObject({
      phase: 'collecting',
      cities: [],
    });
    expect(
      db.sqlite.prepare('SELECT COUNT(*) as n FROM snapshots').get()?.n,
    ).toBe(0);
  });
  it('returns safe errors instead of database internals', async () => {
    const response = await handle(async () => {
      throw new Error('secret SQL password');
    });
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain('secret');
  });
});
describe('privacy-preserving atomic release', () => {
  it('suppresses a city at n=9 and publishes at n=10', async () => {
    await seed(9, 'london');
    await seed(10, 'mumbai');
    const cities = await published();
    expect(cities).toHaveLength(1);
    expect(cities[0]).toMatchObject({
      cityId: 'mumbai',
      n: 10,
      chemistry: { value: 50, n: 10 },
      habitat: 'apps',
    });
  });
  it('suppresses each incomplete metric independently and hides small denominator counts', async () => {
    await seed(9);
    await seed(1, 'london', { ...all(3), spark: null });
    const city = (await published())[0];
    expect(city.chemistry).toEqual({ value: null, n: 0 });
    expect(city.fog).toEqual({ value: 50, n: 10 });
    expect(city.friction).toEqual({ value: 50, n: 10 });
  });
  it('requires at least 10 votes for a habitat and resolves ties deterministically', async () => {
    await seed(9, 'london', all(3), 'apps');
    await seed(1, 'london', all(3), 'friends');
    await seed(10, 'mumbai', all(3), 'hobbies');
    await seed(10, 'mumbai', all(3), 'friends');
    const cities = await published();
    expect(cities.find((c) => c.cityId === 'london')?.habitat).toBeNull();
    expect(cities.find((c) => c.cityId === 'mumbai')?.habitat).toBe('friends');
  });
  it('SQL and TypeScript agree on fractional and extreme scores', async () => {
    const answers = {
      spark: 5,
      authenticity: 4,
      hope: 2,
      clarity: 2,
      ghosting: 4,
      followThrough: 1,
      affordability: 4,
      logistics: 5,
    };
    await seed(10, 'london', answers);
    const city = (await published())[0];
    for (const [key, value] of Object.entries(scoreAnswers(answers)))
      expect(city[key as 'chemistry' | 'fog' | 'friction'].value).toBe(
        roundScore(value!),
      );
  });
  it('does not rescan aggregate inputs once the snapshot exists', async () => {
    await seed(12);
    await published();
    const rounds = db.rounds;
    expect(rounds).toBeGreaterThan(0);
    for (let i = 0; i < 10; i++) await snapshotStatement(db.binding()).run();
    expect(db.rounds).toBe(rounds);
  });
  it('reveal races produce one immutable snapshot', async () => {
    await seed(10);
    clock(end);
    const snapshots = await Promise.all(
      Array.from({ length: 20 }, () => readSnapshot(db.binding())),
    );
    expect(new Set(snapshots.map((s) => JSON.stringify(s))).size).toBe(1);
    expect(
      db.sqlite.prepare('SELECT COUNT(*) as n FROM snapshots').get()?.n,
    ).toBe(1);
  });
  it('never includes identifiers, tokens, timestamps or individual answers in release payloads', async () => {
    await seed(10);
    const text = JSON.stringify(await published());
    for (const term of [
      'session',
      'deletion',
      'idempotency',
      'created_at',
      'spark',
      'consent',
      'payload_hash',
    ])
      expect(text).not.toContain(term);
  });
});
describe('withdrawal and retention', () => {
  it('requires possession of a valid deletion secret', async () => {
    const input = body(),
      session = randomToken();
    const response = await submitSignal(req(input, session), db.binding());
    const { id } = (await response.json()) as { id: string };
    const wrong = await deleteSignal(
      req({ id, deletionToken: randomToken() }, session),
      db.binding(),
    );
    expect(await wrong.json()).toMatchObject({ deleted: false });
    const correct = await deleteSignal(
      req({ id, deletionToken: input.deletionToken }, session),
      db.binding(),
    );
    expect(await correct.json()).toMatchObject({
      deleted: true,
      aggregateRetained: false,
    });
    expect(
      db.sqlite.prepare('SELECT COUNT(*) as n FROM submissions').get()?.n,
    ).toBe(0);
  });
  it('withdrawal before reveal affects the release threshold', async () => {
    await seed(9);
    const input = body();
    const response = await submitSignal(req(input), db.binding());
    const { id } = (await response.json()) as { id: string };
    await deleteSignal(
      req({ id, deletionToken: input.deletionToken }),
      db.binding(),
    );
    expect(await published()).toEqual([]);
  });
  it('withdrawal after deadline freezes aggregates before deleting even if no one opened results yet', async () => {
    await seed(9);
    const input = body();
    const response = await submitSignal(req(input), db.binding());
    const { id } = (await response.json()) as { id: string };
    clock(end);
    await deleteSignal(
      req({ id, deletionToken: input.deletionToken }),
      db.binding(),
    );
    expect((await readSnapshot(db.binding()))[0].n).toBe(10);
    expect(
      db.sqlite.prepare('SELECT COUNT(*) as n FROM submissions').get()?.n,
    ).toBe(9);
  });
  it('removes expired raw data but preserves the frozen summary', async () => {
    await seed(12);
    const before = await published();
    clock(end + 30 * 86400000 - 1);
    await maintainRetention(db.binding());
    expect(
      db.sqlite.prepare('SELECT COUNT(*) as n FROM submissions').get()?.n,
    ).toBe(12);
    clock(end + 30 * 86400000);
    await maintainRetention(db.binding());
    expect(
      db.sqlite.prepare('SELECT COUNT(*) as n FROM submissions').get()?.n,
    ).toBe(0);
    expect(await readSnapshot(db.binding())).toEqual(before);
  });
  it('a delayed first visit still snapshots before purging', async () => {
    await seed(10);
    clock(end + 60 * 86400000);
    await status(db.binding());
    expect(
      db.sqlite.prepare('SELECT COUNT(*) as n FROM submissions').get()?.n,
    ).toBe(0);
    expect((await readSnapshot(db.binding()))[0].n).toBe(10);
  });
});
describe('bounded JSON request parsing', () => {
  it.each(['text/plain', 'application/json-garbage'])(
    'rejects media type %s',
    async (type) => {
      await expect(
        readJson(req(body(), randomToken(), { 'Content-Type': type })),
      ).rejects.toMatchObject({ status: 415 });
    },
  );
  it('rejects malformed JSON and oversized advertised bodies', async () => {
    await expect(
      readJson(
        new Request(origin, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{broken',
        }),
      ),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      readJson(req(body(), randomToken(), { 'Content-Length': '999999' })),
    ).rejects.toMatchObject({ status: 413 });
  });
  it('enforces size on a chunked stream without Content-Length', async () => {
    const stream = new ReadableStream({
      start(c) {
        for (let i = 0; i < 8; i++)
          c.enqueue(new TextEncoder().encode('a'.repeat(1024)));
        c.close();
      },
    });
    const request = new Request(origin, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: stream,
      duplex: 'half',
    } as RequestInit);
    await expect(readJson(request)).rejects.toMatchObject({ status: 413 });
  });
});
