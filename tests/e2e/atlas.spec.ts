import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const ids = [
  'spark',
  'followThrough',
  'affordability',
  'clarity',
  'authenticity',
  'ghosting',
  'logistics',
  'hope',
];
async function startSurvey(page: Page) {
  await expect(page.getByText(/SEASON 001 · COLLECTING/)).toBeVisible();
  await page
    .getByRole('button', { name: 'Drop your signal', exact: true })
    .click();
  await page.getByRole('combobox', { name: 'Your city' }).fill('London');
  await page.getByRole('option', { name: /London/ }).click();
  await page.getByRole('checkbox', { name: /I am 18 or older/ }).check();
  await page
    .getByRole('checkbox', { name: /I have dating experience/ })
    .check();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
}
async function answerQuestions(page: Page) {
  for (let step = 0; step < 4; step++) {
    for (const id of ids.slice(step * 2, step * 2 + 2))
      await page.locator(`label[for="${id}-4"]`).click();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
  }
}
test('atlas is labeled, interactive, searchable and mobile-safe', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByText(/SEASON 001 · COLLECTING/)).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'coordinates',
  );
  await expect(
    page.getByText('ILLUSTRATIVE PREVIEW', { exact: true }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Mixed signals', exact: true }).click();
  await expect(
    page.getByRole('tab', { name: 'Mixed signals', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await page
    .getByRole('textbox', { name: 'Search city forecasts' })
    .fill('Mumbai');
  await expect(page.locator('.city-tile')).toHaveCount(1);
  await page.locator('.city-tile').click();
  await expect(page.locator('.map-city-card')).toContainText('Mumbai');
  await expect(page.locator('.map-city-card')).toContainText(
    '54 sample signals',
  );
  await page.getByRole('button', { name: 'Close city forecast' }).click();
  await page
    .getByRole('textbox', { name: 'Search city forecasts' })
    .fill('Atlantis');
  await expect(
    page.getByText('No forecast at those coordinates.'),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Clear filters', exact: true })
    .click();
  await expect(page.locator('.city-tile')).toHaveCount(6);
  await page.getByRole('button', { name: /Explore all 24/ }).click();
  await expect(page.locator('.city-tile')).toHaveCount(24);
  const width = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    width: window.innerWidth,
  }));
  expect(width.scroll).toBeLessThanOrEqual(width.width + 1);
  expect(errors).toEqual([]);
  await page.getByRole('tab', { name: 'Chemistry', exact: true }).click();
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Pause globe' })).toBeVisible();
  await page.screenshot({
    path: `docs/images/atlas-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
test('collection state protects live results and calendar is real', async ({
  page,
  request,
}) => {
  await page.goto('/');
  await expect(page.getByText(/SEASON 001 · COLLECTING/)).toBeVisible();
  await page.getByRole('tab', { name: 'Live experiment', exact: true }).click();
  await expect(
    page.getByText('Some things need', { exact: false }),
  ).toBeVisible();
  await expect(page.locator('.city-tile')).toHaveCount(0);
  const response = await request.get('/api/results');
  expect(await response.json()).toMatchObject({
    phase: 'collecting',
    cities: [],
  });
  const calendar = await request.get('/api/reminder');
  expect(calendar.headers()['content-type']).toContain('text/calendar');
  const status = await (await request.get('/api/status')).json();
  const start = status.campaign.revealsAt
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
  expect(await calendar.text()).toContain('DTSTART:' + start);
});
test('a complete report persists, survives reload, and can be withdrawn', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await startSurvey(page);
  await expect(
    page.getByRole('heading', { name: 'Let’s check for chemistry.' }),
  ).toBeVisible();
  await page.screenshot({
    path: `docs/images/survey-${testInfo.project.name}.png`,
  });
  await answerQuestions(page);
  await page.getByRole('radio', { name: /Friends of friends/ }).check();
  await page
    .getByRole('checkbox', { name: /I agree to anonymous city summaries/ })
    .check();
  await page
    .getByRole('button', { name: 'Send my signal', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: /part of the atmosphere/ }),
  ).toBeVisible();
  await expect(
    page.getByText('YOUR PERSONAL FORECAST', { exact: true }),
  ).toBeVisible();
  const receipt = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('mixed-signals:receipt:season-001')!),
  );
  expect(receipt.id).toMatch(/^[a-f0-9-]{36}$/);
  expect(receipt.deletionToken).toHaveLength(64);
  await page.screenshot({
    path: `docs/images/receipt-${testInfo.project.name}.png`,
  });
  await page.reload();
  await page
    .getByRole('button', { name: 'Your signal is in', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Your little signal.' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Delete my report', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Delete report', exact: true })
    .click();
  await expect(page.getByText('Your private report is deleted.')).toBeVisible();
  expect(
    await page.evaluate(() =>
      localStorage.getItem('mixed-signals:receipt:season-001'),
    ),
  ).toBeNull();
});
test('validation and failed submission preserve answers for retry', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByText(/SEASON 001 · COLLECTING/)).toBeVisible();
  await page
    .getByRole('button', { name: 'Drop your signal', exact: true })
    .click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Choose the city');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await startSurvey(page);
  await answerQuestions(page);
  await page.getByRole('radio', { name: /The apps/ }).check();
  await page
    .getByRole('checkbox', { name: /I agree to anonymous city summaries/ })
    .check();
  await page.route('**/api/signals', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'Test signal tower outage. Retry safely.',
      }),
    }),
  );
  await page
    .getByRole('button', { name: 'Send my signal', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText(
    'Test signal tower outage',
  );
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.locator('#logistics-4')).toBeChecked();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.unroute('**/api/signals');
  await page
    .getByRole('button', { name: 'Send my signal', exact: true })
    .click();
  await expect(page.getByText('TRANSMISSION SUCCESSFUL')).toBeVisible();
});
test('keyboard dialog flow and WCAG automated checks', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/SEASON 001 · COLLECTING/)).toBeVisible();
  const atlas = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    atlas.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page
    .getByRole('button', { name: 'Drop your signal', exact: true })
    .click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.evaluate(async (element) => {
    await Promise.all(
      element.getAnimations().map((animation) => animation.finished),
    );
  });
  await expect(dialog).toHaveCSS('opacity', '1');
  const survey = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    survey.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});
test('unknown routes recover and reduced motion pauses the globe', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'Rotate globe', exact: true }),
  ).toBeVisible();
  await page.goto('/not-a-real-place');
  await expect(page.getByText('404 / WRONG COORDINATES')).toBeVisible();
  await page
    .getByRole('link', { name: 'Back to the atlas', exact: true })
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'coordinates',
  );
});
test('a lost successful response can recover its private receipt after reload', async ({
  page,
}) => {
  await page.goto('/');
  await startSurvey(page);
  await answerQuestions(page);
  await page.getByRole('radio', { name: /The apps/ }).check();
  await page
    .getByRole('checkbox', { name: /I agree to anonymous city summaries/ })
    .check();
  await page.route('**/api/signals', async (route) => {
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    await route.abort('failed');
  });
  await page
    .getByRole('button', { name: 'Send my signal', exact: true })
    .click();
  await expect(page.getByRole('alert')).toBeVisible();
  expect(
    await page.evaluate(() =>
      localStorage.getItem('mixed-signals:receipt:season-001'),
    ),
  ).toBeNull();
  await page.unroute('**/api/signals');
  await page.reload();
  await page
    .getByRole('button', { name: 'Drop your signal', exact: true })
    .click();
  await expect(page.getByText('TRANSMISSION SUCCESSFUL')).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('mixed-signals:receipt:season-001')!)
          .deletionToken,
    ),
  ).toHaveLength(64);
});
test('a saved receipt can be restored and used from a fresh browser', async ({
  page,
  browser,
  baseURL,
}) => {
  await page.goto('/');
  await startSurvey(page);
  await answerQuestions(page);
  await page.getByRole('radio', { name: /The apps/ }).check();
  await page
    .getByRole('checkbox', { name: /I agree to anonymous city summaries/ })
    .check();
  await page
    .getByRole('button', { name: 'Send my signal', exact: true })
    .click();
  await expect(page.getByText('TRANSMISSION SUCCESSFUL')).toBeVisible();
  const receipt = await page.evaluate(() =>
    localStorage.getItem('mixed-signals:receipt:season-001')!,
  );
  const other = await browser.newContext({ baseURL });
  const fresh = await other.newPage();
  try {
    await fresh.goto('/');
    await expect(fresh.getByText(/SEASON 001 · COLLECTING/)).toBeVisible();
    await fresh
      .getByRole('button', { name: 'Your signal', exact: true })
      .click();
    await fresh.locator('input[type=file]').setInputFiles({
      name: 'private-receipt.json',
      mimeType: 'application/json',
      buffer: Buffer.from(receipt),
    });
    await fresh
      .getByRole('button', { name: 'Delete my report', exact: true })
      .click();
    await fresh
      .getByRole('button', { name: 'Delete report', exact: true })
      .click();
    await expect(
      fresh.getByText('Your private report is deleted.'),
    ).toBeVisible();
  } finally {
    await other.close();
  }
});

test('an uncertain send preserves its original payload after edits', async ({
  page,
}) => {
  await page.goto('/');
  await startSurvey(page);
  await answerQuestions(page);
  await page.getByRole('radio', { name: /The apps/ }).check();
  await page
    .getByRole('checkbox', { name: /I agree to anonymous city summaries/ })
    .check();
  let original = '';
  await page.route('**/api/signals', async (route) => {
    original = route.request().postData()!;
    await route.fetch();
    await route.abort('failed');
  });
  await page
    .getByRole('button', { name: 'Send my signal', exact: true })
    .click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.locator('label[for="logistics-1"]').click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(
    page.getByText(/Retrying confirms that original report/),
  ).toBeVisible();
  await page.unroute('**/api/signals');
  let replay = '';
  await page.route('**/api/signals', async (route) => {
    replay = route.request().postData()!;
    await route.continue();
  });
  await page
    .getByRole('button', { name: 'Send my signal', exact: true })
    .click();
  await expect(page.getByText('TRANSMISSION SUCCESSFUL')).toBeVisible();
  expect(replay).toBe(original);
});

test('an unmatched receipt is kept and never falsely confirms deletion', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByText(/SEASON 001 · COLLECTING/)).toBeVisible();
  await page.getByRole('button', { name: 'Your signal', exact: true }).click();
  const receipt = {
    id: crypto.randomUUID(),
    cityId: 'london',
    campaignId: 'season-001',
    deletionToken: 'a'.repeat(64),
    label: 'Scattered possibilities',
    revealsAt: '2026-09-12T13:00:00.000Z',
  };
  await page.locator('input[type=file]').setInputFiles({
    name: 'receipt.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(receipt)),
  });
  await page
    .getByRole('button', { name: 'Delete my report', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Delete report', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText(
    'No matching report was deleted',
  );
  await expect(page.getByText('Your private report is deleted.')).toHaveCount(
    0,
  );
  expect(
    await page.evaluate(() =>
      localStorage.getItem('mixed-signals:receipt:season-001'),
    ),
  ).not.toBeNull();
});
