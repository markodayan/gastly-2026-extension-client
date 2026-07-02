# Gastly — Ethereum Gas Tracker Chrome Extension

## What it does
A Chrome extension that displays real-time Ethereum gas prices and fiat-denominated transaction cost estimates in the browser toolbar badge and popup.

---

## Architecture

**Two runtime contexts:**

1. **Background service worker** (`src/background/index.ts`)
   - Runs persistently in the browser background
   - Connects to a WebSocket (`/block`) for live block data; falls back to HTTP on disconnect
   - Polls a REST endpoint (`/spot`) every minute via `chrome.alarms` for ETH spot prices (USD, AUD, ZAR)
   - Writes normalized data to `chrome.storage.local` (keys: `block`, `spots`, `connection`, `preferences`)
   - Updates the toolbar badge with the current base fee in Gwei
   - Auto-reconnects the WS every 3s if it drops; also uses the periodic spot fetch as a WS recovery signal

2. **Popup UI** (`src/popup/`)
   - React 19 + Tailwind v4, built with Vite + `@crxjs/vite-plugin`
   - Reads from `chrome.storage.local` on open and subscribes to `chrome.storage.onChanged` for live updates
   - `useExtensionState` hook owns all state, handles preference repair/migration, and exposes `setPreference`

---

## Data Flow

```
Backend API
  ├── WS /block  ──▶ background.ts ──▶ chrome.storage.local { block }
  └── HTTP /spot ──▶ background.ts ──▶ chrome.storage.local { spots }

chrome.storage.local
  └──▶ useExtensionState (popup)
         ├──▶ Header   (fiat/tx/gas preference selects, spot price)
         └──▶ Body
               ├── BlockSection  (block number, base fee, gas used, capacity, tx count, ETH/BTC)
               └── CardsSection  (Fast / Average / Slow gas cards with Gwei price + fiat fee)
```

---

## Key Files

| File | Role |
|---|---|
| `src/shared/types.ts` | All TypeScript types (`NormalisedBlock`, `Preferences`, `ExtensionState`, etc.) |
| `src/shared/config.ts` | `TX_OPTIONS` — transaction types with gas unit estimates |
| `src/shared/storage.ts` | All `chrome.storage.local` read/write helpers + preference repair logic |
| `src/shared/env.ts` | API base URLs from `.env` files |
| `src/background/index.ts` | Service worker — WS + HTTP data sync, badge updates |
| `src/popup/hooks/useExtensionState.ts` | Central React state hook with storage change listener |
| `src/popup/components/Body.tsx` | `gasPriceToFiat()` converts Gwei + gas units + spot rate → fiat cost |

---

## User Preferences

Four persisted preferences: `gasPreference` (fast/avg/slow), `fiatPreference` (USD/AUD/ZAR), `transactionPreference` (eth-send, CowSwap swap, AAVE deposit/withdraw, Across bridge), `appScalePreference` (70%–100% zoom). The storage module includes a repair/migration path for when preferences are missing or incomplete.
