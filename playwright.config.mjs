import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/browser',
  testMatch: '**/*.spec.mjs',
  fullyParallel: true,
  workers: 2,
  use: {
    browserName: 'chromium',
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    reducedMotion: 'reduce',
  },
});
