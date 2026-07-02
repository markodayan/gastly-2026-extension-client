# Architecture Reference: Gastly

> Generated: 2026-05-27 | Source: gastly-2026-extension-client
> This document is a persistent architecture reference. Load it at the start of a session
> to orient quickly without re-exploring the codebase.

## Recent Changes

> 2026-07-02 — Added Playwright e2e test suite and Jest unit test suite. Extracted pure functions (`gasPriceToFiat`, `clean`, `normaliseBlock`, `normaliseSpots`) from `Body.tsx` and `background/index.ts` into new `src/shared/utils.ts`. Background and Body now import from there. Test scripts restructured: `npm test` runs the full suite (unit → build → e2e), `npm run test:unit` runs Jest only, `npm run test:e2e` runs Playwright only.

## Overview

Gastly is a Chrome extension (MV3) that displays real-time Ethereum gas prices and fiat-denominated transaction fee estimates. As each new Ethereum block arrives via WebSocket, the toolbar badge updates with the current base fee in Gwei and the popup shows Fast/Average/Slow gas speed cards with cost estimates in the user's preferred fiat currency.

## Tech Stack

| Item | Detail |
|---|---|
| Language | TypeScript ~5.8 |
| UI Framework | React 19, Tailwind CSS v4 |
| Build Tool | Vite 7 |
| Extension Build | `@crxjs/vite-plugin` (dev HMR), `@vitejs/plugin-react` (prod) |
| Animation | `react-countup` ^6.5 |
| Icons | `sharp` + `png-to-ico` (generated at build time) |
| Chrome API | Manifest V3 — `storage`, `alarms`, `action` permissions |
| Runtime | Browser background service worker + popup page |

## Project Structure

```
gastly-2026-extension-client/
  src/
    background/
      index.ts          # Service worker — all network I/O, badge updates
    popup/
      App.tsx           # Root component, scale/layout
      main.tsx          # React DOM mount point
      components/
        Header.tsx      # Fiat/tx selectors, spot price display
        Body.tsx        # Block metrics + gas speed cards
      hooks/
        useExtensionState.ts  # Central state hook, storage sync
      index.css         # Tailwind entry
    shared/
      types.ts          # All TS types
      config.ts         # TX_OPTIONS (gas unit estimates per tx type)
      storage.ts        # chrome.storage.local helpers + preference repair
      utils.ts          # Pure functions: gasPriceToFiat, clean, normaliseBlock, normaliseSpots
      env.ts            # API URL constants from Vite env vars
  public/
    manifest.json       # Production MV3 manifest (v2.0.4)
    logo.png            # Source icon (used to generate sized icons)
  manifest.dev.json     # Dev manifest (used by CRXJS)
  vite.config.ts        # Production build config (→ dist/)
  vite.config.dev.ts    # Dev build config with CRXJS HMR (→ dist-dev/)
  .env.development      # VITE_API_HTTP_BASE=http://localhost:5001
  .env.production       # VITE_API_HTTP_BASE=https://extension-api.gastly.tools
  scripts/
    package-extension.js  # Zips dist/ into chrome-package/
    generate-icons.js     # Standalone icon generator
  notes/                  # Dev notes, changelog, deployment docs, testing.md
  tests/
    unit/               # Jest unit tests (pure functions, no Chrome API)
    e2e/                # Playwright e2e tests (full extension in Brave)
  jest.config.cjs         # Jest config (ts-jest ESM preset)
  tsconfig.test.json      # Separate tsconfig for Jest (moduleResolution: node)
  playwright.config.ts    # Playwright config
  chrome-package/         # Versioned .zip files for Chrome Web Store
```

## Layers and Components

### Background Service Worker

**Responsibility**: Sole owner of all network I/O. Fetches and normalises block and spot data, writes to storage, updates the badge.

**Key paths**: `src/background/index.ts`

**Interfaces**:
- `chrome.runtime.onInstalled` / `onStartup` → triggers `bootstrap()`
- `chrome.alarms.onAlarm` (name: `fetchAndSyncSpotRates`) → periodic spot fetch
- `connectBlockWs()` — opens `WS /block`, handles open/message/close/error
- `fetchAndSyncLatestBlock()` — HTTP fallback on cold start
- `fetchAndSyncSpotRates()` — HTTP `/spot`, also used as WS recovery signal
- `setBadgeFromBlock(block)` — writes base fee string to `chrome.action`

**Dependencies**: `src/shared/env.ts` (API URLs), `src/shared/storage.ts` (write helpers), `src/shared/utils.ts` (`normaliseBlock`, `normaliseSpots`), `src/shared/types.ts`

**Patterns**: Single `bootstrapPromise` guard prevents double-initialisation on concurrent `onInstalled`/`onStartup`. Reconnect uses a `setTimeout` ref cleared on successful open. The periodic HTTP spot poll doubles as a "is network back?" signal to restore a dead WS.

---

### chrome.storage.local (IPC bus)

**Responsibility**: Decoupled communication channel between background and popup. No `chrome.runtime.sendMessage` is used — storage changes are the event system.

**Key paths**: `src/shared/storage.ts`

**Storage keys**:
| Key | Type | Written by | Read by |
|---|---|---|---|
| `block` | `NormalisedBlock` | background | popup, background |
| `spots` | `NormalisedSpotPrices` | background | popup |
| `preferences` | `Preferences` | popup | popup, background (ensureDefaults) |
| `connection` | `ConnectionState` | background | popup |

**Preference repair**: `managePreferences()` is called on popup open and on every preferences storage change. It detects missing/partial preference records and merges from: React state → storage → defaults (in priority order). `preferencesNeedRepair()` checks all four required keys.

---

### Shared Types & Config

**Responsibility**: Shared contracts imported by both contexts.

**Key paths**: `src/shared/types.ts`, `src/shared/config.ts`, `src/shared/env.ts`

**Notable exports**:
- `TX_OPTIONS` — 6 transaction types: `eth-send` (21k gas), `swap-cowswap` (250k), `aave-umb-dep` (370k), `aave-umb-wd` (310k), `aave-umb-interest` (183k), `across-bridge-only` (120k)
- `Preferences` — `gasPreference`, `fiatPreference`, `transactionPreference`, `appScalePreference`
- `NormalisedBlock` — filtered block shape (no `timestamp`, `uncles`, `nonce`)
- To add a new transaction type: add to `TX_OPTIONS` in `config.ts` only (type is derived via `keyof typeof TX_OPTIONS`)
- To add a new preference: update `types.ts`, `DEFAULT_PREFERENCES` in `storage.ts`, `preferencesNeedRepair()`, and `useExtensionState`

---

### Shared Utilities

**Responsibility**: Pure calculation and transformation functions with no Chrome API dependency. Lives here so they can be imported by both browser contexts and Jest unit tests without pulling in `chrome.*` globals.

**Key paths**: `src/shared/utils.ts`

**Exports**:
- `gasPriceToFiat(gasPrice, gasUnits, spotRate)` → `[belowCentThreshold, fiatCost]` — converts Gwei gas price to a 2dp fiat amount
- `clean(n)` → rounded gas price for display (2dp below 100 Gwei, integer above)
- `normaliseBlock(raw)` → `NormalisedBlock` — casts all fields to numbers, strips `timestamp`/`uncles`
- `normaliseSpots(raw)` → `NormalisedSpotPrices` — converts string spot prices to numbers

**Dependencies**: `src/shared/types.ts` (type imports only)

**Rule**: Any new pure function with no `chrome.*` dependency should go here, not inside a component or the background module.

---

### useExtensionState (Popup State Hook)

**Responsibility**: All popup React state. Loads on mount, subscribes to live storage changes, exposes preference mutations.

**Key paths**: `src/popup/hooks/useExtensionState.ts`

**Interfaces**: `{ state: ExtensionState | null, setPreference<K>(key, value) }`

**Patterns**: Uses `useEffectEvent` (React 19 experimental) for `handleStorageChange` and `updatePreferences` to avoid stale closure issues. `setPreference` does an optimistic React state update immediately, then writes to storage asynchronously — popup feels instant.

---

### Popup UI Components

**Responsibility**: Render extension state; allow preference changes.

**Key paths**: `src/popup/App.tsx`, `src/popup/components/Header.tsx`, `src/popup/components/Body.tsx`

**App**: Applies `appScalePreference` (0.7–1.0) as a CSS `scale()` transform on a fixed 560×412px canvas. The outer div shrinks to match the scaled dimensions so the extension popup window sizes correctly.

**Header** (stateful via props): Fiat currency select (USD/AUD/ZAR — EUR commented out pending API migration), transaction type select (all 6 from TX_OPTIONS), animated spot price via `CountUp`. Gas speed select is currently commented out.

**Body** (read-only):
- `BlockSection`: block number, ETH/BTC, tx count, base fee, gas used, capacity (%), block size (kB)
- `CardsSection`: maps `CARD_META` (Fast/Average/Slow) → `PriceCard`. For each card: `gasPrice = basefee + priorityFee[speed]`, then `gasPriceToFiat(gasPrice, gasUnits, spotRate)` → `[belowCentThreshold, fiatCost]`
- `gasPriceToFiat` and `clean` are imported from `src/shared/utils.ts` (not defined locally)

---

### Vite Build Pipeline

**Responsibility**: Two separate build configurations for dev and production.

**Dev** (`vite.config.dev.ts`, `npm run dev`): Uses `@crxjs/vite-plugin` which injects HMR into the extension. Reads `manifest.dev.json`. Outputs to `dist-dev/`. Configures CORS for `chrome-extension://` origins. Loads `logos/dev.png` as the icon source.

**Production** (`vite.config.ts`, `npm run build:prod`): Rollup with two entry points — `index.html` (popup) and `src/background/index.ts` (service worker, output as `background.js`). Generates icons at build start via `sharp` (16/32/48/128px PNGs + favicon.ico). Outputs to `dist/`.

**Packaging** (`npm run package`): `scripts/package-extension.js` zips `dist/` into `chrome-package/<version>.zip` for Chrome Web Store upload.

## Data Flows

### Block arriving over WebSocket

```
WS message (BlockMessage JSON)
  → background: handleWsMessage()
  → if 'type' field present → ignore (legacy control message)
  → normaliseBlock() — cast to numbers, strip unused fields
  → compare block.number with cached — skip if same
  → setBlock(nextBlock) → chrome.storage.local { block }
  → setBadgeFromBlock() → chrome.action.setBadgeText (base fee string)
  → setConnection({ wsConnected: true, lastBlockAt: Date.now() })
  → popup: chrome.storage.onChanged fires
  → useExtensionState: handleStorageChange()
  → getStorageSnapshot() → setState()
  → Body re-renders with CountUp animations
```

### Spot rate fetch (every 1 minute)

```
chrome.alarms fires ('fetchAndSyncSpotRates')
  → fetchAndSyncSpotRates()
  → GET https://extension-api.gastly.tools/spot
  → normaliseSpots() — string values → numbers
  → setSpots(spots) → chrome.storage.local { spots }
  → setConnection({ backendReachable: true, lastSpotFetchAt: Date.now() })
  → if WS is CLOSED/CLOSING → connectBlockWs() (recovery path)
  → popup: storage change → Header SpotRate CountUp animates to new value
```

### User changes a preference

```
User selects fiat currency in Header
  → setPreference('fiatPreference', 'ethaud')
  → updatePreferences({ fiatPreference: 'ethaud' })
  → optimistic setState() → Header re-renders instantly
  → chrome.storage.local.set({ preferences: {...current, fiatPreference: 'ethaud'} })
  → storage.onChanged fires → handleStorageChange()
  → managePreferences() — validates, no repair needed
  → getStorageSnapshot() → setState() (confirms write)
```

## External Dependencies

| Name | Type | How Accessed | Owner |
|---|---|---|---|
| `extension-api.gastly.tools` | REST API + WebSocket | `fetch()` + `new WebSocket()` | `src/background/index.ts` |
| Chrome Extension API | Browser API | `chrome.*` globals | background + popup |

No database, no auth, no third-party analytics or tracking SDKs.

## Configuration and Environment

| Variable | Dev Value | Prod Value | Required |
|---|---|---|---|
| `VITE_API_HTTP_BASE` | `http://localhost:5001` | `https://extension-api.gastly.tools` | Yes |
| `VITE_API_WS_BASE` | `ws://localhost:5001` | `wss://extension-api.gastly.tools` | Yes |

Chrome permissions: `storage`, `alarms` (no `host_permissions` — all fetches go to the declared API only).

## Testing Strategy

Two suites:

**Unit (Jest + ts-jest)**: `tests/unit/` — covers pure functions in `src/shared/utils.ts` and `src/shared/storage.ts`. Uses `NODE_OPTIONS=--experimental-vm-modules` for ESM support. Config: `jest.config.cjs`, `tsconfig.test.json`. Run: `npm run test:unit`. 16 tests.

**E2E (Playwright)**: `tests/e2e/` — loads the real extension in Brave from `dist/` (production build only — CRXJS dev build breaks Playwright's navigation tracking). The fixture in `tests/e2e/fixtures.ts` blocks all HTTP and WebSocket calls to `extension-api.gastly.tools` at the browser context level. Storage is seeded per-test via `page.evaluate` inside the extension page, then the popup is reloaded for a clean React mount. Run: `npm run build:prod && npm run test:e2e`. 7 tests.

Full suite: `npm test` (unit → build → e2e).

## Key Design Decisions

- **Storage-as-IPC over message passing**: Background writes to `chrome.storage.local`; popup subscribes to `onChanged`. Avoids popup/background lifecycle coupling and eliminates the need to handle cases where one context isn't ready to receive messages.
- **Single background entrypoint**: All network logic lives in one file. Makes reconnect logic, alarm handling, and storage writes easy to trace without jumping between modules.
- **Two build configs**: `vite.config.dev.ts` uses CRXJS for HMR during development (output: `dist-dev/`); `vite.config.ts` is a clean production Rollup build (output: `dist/`). Keeps dev ergonomics without contaminating the prod bundle.
- **Optimistic preference updates**: `setPreference` updates React state before writing to storage. Eliminates perceived latency on select changes.
- **Preference repair system**: `managePreferences()` handles both cold-start (storage missing a field after an extension update) and live-session corruption. Merges from React state → storage → defaults in priority order.
- **`gasPreference` select commented out**: The active card highlight is driven by `gasPreference` but the UI control for changing it is currently disabled in `Header.tsx`.

## Known Debt and Open Questions

- `gasPreference` select is commented out in `Header.tsx` — user can't change gas speed tier from the UI despite the preference existing in storage.
- `etheur` fiat option is commented out in `FIAT_OPTIONS` with note "Only after API migration" — EUR spot price not yet available from the backend.
- Several `console.log` calls are commented out throughout (render counts, state snapshots) — debug instrumentation left in place.
- `Body` receives `block` and `spots` as non-optional but renders before data is guaranteed; non-null assertions (`!`) used in a few places.
- No CI config visible in the repo.
- Legacy `WSControlMessage` type and `type` field check in `handleWsMessage` is noted as removable once the server stops emitting control messages.

## Quick Command Reference

```bash
npm run dev               # CRXJS dev server → load dist-dev/ in Brave
npm run build:prod        # Production build → dist/
npm run lint              # ESLint
npm run package           # Zip dist/ → chrome-package/<version>.zip
npm run test:unit         # Jest unit tests (no build needed)
npm run test:unit:watch   # Jest in watch mode
npm run test:e2e          # Playwright e2e (requires prior build:prod)
npm run test:e2e:ui       # Playwright interactive UI runner
npm test                  # Full suite: unit → build:prod → e2e
npx playwright show-report  # Open HTML report after a run
```

Load unpacked extension in Brave: `brave://extensions` → Developer mode → Load unpacked → select `dist-dev/` (dev) or `dist/` (prod).
