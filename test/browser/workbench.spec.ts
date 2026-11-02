import { test, expect } from '@playwright/test';
test('audit, source-specific checklist, stale review and evidence export', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.locator('#analyze').click();
  await expect(page.locator('#findings')).toContainText('Update the package import');
  await expect(page.locator('#findings')).toContainText('still appears');
  await page.locator('[data-check="inventory"]').check();
  await expect(page.locator('#plan-count')).toHaveText('1 / 6 self-reviewed');
  await page.locator('#code').fill('const replacement = 1;');
  await expect(page.locator('[data-check="inventory"]')).toBeDisabled();
  await expect(page.locator('#plan-status')).toContainText('changed');
  const waiting = page.waitForEvent('download');
  await page.locator('#export').click();
  const download = await waiting;
  expect(download.suggestedFilename()).toBe('lesson-09-migration-evidence.json');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const c of stream!) chunks.push(Buffer.from(c));
  const data = JSON.parse(Buffer.concat(chunks).toString());
  expect(data.auditIsCurrent).toBe(false);
  expect(data.attestationsAreManual).toBe(true);
  expect(data).not.toHaveProperty('code');
  expect(errors).toEqual([]);
});
test('modern and conceptual references expose different configuration findings', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('#preset').selectOption('conceptual');
  await page.locator('#load').click();
  await page.locator('#analyze').click();
  await expect(page.locator('#findings')).toContainText('Place configuration under options');
  await page.locator('#preset').selectOption('modern');
  await page.locator('#load').click();
  await page.locator('#analyze').click();
  await expect(page.locator('#findings')).toContainText('Use the query-based baseline');
  await expect(page.locator('#findings')).not.toContainText('Place configuration under options');
  await page.getByText('Compile-checked reference:', { exact: false }).click();
  await expect(page.locator('#reference')).toContainText('finally');
});
test('practice clearly separates synthetic evidence and requires alpha opt-in', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: '02 Behavior checks' }).click();
  await page.locator('#run').click();
  await expect(page.locator('#run-origin')).toHaveText('practice');
  await expect(page.locator('#counts')).toContainText('SYNTHETIC');
  await expect(page.locator('#behavior-outcome')).toHaveText('Passed');
  await page.locator('#startup').selectOption('prewarm');
  await expect(page.locator('#run')).toBeDisabled();
  await page.locator('#warm-optin').check();
  await page.locator('#run').click();
  await expect(page.locator('#events')).toContainText('Synthetic prewarm');
  await page.locator('#scenario').selectOption('permission');
  await page.locator('#run').click();
  await expect(page.locator('#checks')).toContainText('Protected handler executions = 0');
});
test('actual settings projection honors opt-in and selected fixture sources', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '03 Alpha lab' }).click();
  await expect(page.locator('#settings-run')).toBeDisabled();
  await page.locator('#settings-optin').check();
  await page.locator('#settings-run').click();
  await expect(page.locator('#settings-output')).toContainText('actual resolveSettings() result');
  await expect(page.locator('#settings-output')).toContainText('"rawDefaultMode": "default"');
  await page.locator('#settings-sources').selectOption('project-local');
  await page.locator('#settings-run').click();
  await expect(page.locator('#settings-output')).toContainText('"rawDefaultMode": "dontAsk"');
  await expect(page.locator('#settings-output')).toContainText('not a permission decision');
});
test('phone layout and quiz remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Modernize the code. Verify the behavior.' }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.getByRole('button', { name: '04 Guide & quiz' }).click();
  for (const [i, a] of [0, 1, 2, 0].entries())
    await page.locator(`input[name="q${i}"][value="${a}"]`).check();
  await page.locator('#grade').click();
  await expect(page.locator('#score')).toContainText('4 / 4');
});
test('live SSE failures preserve explanation without inventing verification', async ({ page }) => {
  await page.route('**/api/verify', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: 'data: {"kind":"error","message":"Controlled injected failure"}\n\ndata: {"kind":"done","status":"error"}\n\n',
    }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: '02 Behavior checks' }).click();
  await page.locator('#mode').selectOption('live');
  await page.locator('#run').click();
  await expect(page.locator('#run-notice')).toContainText('Controlled injected failure');
  await expect(page.locator('#behavior-outcome')).toHaveText('—');
  await expect(page.locator('#counts')).toContainText('unknown');
  await expect(page.locator('#run')).toBeEnabled();
});
