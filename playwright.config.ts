import { defineConfig, devices } from '@playwright/test';
const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3107';
// Test submissions must never reach the public experiment.
if (!['127.0.0.1', 'localhost'].includes(new URL(baseURL).hostname))
  throw new Error(
    'E2E_BASE_URL must point to localhost. Synthetic reports must stay local.',
  );
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 45000,
  expect: { timeout: 10000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'node scripts/e2e-server.mjs',
        url: baseURL + '/api/health',
        reuseExistingServer: false,
        timeout: 120000,
      },
});
