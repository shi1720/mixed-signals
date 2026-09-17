import test from 'node:test';
import assert from 'node:assert/strict';
import { createGateway } from './server.mjs';
const origin = 'https://mixed-signals.web.app';
const token = 'a'.repeat(64);
async function run(fetchImpl, action) {
  const server = createGateway({ upstream: 'https://backend.example', origins: [origin], fetchImpl });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await action(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
test('preserves private sessions through Firebase cookie filtering', async () => {
  let calls = 0;
  await run(async (url, options) => {
    assert.equal(url.href, 'https://backend.example/api/session');
    assert.equal(options.headers.get('Cookie'), calls++ ? `__Host-ms-session=${token}` : null);
    return Response.json({ submitted: false }, { headers: { 'Set-Cookie': `__Host-ms-session=${token}; HttpOnly; Secure` } });
  }, async base => {
    const first = await fetch(base + '/api/session');
    assert.equal(first.headers.get('Set-Cookie'), `__session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000; Secure`);
    assert.match(first.headers.get('Cache-Control'), /no-store/);
    assert.equal((await fetch(base + '/api/session', { headers: { Cookie: `other=secret; __session=${token}` } })).status, 200);
  });
});
test('validates origins before forwarding writes and preserves errors and retry limits', async () => {
  let calls = 0;
  await run(async (url, options) => {
    calls++;
    assert.equal(url.pathname, '/api/signals/delete');
    assert.equal(options.headers.get('Origin'), 'https://backend.example');
    assert.equal(options.headers.get('Authorization'), null);
    assert.equal(options.headers.get('X-Forwarded-For'), null);
    assert.equal(options.body.toString(), '{"deletionToken":"receipt"}');
    return Response.json({ error: 'limited', code: 'rate_limited' }, { status: 429, headers: { 'Retry-After': '3600' } });
  }, async base => {
    const request = { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' }, body: '{"deletionToken":"receipt"}' };
    assert.equal((await fetch(base + '/api/signals/delete', request)).status, 403);
    assert.equal(calls, 0);
    request.headers.Origin = origin;
    const response = await fetch(base + '/api/signals/delete', request);
    assert.equal(response.status, 429);
    assert.equal(response.headers.get('Retry-After'), '3600');
    assert.equal((await response.json()).code, 'rate_limited');
  });
});
test('only allows known routes and methods, with bounded JSON bodies', async () => {
  await run(() => { throw new Error('must not reach upstream'); }, async base => {
    assert.equal((await fetch(base + '/api/unknown')).status, 404);
    assert.equal((await fetch(base + '/api/signals')).status, 405);
    assert.equal((await fetch(base + '/api/signals', { method: 'POST', headers: { Origin: origin }, body: 'x' })).status, 415);
    assert.equal((await fetch(base + '/api/signals', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: 'x'.repeat(4097) })).status, 413);
  });
});
test('calendar download uses only the new public origin', async () => {
  await run(async () => new Response('URL:https://backend.example\r\nDESCRIPTION:See https://backend.example', { headers: { 'Content-Type': 'text/calendar' } }), async base => {
    const response = await fetch(base + '/api/reminder');
    assert.match(response.headers.get('Content-Disposition'), /attachment/);
    assert.equal(await response.text(), `URL:${origin}\r\nDESCRIPTION:See ${origin}`);
  });
});
test('backend failures and redirects never become static success or leaked redirect URLs', async () => {
  await run(async () => { throw new Error('private connection error'); }, async base => {
    const response = await fetch(base + '/api/results');
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, 'service_unavailable');
  });
  await run(async () => new Response(null, { status: 302, headers: { Location: 'https://backend.example/private' } }), async base => {
    const response = await fetch(base + '/api/results');
    assert.equal(response.status, 502); assert.equal(response.headers.get('Location'), null);
  });
});
