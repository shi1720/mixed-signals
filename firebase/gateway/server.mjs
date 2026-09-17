import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';

const ROUTES = new Map([
  ['/api/health', 'GET'], ['/api/status', 'GET'], ['/api/results', 'GET'],
  ['/api/session', 'GET'], ['/api/reminder', 'GET'],
  ['/api/signals', 'POST'], ['/api/signals/delete', 'POST'],
]);
const PRIVATE = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
const TOKEN = /^[a-f0-9]{64}$/;
export function createGateway({ upstream, origins, fetchImpl = fetch, secureCookies = true }) {
  const base = new URL(upstream);
  if (base.protocol !== 'https:' && !['127.0.0.1', 'localhost'].includes(base.hostname)) throw new Error('HTTPS upstream required');
  const allowedOrigins = new Set(origins);
  const canonical = origins[0];
  return createServer(async (req, res) => {
    const fail = (status, code, error) => { res.writeHead(status, { ...PRIVATE, 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error, code })); };
    try {
      const url = new URL(req.url, 'http://gateway.invalid');
      if (!ROUTES.has(url.pathname)) return fail(404, 'not_found', 'This API route does not exist.');
      if (req.method !== ROUTES.get(url.pathname)) return fail(405, 'method_not_allowed', 'This method is not supported.');
      // Validate the browser origin before translating it for the retained backend.
      if (req.method === 'POST' && !allowedOrigins.has(req.headers.origin)) return fail(403, 'invalid_origin', 'Please submit from the Mixed Signals website.');
      const headers = new Headers({ Accept: 'application/json' });
      const cookies = (req.headers.cookie ?? '').split(';').map(c => c.trim());
      const session = cookies.find(c => c.startsWith('__session='))?.slice(10);
      if (session && TOKEN.test(session)) headers.set('Cookie', `${base.protocol === 'https:' ? '__Host-ms-session' : 'ms-session'}=${session}`);
      let body;
      if (req.method === 'POST') {
        if (req.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') return fail(415, 'unsupported_media_type', 'Please send a JSON request.');
        if (Number(req.headers['content-length'] ?? 0) > 4096) return fail(413, 'body_too_large', 'The request is too large.');
        const chunks = []; let size = 0;
        for await (const chunk of req) { size += chunk.length; if (size > 4096) return fail(413, 'body_too_large', 'The request is too large.'); chunks.push(chunk); }
        body = Buffer.concat(chunks);
        headers.set('Content-Type', 'application/json');
        headers.set('Origin', base.origin);
      }
      // Only fixed routes reach the fixed upstream. No host, IP, credentials or arbitrary forwarding.
      const response = await fetchImpl(new URL(url.pathname, base), { method: req.method, headers, body, redirect: 'manual', signal: AbortSignal.timeout(15000) });
      if (response.status >= 300 && response.status < 400) return fail(502, 'upstream_redirect', 'The survey service is temporarily unavailable.');
      const out = { ...PRIVATE, 'Content-Type': response.headers.get('content-type') ?? 'application/json' };
      if (response.headers.has('retry-after')) out['Retry-After'] = response.headers.get('retry-after');
      const cookie = response.headers.get('set-cookie');
      const token = cookie?.match(/(?:^|,\s*)(?:__Host-ms-session|ms-session)=([a-f0-9]{64})(?:;|$)/)?.[1];
      // Firebase Hosting forwards only __session. Retain the original private cookie's security.
      if (token) out['Set-Cookie'] = `__session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secureCookies ? '; Secure' : ''}`;
      let content = await response.text();
      if (url.pathname === '/api/reminder' && response.ok) {
        content = content.replaceAll(base.origin, canonical);
        out['Content-Disposition'] = 'attachment; filename="mixed-signals-reveal.ics"';
      }
      res.writeHead(response.status, out); res.end(content);
    } catch {
      fail(503, 'service_unavailable', 'The survey service is temporarily unavailable. Please try again shortly.');
    }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const upstream = process.env.UPSTREAM_ORIGIN;
  const origins = process.env.APP_ORIGINS?.split(',').filter(Boolean);
  if (!upstream || !origins?.length) throw new Error('UPSTREAM_ORIGIN and APP_ORIGINS are required');
  createGateway({ upstream, origins }).listen(Number(process.env.PORT ?? 8080), '0.0.0.0');
}
