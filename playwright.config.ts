import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  // Extension tests require a headed Chromium context — configured per-fixture,
  // not here. Only one project needed since extensions are Chromium-only.
  projects: [
    {
      name: 'chromium-extension',
    },
  ],
});
