/** A disposable compiled Worker and D1 database. No clock override ships in the app. */
import {
  cp,
  mkdtemp,
  readFile,
  writeFile,
  symlink,
  rm,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const temporary = await mkdtemp(join(tmpdir(), 'mixed-signals-browser-'));
const excluded = new Set([
  'node_modules',
  '.git',
  '.wrangler',
  '.next',
  '.vinext',
  'dist',
  'test-results',
  'playwright-report',
  'docs',
  '.evals',
  '__pycache__',
]);
let child;
let firebaseServer;
let stopping = false;
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  firebaseServer?.kill('SIGTERM');
  if (child && child.exitCode === null) {
    const exited = new Promise((resolveExit) =>
      child.once('exit', resolveExit),
    );
    child.kill('SIGTERM');
    await exited;
  }
  await rm(temporary, { recursive: true, force: true });
  process.exit(code);
}
process.on('SIGTERM', () => void stop());
process.on('SIGINT', () => void stop());
async function run(script, args) {
  child = spawn(
    process.execPath,
    [join(root, 'node_modules', script), ...args],
    {
      cwd: temporary,
      stdio: 'inherit',
      env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
    },
  );
  const code = await new Promise((resolveExit, reject) => {
    child.once('exit', resolveExit);
    child.once('error', reject);
  });
  if (code !== 0 && !stopping)
    throw new Error(`Test runtime command failed: ${script} (${code})`);
}
try {
  await cp(root, temporary, {
    recursive: true,
    filter: (source) =>
      !excluded.has(basename(source)) && !basename(source).startsWith('.env'),
  });
  await symlink(
    join(root, 'node_modules'),
    join(temporary, 'node_modules'),
    'dir',
  );
  const path = join(temporary, 'lib/campaign.ts');
  const now = Date.now();
  const opened = new Date(now - 3600000).toISOString();
  const reveal = new Date(now - 3600000 + 7 * 86400000).toISOString();
  const campaign = (await readFile(path, 'utf8'))
    .replace(/opensAt: '[^']+'/, `opensAt: '${opened}'`)
    .replace(/revealsAt: '[^']+'/, `revealsAt: '${reveal}'`);
  await writeFile(path, campaign);
  console.log(
    'Starting an isolated seven-day campaign for browser tests. Production source and data are unchanged.',
  );
  await run('wrangler/bin/wrangler.js', [
    'd1',
    'migrations',
    'apply',
    'DB',
    '--local',
    '--config',
    'wrangler.local.json',
    '--persist-to',
    join(temporary, '.wrangler/state'),
  ]);
  await run('vinext/dist/cli.js', ['build']);
  if (process.env.FIREBASE_E2E === '1') {
    await run('vite/bin/vite.js', ['build', '--config', 'vite.firebase.config.ts']);
    firebaseServer = spawn(process.execPath, ['scripts/firebase-static-server.mjs'], { cwd: temporary, stdio: 'inherit' });
  }
  await run('wrangler/bin/wrangler.js', [
    'dev',
    '--config',
    'dist/server/wrangler.json',
    '--ip',
    '127.0.0.1',
    '--port',
    process.env.FIREBASE_E2E === '1' ? '3108' : '3107',
    '--persist-to',
    join(temporary, '.wrangler/state'),
  ]);
  await stop();
} catch (error) {
  console.error(error);
  await stop(1);
}
