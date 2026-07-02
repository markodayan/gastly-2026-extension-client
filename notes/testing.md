# Testing

This project has two test suites with different purposes and different cadences.

| Suite | Tool           | Scope                              | When to run                             |
| ----- | -------------- | ---------------------------------- | --------------------------------------- |
| Unit  | Jest + ts-jest | Pure utility functions, no browser | During development, before every commit |
| E2E   | Playwright     | Full extension loaded in Brave     | Before packaging/shipping               |

Scripts:

| Command                   | What it does                                    |
| ------------------------- | ----------------------------------------------- |
| `npm run test:unit`       | Jest only — instant, no build needed            |
| `npm run test:unit:watch` | Jest in watch mode for development              |
| `npm run test:e2e`        | Playwright e2e only (requires a prior build)    |
| `npm test`                | Unit → build → e2e — full production validation |

---

## Unit Tests (Jest)

### What they cover

Unit tests live in `tests/unit/` and cover pure functions that have no dependency on the Chrome API or the browser:

| File                         | Functions tested                                              |
| ---------------------------- | ------------------------------------------------------------- |
| `tests/unit/utils.test.ts`   | `gasPriceToFiat`, `clean`, `normaliseBlock`, `normaliseSpots` |
| `tests/unit/storage.test.ts` | `preferencesNeedRepair`                                       |

These functions all live in `src/shared/utils.ts` and `src/shared/storage.ts`. They were extracted there specifically so they could be tested in isolation.

### Running unit tests

```bash
npm run test:unit
```

Or in watch mode while developing:

```bash
npm run test:unit:watch
```

No build step required. Tests run directly against the TypeScript source via ts-jest.

### Setup files

| File                 | Purpose                                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `jest.config.cjs`    | Jest config — uses `ts-jest` ESM preset, points at `tests/unit/`                                                                |
| `tsconfig.test.json` | Separate tsconfig for Jest — uses `moduleResolution: node` (required by ts-jest, different from the app's `bundler` resolution) |

### Why Jest requires `NODE_OPTIONS=--experimental-vm-modules`

The project uses `"type": "module"` in `package.json`, making it a native ESM project. Jest's support for ESM is still behind a Node.js experimental flag. The `test:unit` script sets this automatically — you don't need to do anything, just be aware of the warning you'll see in output.

### Adding new unit tests

Add a file to `tests/unit/` with a `.test.ts` extension. Jest picks it up automatically.

Only test pure functions with no `chrome.*` dependencies. If a function uses `chrome.storage`, `chrome.alarms`, etc., it cannot be unit tested without mocking — add an E2E test instead.

If you add a new pure function to the codebase and want it to be testable, put it in `src/shared/utils.ts` rather than inside a component or the background module.

---

## E2E Tests (Playwright)

### What they cover

E2E tests live in `tests/e2e/` and run the full extension inside a real Brave browser window:

| File                      | Tests                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------- |
| `tests/e2e/popup.spec.ts` | Card rendering, fee calculation accuracy, fiat preference changes, storage persistence, app scale |

### Running E2E tests

E2E tests require a production build in `dist/` first:

```bash
npm run build:prod
npm run test:e2e
```

Other options:

```bash
npm run test:e2e:ui      # open Playwright's interactive UI runner (best for debugging)
npm run test:e2e:headed  # run tests in a visible browser window with slow output
npx playwright test --grep "Fast card"    # run a single test by name
npx playwright show-report               # open the HTML report after a run
```

### How the test fixture works

Each test gets its own fresh Brave browser context with the extension loaded from `dist/`. Before assertions, `seedAndOpen` does three things:

1. Navigates to the extension popup page (`chrome-extension://<id>/index.html`)
2. Calls `chrome.storage.local.set(mockData)` via `page.evaluate` — this runs inside the extension page where the Chrome API is available
3. Reloads the page so React mounts fresh with the seeded storage data

All HTTP and WebSocket calls to `extension-api.gastly.tools` are blocked at the context level. This prevents the service worker from overwriting seeded test data with live API data during tests.

### Why tests run against `dist/` and not `dist-dev/`

The dev build (`dist-dev/`) uses CRXJS, which injects HMR scripts into the extension. Those scripts cause the popup page to perform additional navigations on load (connecting to the Vite dev server). Playwright's navigation tracking can't handle these and throws `ERR_ABORTED` on `page.reload()`.

The production build (`dist/`) has none of this — it's a clean Rollup output. Tests always target the production artifact, which is also what gets shipped.

### Setup files

| File                    | Purpose                                                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `tests/e2e/fixtures.ts` | Custom Playwright fixture — launches Brave, loads extension, blocks API routes, exposes `context`, `extensionId`, `sw` |
| `playwright.config.ts`  | Playwright config — single Chromium project, 30s timeout                                                               |

---

## Full test suite

Runs unit tests, then a production build, then E2E tests in sequence:

```bash
npm test
```

This is the command to run before packaging a release. If any step fails, the chain stops.

```
unit tests (Jest) → build:prod → e2e tests (Playwright)
    ~2s                ~1.5s          ~15s
```

---

## Test structure at a glance

```
tests/
  unit/
    utils.test.ts       # gasPriceToFiat, clean, normaliseBlock, normaliseSpots
    storage.test.ts     # preferencesNeedRepair
  e2e/
    fixtures.ts         # shared Playwright fixtures (browser context, extensionId, sw)
    popup.spec.ts       # full popup interaction tests
```

---

## What is not tested

- **Service worker network logic** (`connectBlockWs`, `fetchAndSyncLatestBlock`, etc.) — these are tightly coupled to the Chrome API and live network. The E2E tests cover the observable result (storage gets populated, popup renders) without testing internals.
- **React components in isolation** — no component unit tests or snapshot tests. The E2E tests cover rendering through the real browser.
- **The `gasPreference` select** — currently commented out in `Header.tsx`, so no test for it.
- **EUR fiat option** — commented out pending an API migration.
