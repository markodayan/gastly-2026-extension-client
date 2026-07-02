# Gastly 2026 Extension Client

@.agents/skills/map-architecture/SKILL.md

## Development

```bash
npm run dev          # start CRXJS hot-reload dev server → load dist-dev/ in browser
npm run build:prod   # production build → dist/
npm run package      # zip dist/ → chrome-package/<version>.zip for Web Store upload
npm run lint         # ESLint
```

## Testing

Tests use Playwright and run against the **production build** (`dist/`), not the dev build.
The CRXJS dev build has HMR machinery that conflicts with Playwright — do not try to run tests against `dist-dev/`.

```bash
npm run build:prod && npm test   # standard test workflow
npm run test:ui                  # interactive Playwright UI
npx playwright show-report       # view HTML report after a run
```

- Test files live in `tests/e2e/`
- The fixture (`tests/e2e/fixtures.ts`) launches Brave, loads `dist/`, and blocks all calls to `extension-api.gastly.tools` (HTTP + WebSocket) so the service worker can't overwrite seeded storage during tests
- Storage is seeded per-test via `page.evaluate` inside the extension popup page, then the page is reloaded to get a clean React mount with the seeded data
- Brave executable path: `/Applications/Brave Browser.app/Contents/MacOS/Brave Browser`

## Key architectural constraints

- The popup never calls the network directly — all data comes from `chrome.storage.local`
- The background service worker is the sole owner of network I/O
- To add a transaction type: edit `src/shared/config.ts` only
- To add a preference: update `types.ts`, `storage.ts` (DEFAULT_PREFERENCES + preferencesNeedRepair), and `useExtensionState`
- Two build configs: `vite.config.dev.ts` (CRXJS, → dist-dev/) and `vite.config.ts` (production, → dist/)
