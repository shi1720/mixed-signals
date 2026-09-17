import { defineConfig, devices } from '@playwright/test';
// Read-only checks; this suite never submits synthetic reports to production.
export default defineConfig({
  testDir: 'tests/firebase', outputDir: 'test-results/firebase-published', workers: 1, timeout: 45000,
  use: { baseURL: 'https://mixed-signals.web.app', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
});
