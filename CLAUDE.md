# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@.agents/skills/map-architecture/SKILL.md

---

## Commands

```bash
# Development
npm run dev          # CRXJS hot-reload dev server → load dist-dev/ in Brave
npm run build:prod   # production build → dist/
npm run lint         # ESLint
npm run package      # zip dist/ → chrome-package/<version>.zip

# Testing
npm test                          # full suite: unit → build:prod → e2e (16 + 7 tests)
npm run test:unit                 # Jest unit tests only, no build needed
npm run test:unit:watch           # Jest in watch mode
npm run test:e2e                  # Playwright e2e only (requires prior build:prod)
npm run test:e2e:ui               # Playwright interactive UI runner
npx playwright test --grep "name" # run a single e2e test by name
npx playwright show-report        # open HTML report after a run
```

---

## Architecture

Gastly is a Chrome MV3 extension with two isolated contexts that **never communicate directly** — they share state only through `chrome.storage.local`.

### Background service worker (`src/background/index.ts`)

Sole owner of all network I/O. On install/startup it:
1. Calls `ensureDefaults()` to seed storage with default preferences and connection state
2. Checks storage for a cached block; if missing, falls back to `GET /block`
3. Creates a `chrome.alarms` alarm to poll `GET /spot` every 60 seconds
4. Opens a persistent WebSocket to `WSS /block`

Each new WS message → `normaliseBlock()` → `chrome.storage.local.set({ block })` → `chrome.action.setBadgeText(basefee)`. The periodic spot poll also doubles as a WS health check — if HTTP succeeds but the socket is dead, it triggers a reconnect.

### Popup (`src/popup/`)

Reads only from `chrome.storage.local`. Never touches the network.

`useExtensionState` (`src/popup/hooks/useExtensionState.ts`) is the single state hook:
- On mount: reads storage snapshot, repairs preferences if any key is missing
- Subscribes to `chrome.storage.onChanged` for live updates
- `setPreference(key, value)` applies an optimistic React state update first, then writes to storage asynchronously — UI feels instant

### Storage schema (`src/shared/storage.ts`)

Four keys in `chrome.storage.local`:

| Key | Written by | Purpose |
|---|---|---|
| `block` | background | Latest `NormalisedBlock` — block metrics, basefee, priority fees |
| `spots` | background | `NormalisedSpotPrices` — ETH/USD, ETH/AUD, ETH/ZAR, ETH/BTC |
| `preferences` | popup | Fiat, tx type, gas speed, app scale preferences |
| `connection` | background | WS connected flag, backendReachable, last fetch timestamps |

### Shared utilities (`src/shared/`)

- `utils.ts` — pure functions with no Chrome API dependency: `gasPriceToFiat`, `clean`, `normaliseBlock`, `normaliseSpots`. These are the only functions unit-testable with Jest.
- `storage.ts` — Chrome storage read/write helpers + preference repair logic (`preferencesNeedRepair`, `managePreferences`)
- `config.ts` — `TX_OPTIONS` (transaction types and their gas unit estimates)
- `types.ts` — all shared TypeScript types

---

## Key constraints

**Adding a transaction type**: edit `src/shared/config.ts` only. The TypeScript type (`TransactionPreference`) is derived from `keyof typeof TX_OPTIONS` automatically.

**Adding a preference**: touch four places — `types.ts`, `DEFAULT_PREFERENCES` in `storage.ts`, `preferencesNeedRepair()` in `storage.ts`, and `useExtensionState`.

**Two build outputs**:
- `dist-dev/` — CRXJS dev build with HMR, loaded during `npm run dev`. Do not run Playwright against this — CRXJS navigation events break Playwright's reload tracking.
- `dist/` — clean Rollup production build. All e2e tests target this.

**Pure functions belong in `src/shared/utils.ts`**. Functions that import `chrome.*` (background module, storage helpers) cannot be Jest unit tested without mocking — they belong in e2e tests instead.

**Preference repair** (`managePreferences` in `storage.ts`): called on popup open and on every preference storage change. Merges React state → storage → defaults to handle missing keys after extension updates. If you add a preference key, also update `preferencesNeedRepair()` or existing users will get corrupt state.

---

## Testing setup

**Unit tests (Jest)**: `tests/unit/` — cover pure functions in `src/shared/utils.ts` and `src/shared/storage.ts`. Uses `ts-jest` with `NODE_OPTIONS=--experimental-vm-modules` (ESM project). Config: `jest.config.cjs`, `tsconfig.test.json`.

**E2E tests (Playwright)**: `tests/e2e/` — load the real extension in Brave. The fixture in `tests/e2e/fixtures.ts` blocks all HTTP and WebSocket calls to `extension-api.gastly.tools` so the service worker can't overwrite seeded test data. Each test seeds `chrome.storage.local` via `page.evaluate` inside the extension page, then reloads the popup for a clean React mount.
