import { test as base, chromium, type BrowserContext, type Worker } from '@playwright/test';
import path from 'path';

// Tests run against the production build in dist/.
// Run `npm run build:prod` before `npm test`.
const EXTENSION_PATH = path.resolve('dist');

// Use Brave if present; otherwise fall back to Playwright's bundled Chromium.
const BRAVE_PATH = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
  sw: Worker;
}>({
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      executablePath: BRAVE_PATH,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });

    // Block HTTP and WebSocket calls to the live API so the service worker
    // can't overwrite seeded storage data during tests.
    await context.route('https://extension-api.gastly.tools/**', (route) => route.abort());
    await context.routeWebSocket('wss://extension-api.gastly.tools/**', (ws) => ws.close());

    await use(context);
    await context.close();
  },

  sw: async ({ context }, use) => {
    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent('serviceworker');
    await use(worker);
  },

  // Derived from sw so we only wait for the service worker once per test.
  extensionId: async ({ sw }, use) => {
    const extensionId = sw.url().split('/')[2];
    await use(extensionId);
  },
});

export const expect = test.expect;
