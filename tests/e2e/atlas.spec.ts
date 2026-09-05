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
    .getByRole('button', { name: 'Take the 2-minute survey', exact: true })
    .click();
  await page.getByRole('combobox', { name: 'Your city' }).fill('London');
  await page.getByRole('option', { name: /London/ }).click();
  await page.getByRole('checkbox', { name: /I am 18 or older/ }).check();
  await page
    .getByRole('checkbox', { name: /I have dating experience/ })
    .check();
  await expect(
    page.getByRole('button', { name: 'Continue', exact: true }),
  ).toBeInViewport({ ratio: 1 });
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
}
async function answerQuestions(page: Page) {
  for (let step = 0; step < 4; step++) {
    for (const id of ids.slice(step * 2, step * 2 + 2))
      await page.locator(`label[for="${id}-4"]`).click();
    if (step === 3) {
      await page.locator('label[for="hope-skip"]').click();
      await expect(page.locator('#hope-skip')).toBeChecked();
      await page.locator('label[for="hope-4"]').click();
    }
    await expect(
      page.getByRole('button', { name: 'Continue', exact: true }),
    ).toBeInViewport({ ratio: 1 });
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
  await expect(
    page.getByRole('button', { name: 'Take the 2-minute survey', exact: true }),
  ).toBeInViewport({ ratio: 1 });
  await page.screenshot({
    path: `docs/images/first-look-${testInfo.project.name}.png`,
  });
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'in your city',
  );
  await expect(
    page.getByText('EXAMPLE · INVENTED DATA', { exact: true }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Mixed messages', exact: true }).click();
  await expect(
    page.getByRole('tab', { name: 'Mixed messages', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await page
    .getByRole('textbox', { name: 'Search city reports' })
    .fill('Mumbai');
  await expect(page.locator('.city-tile')).toHaveCount(1);
  await page.locator('.city-tile').click();
  await expect(page.locator('.map-city-card')).toContainText('Mumbai');
  await expect(page.locator('.map-city-card')).toContainText(
    'Invented example',
  );
  await page.getByRole('button', { name: 'Close selected city' }).click();
  await page
    .getByRole('textbox', { name: 'Search city reports' })
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
  await page.getByRole('tab', { name: 'Connection', exact: true }).click();
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
  await page
    .getByRole('tab', { name: 'Community results', exact: true })
    .click();
  await expect(
    page.getByRole('heading', {
      name: /Community results open on 12 September/,
    }),
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
    page.getByRole('heading', { name: 'Meeting people & making plans.' }),
  ).toBeVisible();
  await expect(page.getByRole('dialog')).toBeInViewport({ ratio: 1 });
  await page.getByRole('dialog').evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((a) => a.finished));
  });
  await page.screenshot({
    path: `docs/images/survey-${testInfo.project.name}.png`,
  });
  await answerQuestions(page);
  await page.getByRole('radio', { name: /Friends of friends/ }).check();
  await page
    .getByRole('checkbox', { name: /I agree to anonymous city summaries/ })
    .check();
  await page
    .getByRole('button', { name: 'Submit anonymous answers', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: /Your report is saved/ }),
  ).toBeVisible();
  await expect(
    page.getByText('YOUR ANSWERS, SUMMED UP', { exact: true }),
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
    .getByRole('button', { name: 'View my saved report', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Your saved report.' }),
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
    .getByRole('button', { name: 'Take the 2-minute survey', exact: true })
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
    .getByRole('button', { name: 'Submit anonymous answers', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText(
    'Test signal tower outage',
  );
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.locator('#logistics-4')).toBeChecked();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.unroute('**/api/signals');
  await page
    .getByRole('button', { name: 'Submit anonymous answers', exact: true })
    .click();
  await expect(
    page.getByText('LOCAL CORRESPONDENT · REPORT SAVED'),
  ).toBeVisible();
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
    .getByRole('button', { name: 'Take the 2-minute survey', exact: true })
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
    'in your city',
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
    .getByRole('button', { name: 'Submit anonymous answers', exact: true })
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
    .getByRole('button', { name: 'Take the 2-minute survey', exact: true })
    .click();
  await expect(
    page.getByText('LOCAL CORRESPONDENT · REPORT SAVED'),
  ).toBeVisible();
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
    .getByRole('button', { name: 'Submit anonymous answers', exact: true })
    .click();
  await expect(
    page.getByText('LOCAL CORRESPONDENT · REPORT SAVED'),
  ).toBeVisible();
  const receipt = await page.evaluate(() =>
    localStorage.getItem('mixed-signals:receipt:season-001')!,
  );
  const other = await browser.newContext({ baseURL });
  const fresh = await other.newPage();
  try {
    await fresh.goto('/');
    await expect(fresh.getByText(/SEASON 001 · COLLECTING/)).toBeVisible();
    await fresh
      .getByRole('button', { name: 'My report & deletion', exact: true })
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
    .getByRole('button', { name: 'Submit anonymous answers', exact: true })
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
    .getByRole('button', { name: 'Submit anonymous answers', exact: true })
    .click();
  await expect(
    page.getByText('LOCAL CORRESPONDENT · REPORT SAVED'),
  ).toBeVisible();
  expect(replay).toBe(original);
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('mixed-signals:receipt:season-001')!),
  );
  expect(saved.scores.friction).toBeCloseTo(125 / 3);
});

test('an unmatched receipt is kept and never falsely confirms deletion', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByText(/SEASON 001 · COLLECTING/)).toBeVisible();
  await page
    .getByRole('button', { name: 'My report & deletion', exact: true })
    .click();
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

test('city reports explain all scores and compare the same dimensions', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await expect(page.getByText(/SEASON 001 · COLLECTING/)).toBeVisible();
  const report = page.getByRole('complementary', { name: 'City report' });
  await report
    .getByRole('combobox', { name: 'City report', exact: true })
    .selectOption('mumbai');
  await expect(report).toContainText('EXAMPLE REPORT · INVENTED DATA');
  for (const name of ['Connection', 'Mixed messages', 'Date hassles'])
    await expect(
      report.getByRole('heading', { name, exact: true }),
    ).toBeVisible();
  await expect(report).toContainText('Higher = more positive experiences');
  await expect(report).toContainText('Higher = more confusion');
  await expect(report).toContainText('Higher = more practical barriers');
  await report.getByRole('button', { name: 'Compare another city' }).click();
  await report
    .getByRole('combobox', { name: 'Comparison city' })
    .selectOption('london');
  const connection = report.getByRole('region', {
    name: 'Connection',
    exact: true,
  });
  await expect(connection).toContainText('Mumbai');
  await expect(connection).toContainText('80/100');
  await expect(connection).toContainText('London');
  await expect(connection).toContainText('60/100');
  await expect(report).toContainText('not percentages of people');
  await report.screenshot({
    path: `docs/images/comparison-${testInfo.project.name}.png`,
  });
});

test('four answers produce an honest partial personal summary', async ({
  page,
}) => {
  await page.goto('/');
  await startSurvey(page);
  const answered = new Set(['spark', 'clarity', 'ghosting', 'hope']);
  for (let step = 0; step < 4; step++) {
    for (const id of ids.slice(step * 2, step * 2 + 2))
      if (answered.has(id)) await page.locator(`label[for="${id}-4"]`).click();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
  }
  await page.getByRole('radio', { name: /The apps/ }).check();
  await page
    .getByRole('checkbox', { name: /I agree to anonymous city summaries/ })
    .check();
  await page
    .getByRole('button', { name: 'Submit anonymous answers', exact: true })
    .click();
  const summary = page.getByRole('region', {
    name: 'Your private answer summary',
  });
  await expect(
    summary.getByText('Not enough answers', { exact: true }),
  ).toHaveCount(2);
  await expect(summary).toContainText('50/100');
  await expect(summary).toContainText('This question group is incomplete');
  const receipt = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('mixed-signals:receipt:season-001')!),
  );
  expect(receipt.scores).toEqual({ chemistry: null, fog: 50, friction: null });
  await page.reload();
  await page
    .getByRole('button', { name: 'View my saved report', exact: true })
    .click();
  await expect(
    page.getByRole('region', { name: 'Your private answer summary' }),
  ).toContainText('50/100');
});

test('published community reports distinguish hidden scores from a future reveal', async ({
  page,
}) => {
  await page.route('**/api/status', async (route) => {
    const response = await route.fetch();
    const status = await response.json();
    await route.fulfill({ json: { ...status, phase: 'revealed' } });
  });
  await page.route('**/api/results', (route) =>
    route.fulfill({
      json: {
        phase: 'revealed',
        cities: [
          {
            cityId: 'london',
            n: 12,
            chemistry: { value: 60, n: 10 },
            fog: { value: null, n: 0 },
            friction: { value: 50, n: 11 },
            habitat: 'none',
            forecast: 'Still reading the atmosphere',
          },
        ],
      },
    }),
  );
  await page.goto('/?mode=live&city=london');
  const report = page.getByRole('complementary', { name: 'City report' });
  await expect(report).toContainText('COMMUNITY REPORT · VOLUNTARY SURVEY');
  await expect(report).toContainText(
    'Fewer than 10 complete responses. Score hidden.',
  );
  await expect(report).toContainText('Most selected: still looking');
  await expect(report).toContainText(
    'An experience, not a place to meet people.',
  );
  await expect(
    page
      .getByRole('button', { name: 'Explore community results', exact: true })
      .first(),
  ).toBeVisible();
});

test('the globe keeps a painted frame when resized offscreen', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByText(/SEASON 001 · COLLECTING/)).toBeVisible();
  const canvas = page.locator('canvas');
  const centerAlpha = () =>
    canvas.evaluate(
      (element: HTMLCanvasElement) =>
        element
          .getContext('2d')!
          .getImageData(
            Math.floor(element.width / 2),
            Math.floor(element.height / 2),
            1,
            1,
          ).data[3],
    );
  await expect.poll(centerAlpha).toBeGreaterThan(0);
  const viewport = page.viewportSize()!;
  await page.setViewportSize({
    width: viewport.width - 8,
    height: viewport.height,
  });
  await expect.poll(centerAlpha).toBeGreaterThan(0);
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(centerAlpha).toBeGreaterThan(0);
});
