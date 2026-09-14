// SPDX-License-Identifier: GPL-3.0-only
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { unzipSync, strFromU8 } from 'fflate';

test('dark theme follows system, persists independently, and Report targets project issues', async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.addInitScript(() => {
    (window as unknown as { cadBuilds: number }).cadBuilds = 0;
    const original = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function(message: unknown, ...rest: unknown[]) {
      if ((message as { type?: string })?.type === 'build') (window as unknown as { cadBuilds: number }).cadBuilds++;
      return Reflect.apply(original, this, [message, ...rest]);
    };
  });
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByTestId('theme-toggle')).toHaveAccessibleName('切换为亮色主题');
  await expect(page.getByTestId('model-status')).toContainText('模型已就绪', { timeout: 60000 });
  const before = await page.evaluate(() => ({ builds: (window as unknown as { cadBuilds: number }).cadBuilds, project: localStorage.getItem('lensboard-project-v1') }));
  await expect(page.getByTestId('report-link')).toHaveAttribute('href', 'https://github.com/RayforLoy/LensboardGenerator/issues');
  await expect(page.getByTestId('report-link')).toHaveAttribute('target', '_blank');
  await expect(page.getByTestId('report-link')).toHaveAttribute('rel', 'noopener noreferrer');
  await page.screenshot({ path: testInfo.outputPath('dark-studio.png'), fullPage: true });
  await page.getByTestId('theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByTestId('theme-toggle')).toHaveAccessibleName('切换为暗色主题');
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(page.getByTestId('theme-toggle')).toHaveAccessibleName('Switch to dark theme');
  expect(await page.evaluate(() => ({ builds: (window as unknown as { cadBuilds: number }).cadBuilds, project: localStorage.getItem('lensboard-project-v1') }))).toEqual(before);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByTestId('theme-toggle')).toHaveAccessibleName('Switch to dark theme');
  await page.getByTestId('theme-toggle').click();
  await page.getByLabel('X offset', { exact: true }).first().fill('100');
  await expect(page.getByRole('alert')).toContainText('protected', { timeout: 30000 });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('dark-mobile.png'), fullPage: true });
});

test('Chinese default, actual CAD, print allowance, language persistence and ZIP export', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('大画幅镜头板工作室');
  await expect(page.getByTestId('print-checkbox')).not.toBeChecked();
  await expect(page.getByTestId('actual-diameter')).toHaveText('34.60 mm');
  await expect(page.getByTestId('model-status')).toContainText('模型已就绪', { timeout: 60000 });
  await page.getByTestId('print-checkbox').check();
  await expect(page.getByTestId('actual-diameter')).toHaveText('35.10 mm');
  await expect(page.getByTestId('model-status')).toContainText('模型已就绪', { timeout: 30000 });
  await page.getByRole('combobox', { name: '快门孔径预设' }).selectOption('copal-3');
  await expect(page.getByTestId('actual-diameter')).toHaveText('65.50 mm');
  await expect(page.getByTestId('model-status')).toContainText('模型已就绪', { timeout: 30000 });
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Large-format Lensboard Studio');
  await expect(page.getByTestId('actual-diameter')).toHaveText('65.50 mm');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Large-format Lensboard Studio');
  await expect(page.getByTestId('model-status')).toContainText('Model ready', { timeout: 60000 });
  await expect(page.getByTestId('export-step')).toBeDisabled();
  await page.getByTestId('accept-warnings').check();
  const event = page.waitForEvent('download'); await page.getByTestId('export-step').click();
  const file = await event; const path = testInfo.outputPath('model-step.zip'); await file.saveAs(path);
  const zip = unzipSync(readFileSync(path));
  expect(Object.keys(zip).some(k => k.endsWith('.step'))).toBe(true);
  expect(Object.keys(zip).some(k => k.startsWith('source-template/'))).toBe(true);
  expect(strFromU8(zip['LICENSE.txt'])).toContain('Version 3, 29 June 2007');
  const json = JSON.parse(strFromU8(zip[Object.keys(zip).find(k => k.endsWith('.json'))!]));
  expect(json.central.diameter).toBe(65); expect(json.central.print.diameterAllowanceMm).toBe(0.5); expect(json.license).toBe('GPL-3.0-only');
  await page.screenshot({ path: testInfo.outputPath('studio.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('validation blocks stale exports; edits and undo remain usable', async ({ page }) => {
  await page.goto('./'); await expect(page.getByTestId('model-status')).toContainText('模型已就绪', { timeout: 60000 });
  await page.getByTestId('accept-warnings').check();
  await page.getByLabel('X 偏移', { exact: true }).first().fill('100');
  await expect(page.getByTestId('export-step')).toBeDisabled();
  await expect(page.getByRole('alert')).toContainText('保护区', { timeout: 30000 });
  await page.getByRole('button', { name: '撤销' }).click();
  await expect(page.getByLabel('X 偏移', { exact: true }).first()).toHaveValue('0');
  await expect(page.getByTestId('model-status')).toContainText('模型已就绪', { timeout: 30000 });
  await page.getByRole('button', { name: 'M 型内螺纹', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('确认');
  await expect(page.getByLabel('螺纹公称外径 D')).toHaveValue('65');
  await page.getByLabel('我已确认实际配合件的外径与螺距').check();
  await expect(page.getByTestId('model-status')).toContainText('模型已就绪', { timeout: 30000 });
});

test('all six templates load, STL downloads, and invalid JSON preserves the design', async ({ page }, testInfo) => {
  await page.goto('./');
  await expect(page.getByTestId('model-status')).toContainText('模型已就绪', { timeout: 60000 });
  const templates = page.getByRole('combobox', { name: '镜头板模板', exact: true });
  for (const id of ['horseman-blank', 'horseman-simplified-blank', 'linhof-blank', 'graflex-pacemaker45-simplified-blank', 'sinar-simplified-blank', 'sinar-blank']) {
    await templates.selectOption(id);
    await expect(page.getByTestId('model-status')).toContainText('模型已就绪', { timeout: 30000 });
    await expect(page.getByRole('alert')).toHaveCount(0);
  }
  await page.getByTestId('accept-warnings').check();
  const event = page.waitForEvent('download'); await page.getByTestId('export-stl').click();
  const file = await event, path = testInfo.outputPath('model-stl.zip'); await file.saveAs(path);
  const zip = unzipSync(readFileSync(path)), stl = zip[Object.keys(zip).find(k => k.endsWith('.stl'))!];
  expect(stl.length).toBeGreaterThan(84);
  const view = new DataView(stl.buffer, stl.byteOffset, stl.byteLength);
  expect(stl.length).toBe(84 + 50 * view.getUint32(80, true));
  await page.locator('input[type=file]').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"schemaVersion":999}') });
  await expect(page.getByRole('alert')).toContainText('当前设计未被覆盖');
  await expect(templates).toHaveValue('sinar-blank');
  await expect(page.getByTestId('actual-diameter')).toHaveText('34.60 mm');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
