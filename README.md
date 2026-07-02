# Gastly Extension Client

> Real-time Ethereum gas prices, per-transaction fiat fee estimates, and live spot prices — delivered block-by-block, straight to your Chrome toolbar.

---

## What it does

Gastly is a Chrome extension (Manifest V3) that surfaces Ethereum gas data at a glance.

- The **toolbar badge** updates with the current base fee in Gwei every time a new block arrives.
- The **popup** shows the full picture: block metrics, ETH/BTC spot, and three gas speed cards (Fast / Average / Slow) with real-time fiat fee estimates for whichever transaction type you care about.
- Data arrives via **WebSocket**, so there's no polling — updates land within milliseconds of each new block.

Leverages MV3. Follows a storage-first model.
This application contains two primary components:

1. <b>Service Worker</b>
2. <b>Popup Application</b>

- Service worker talks to the network
- Popup talks to `chrome.storage.local`
- Popup subscribes to storage changes
- Badge is controlled by the worker

---

## Architecture

Gastly is built around two contexts that never communicate directly with each other.

```
┌─────────────────────────────────────────────────────────────┐
│                   Background Service Worker                  │
│                                                             │
│  WebSocket (/block) ─────────────────────────────────────► │
│                      normalise → chrome.storage.local.set   │
│  HTTP (/spot) every 60s ──────────────────────────────────► │
│                      normalise → chrome.storage.local.set   │
│                                                             │
│  chrome.action.setBadgeText (base fee in Gwei)              │
└────────────────────────────┬────────────────────────────────┘
                             │
                   chrome.storage.local
                   (block, spots, preferences, connection)
                             │
┌────────────────────────────▼────────────────────────────────┐
│                       Popup (React)                          │
│                                                             │
│  useExtensionState ◄── chrome.storage.onChanged             │
│       │                                                     │
│       ├── Header (fiat select, tx select, spot rate)        │
│       └── Body (block metrics + gas speed cards)            │
└─────────────────────────────────────────────────────────────┘
```

### Storage-First IPC

The single most important architectural decision: **`chrome.storage.local` is the message bus**. The background service worker writes to storage; the popup subscribes to `chrome.storage.onChanged`. No `chrome.runtime.sendMessage`. No port connections.

This means:

- The popup doesn't need to be open for data to be collected and kept fresh.
- When the popup opens cold, it reads a fully-populated snapshot and renders immediately.
- The two contexts are completely decoupled — neither needs to know if the other is running.

### Storage Schema

Four keys live in `chrome.storage.local`:

| Key           | Type                   | Written by | Read by           | Purpose                                 |
| ------------- | ---------------------- | ---------- | ----------------- | --------------------------------------- |
| `block`       | `NormalisedBlock`      | background | popup, background | Latest Ethereum block data              |
| `spots`       | `NormalisedSpotPrices` | background | popup             | ETH spot prices (USD, AUD, ZAR, BTC)    |
| `preferences` | `Preferences`          | popup      | popup, background | User preferences (fiat, tx type, scale) |
| `connection`  | `ConnectionState`      | background | popup             | WebSocket and HTTP reachability state   |

The `NormalisedBlock` shape strips unused fields from the raw API response (no `timestamp`, `uncles`, `nonce`) and casts all values to numbers. The `NormalisedSpotPrices` shape does the same for string prices from the spot endpoint.

### Service Worker

`src/background/index.ts` is the sole owner of all network I/O. On startup it:

1. Calls `ensureDefaults()` to write initial preferences and connection state if they're missing.
2. Checks storage for a cached block — if found, sets the badge immediately; if not, fires an HTTP `GET /block` fallback.
3. Creates a `chrome.alarms` alarm to poll `GET /spot` every 60 seconds.
4. Opens the WebSocket to `WSS /block`.

Each new WS message normalises the block, writes it to storage, and updates the badge. The periodic spot poll doubles as a WebSocket health signal — if HTTP works but the socket is closed, it triggers a reconnect attempt.

### Popup State Hook

`useExtensionState` in `src/popup/hooks/useExtensionState.ts` is the single source of truth for the popup. It:

- Reads a full storage snapshot on mount and applies preference repair if any key is missing.
- Subscribes to `chrome.storage.onChanged` and merges incoming changes into React state.
- Exposes `setPreference(key, value)` which applies an **optimistic React state update immediately**, then writes to storage asynchronously — so UI controls feel instant.

### Preference Repair

User preferences can end up missing or partial after an extension update that adds a new preference key. `managePreferences()` in `storage.ts` handles both cases:

- **Cold-start repair**: on popup open, merges whatever's in storage with defaults.
- **Live-session repair**: on any preference storage change, merges React state → storage → defaults in priority order and writes back.

This ensures the popup always has valid, complete preferences — no null checks scattered through components.

---

## Tech Stack

| Item         | Detail                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------ |
| Language     | TypeScript ~5.8                                                                                        |
| UI Framework | React 19, Tailwind CSS v4                                                                              |
| Build Tool   | Vite 7                                                                                                 |
| Dev HMR      | `@crxjs/vite-plugin` (injects HMR into extension)                                                      |
| Animation    | `react-countup` (all numeric values count up on change)                                                |
| Icons        | Generated at build time via `sharp` + `png-to-ico`                                                     |
| Chrome API   | Manifest V3 — `storage`, `alarms`, `action` permissions                                                |
| Data Sources | `wss://extension-api.gastly.tools/block` (WebSocket), `https://extension-api.gastly.tools/spot` (HTTP) |

No analytics. No tracking. No external dependencies at runtime beyond the Gastly API.

---

## Project Structure

```
gastly-2026-extension-client/
  src/
    background/
      index.ts              # Service worker — all network I/O, badge, WS reconnect
    popup/
      App.tsx               # Root component, scale transform, settings panel
      main.tsx              # React DOM mount
      components/
        Header.tsx          # Fiat/tx selectors, animated spot price
        Body.tsx            # Block metrics, gas speed cards, fee calculations
      hooks/
        useExtensionState.ts # Central state hook, storage sync, optimistic updates
      index.css             # Tailwind entry
    shared/
      types.ts              # All TypeScript types (NormalisedBlock, Preferences, etc.)
      config.ts             # TX_OPTIONS — transaction types and gas unit estimates
      storage.ts            # chrome.storage.local helpers, preference repair
      env.ts                # API URL constants from Vite env vars
  public/
    manifest.json           # Production MV3 manifest (v2.0.4)
  manifest.dev.json         # Dev manifest (used by CRXJS)
  vite.config.ts            # Production build (→ dist/)
  vite.config.dev.ts        # Dev build with CRXJS HMR (→ dist-dev/)
  scripts/
    package-extension.js    # Zips dist/ → chrome-package/<version>.zip
    generate-icons.js       # Standalone icon generator
  chrome-package/           # Versioned .zip files for Chrome Web Store uploads
  notes/                    # Changelog, deployment notes, dev notes
```

---

## Features

### Live Badge

The extension action badge always shows the current base fee. No need to open the popup to know whether gas is high or low.

### Gas Speed Cards

Three cards — Fast, Average, Slow — each showing:

- Total gas price (base fee + priority fee) in Gwei
- Base fee and priority fee breakdown
- Estimated fiat cost for your selected transaction type

### Transaction Type Selector

Choose the transaction type that matches what you're about to do and the fee estimates update instantly. Supported types:

| Transaction                    | Gas Units |
| ------------------------------ | --------- |
| Send ETH                       | 21,000    |
| Swap (CowSwap)                 | 250,000   |
| Deposit (AAVE Umbrella)        | 370,000   |
| Withdraw (AAVE Umbrella)       | 310,000   |
| Claim Interest (AAVE Umbrella) | 183,000   |
| Bridge Asset (Across)          | 120,000   |

### Fiat Currency Support

Pick your home currency: **USD**, **AUD**, or **ZAR**. The spot price, fee cards, and ETH/BTC metric all reflect your selection.

### Block Metrics Panel

Every block brings: block number, ETH/BTC rate, transaction count, base fee, gas used, capacity (%), and block size (kB) — all with smooth count-up animations.

### Scalable UI

The popup can be scaled from 70% to 100% via the settings gear. The preference persists across sessions.

---

## Extending the Extension

### Adding a transaction type

Edit `src/shared/config.ts` only — add a new entry to `TX_OPTIONS` with an `id`, `label`, and `gasUnits`. The TypeScript type (`TransactionPreference`) is derived automatically from the object keys, and the transaction selector in the popup picks it up without any other changes.

### Adding a preference

1. Add the type to `src/shared/types.ts`
2. Add a default to `DEFAULT_PREFERENCES` in `src/shared/storage.ts`
3. Add the key check to `preferencesNeedRepair()` in `src/shared/storage.ts`
4. Consume it in `useExtensionState`

The repair system will handle existing installations automatically.

---

## Getting Started

### Prerequisites

- Node.js 18+
- Chrome (or Chromium-based browser)

### Install

```bash
npm install
```

### Development (hot-reload)

```bash
npm run dev
```

This starts the CRXJS dev server with HMR. Load the extension from `dist-dev/` in Chrome:

1. Navigate to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select `dist-dev/`

The extension will hot-reload whenever you save a file. You can leave it loaded between sessions — just run `npm run dev` again when you want to resume.

### Production Build

```bash
npm run build:prod
```

Outputs to `dist/`. Generates icons (16/32/48/128px PNG + favicon.ico) as part of the build.

### Package for Chrome Web Store

Update the version in `public/manifest.json`, then:

```bash
npm run build:prod
npm run package
```

This produces `chrome-package/<version>.zip`, ready for upload to the Chrome Web Store.

### Lint

```bash
npm run lint
```

### Testing

Tests use [Playwright](https://playwright.dev/) and run against the **production build** in `dist/`. The CRXJS dev build has HMR machinery that conflicts with Playwright's navigation tracking, so tests are reserved for the production artifact — which is also what gets shipped.

**Workflow:**
```bash
npm run build:prod   # build the production extension into dist/
npm test             # run all Playwright tests
```

**Other test commands:**
```bash
npm run test:ui      # open Playwright's interactive UI runner
npm run test:headed  # run tests in a visible browser window
npx playwright test --grep "Fast card"   # run a single test by name
npx playwright show-report               # open the HTML report after a run
```

Tests are in `tests/e2e/`. The fixture in `tests/e2e/fixtures.ts` launches Brave (falling back to Playwright's bundled Chromium), loads the extension from `dist/`, and blocks all live API calls so the service worker can't overwrite seeded test data.

---

## Environment

| Variable             | Dev                     | Production                           |
| -------------------- | ----------------------- | ------------------------------------ |
| `VITE_API_HTTP_BASE` | `http://localhost:5001` | `https://extension-api.gastly.tools` |
| `VITE_API_WS_BASE`   | `ws://localhost:5001`   | `wss://extension-api.gastly.tools`   |

Set in `.env.development` and `.env.production` at the project root.

---

## Chrome Permissions

Gastly requests the minimum permissions needed to function:

- `storage` — read/write `chrome.storage.local` for the IPC bus and preferences
- `alarms` — periodic spot price polling every 60 seconds

No `host_permissions`. No `tabs`. No broad access to browsing activity.

---

<br>
<br>
<br>

# Development Guide

## Working in development mode

Development mode leverages CRXJS to provide a hot-reload dev setup for working on the browser app without needing to manually rebuild everytime you make changes. It depends on its own manifest file and build configs:

- Development manifest file at `manifest.dev.json`
- Development Vite config file at `vite.config.dev.ts`

All you do now is run `npm run dev`.
From here you can simply load the unpacked file on your browser extension page and get to work.

> You can leave the unpacked extension in your browser extensions if you want. Just remember to run `npm run dev` to generate the dev server once you want to work on development again.

## Building Production App

The build of the production application depends on:

- The production manifest file at `public/manifest.json`
- The Vite config file for production at `vite.config.ts`

Before you build your application make sure the app version number in `public/manifest.json` is the latest version and follows the previous latest version. Once you update that, you can proceed.

From here you can run `npm run build:prod`, which will build the extension application into the `/dist` directory.

Now you can run `npm run package` which will build the required zip file (with the name of the file being the app version that was built).

Upload the `<version_number>.zip` file to the Chrome Extension App Store.
