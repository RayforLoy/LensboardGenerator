// SPDX-License-Identifier: GPL-3.0-only
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', timeout: 90000, workers: 1,
  webServer: process.env.TEST_URL ? undefined : { command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5273 --strictPort', url: 'http://127.0.0.1:5273', reuseExistingServer: true, timeout: 30000 },
  use: { baseURL: process.env.TEST_URL || 'http://127.0.0.1:5273', channel: process.env.TEST_BROWSER || 'msedge', viewport: { width: 1360, height: 1000 }, acceptDownloads: true },
  reporter: 'list',
});
