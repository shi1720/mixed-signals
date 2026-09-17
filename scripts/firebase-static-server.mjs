// Local-only browser-test server. Production static files are served by Firebase Hosting.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { createGateway } from '../firebase/gateway/server.mjs';
const root = resolve('dist-firebase');
const gateway = createGateway({ upstream: 'http://127.0.0.1:3108', origins: ['http://127.0.0.1:3107'], secureCookies: false }).listeners('request')[0];
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png' };
createServer(async (req, res) => {
  if (req.url.startsWith('/api/')) return gateway(req, res);
  const path = new URL(req.url, 'http://localhost').pathname;
  const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
  try {
    if (!file.startsWith(root + '/')) throw new Error('invalid path');
    const data = await readFile(file); res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' }); res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/html' }); res.end(await readFile(resolve(root, '404.html')));
  }
}).listen(3107, '127.0.0.1');
