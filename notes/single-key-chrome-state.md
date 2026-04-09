`src/background/index.ts`

```typescript
import { API_HTTP_BASE, API_WS_BASE } from '../shared/env';
import { getState, patchState, ensureDefaults } from '../shared/storage';
import type { BlockMessage, NormalisedBlock, NormalisedSpotPrices } from '../shared/types';

let ws: WebSocket | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

// This runs for install/update cases
chrome.runtime.onInstalled.addListener(async () => {
  await bootstrap();
});

// this runs when the profile starts up (Note: it doesn't fire in the scenario that an install occurs)
chrome.runtime.onStartup.addListener(async () => {
  await bootstrap();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'fetchAndSyncSpotRates') {
    await fetchAndSyncSpotRates();
  }
});

/**
 * Ensures defaults for keys thatneed defaults
 * Read cached block
 * If cached block exists, use it immediately for badge
 * Otherwise fetch initial block
 * Schedule alarm
 * Connect websocket
 */
async function bootstrap() {
  await ensureDefaults();

  const state = await getState();

  if (state.block) {
    await setBadgeFromBlock(state.block);
  } else {
    await fetchAndSyncLatestBlock();
  }

  await chrome.alarms.create('fetchAndSyncSpotRates', { periodInMinutes: 1 });
  connectBlockWs();
}

async function fetchAndSyncLatestBlock() {
  try {
    const res = await fetch(`${API_HTTP_BASE}/block`);

    if (!res.ok) {
      throw new Error(`HTTP /block ${res.status}`);
    }

    const block = await res.json();
    const normalisedBlock = normaliseBlock(block);

    await patchState({
      block: normalisedBlock,
      connection: {
        wsConnected: false,
        internetReachable: true,
        lastBlockAt: Date.now(),
      },
    });

    await setBadgeFromBlock(normalisedBlock);
  } catch (error) {
    console.error('Block fetch failed', error);

    await patchState({
      connection: {
        wsConnected: false,
        internetReachable: false,
      },
    });
  }
}

async function fetchAndSyncSpotRates() {
  try {
    const res = await fetch(`${API_HTTP_BASE}/spot`);

    if (!res.ok) {
      throw new Error(`HTTP /spot ${res.status}`);
    }

    const spots = await res.json();
    const state = await getState();

    await patchState({
      spots: normaliseSpotPrices(spots),
      connection: {
        ...state.connection,
        internetReachable: true,
        lastSpotFetchAt: Date.now(),
      },
    });

    if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
      connectBlockWs();
    }
  } catch (error) {
    console.error('Spot fetch failed', error);

    const state = await getState();

    await patchState({
      connection: {
        ...state.connection,
        internetReachable: false,
      },
    });
  }
}

function connectBlockWs() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  ws = new WebSocket(`${API_WS_BASE}/block`);

  ws.onopen = async () => {
    const state = await getState();
    await patchState({
      connection: {
        ...state.connection,
        wsConnected: true,
        internetReachable: true,
      },
    });
  };

  ws.onmessage = async (event) => {
    const block = JSON.parse(event.data);

    // If not expected block payload message return immediately
    if (block.type) return;

    const normalisedBlock = normaliseBlock(block);

    console.log(normalisedBlock);

    const state = await getState();

    if (state.block?.number === block.number) return;
    await patchState({
      block: normalisedBlock,
      connection: {
        ...state.connection,
        wsConnected: true,
        lastBlockAt: Date.now(),
      },
    });

    await setBadgeFromBlock(normalisedBlock);
  };

  ws.onclose = async () => {
    const state = await getState();
    await patchState({
      connection: {
        ...state.connection,
        wsConnected: false,
      },
    });
    ws = null;
    scheduleReconnect();
  };

  ws.onerror = () => {
    ws?.close();
  };
}

function scheduleReconnect() {
  if (reconnectTimeout) return;

  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    connectBlockWs();
  }, 3000);
}

async function setBadgeFromBlock(block: NormalisedBlock) {
  console.log('basefee to be badge', block.basefee);
  await chrome.action.setBadgeText({
    text: String(block.basefee),
  });
}

/**
 * Filters non-needed fields of blocks (also would be where you would do client-side additional transformations on a block received from server)
 * This is also probably where the migration adaptor logic will exist to protect against breaking changes
 * @param raw
 * @returns
 */
function normaliseBlock(raw: BlockMessage) {
  return {
    gasLimit: Number(raw.gasLimit),
    gasUsed: Number(raw.gasUsed),
    number: Number(raw.number),
    size: Number(raw.size),
    gasUtilizationRatio: Number(raw.gasUtilizationRatio),
    txCount: Number(raw.txCount),
    basefee: Number(raw.basefee),
    priorityFees: {
      fast: Number(raw.priorityFees.fast),
      average: Number(raw.priorityFees.average),
      slow: Number(raw.priorityFees.slow),
    },
  };
}

function normaliseSpotPrices(payload: { [ticker: string]: string }): NormalisedSpotPrices {
  const normalised: NormalisedSpotPrices = {};

  for (const ticker in payload) {
    normalised[ticker] = Number(payload[ticker]);
  }

  return normalised;
}
```

`src/shared/storage.ts`

```typescript
import type { ExtensionState } from './types';

// const STATE_KEY = 'state';
const DEFAULT_STATE: ExtensionState = {
  preferences: {
    gasPreference: 'fast',
    fiatPreference: 'ethusd',
    transactionPreference: 'eth-send',
  },
  connection: {
    wsConnected: false,
    internetReachable: true,
  },
};

export async function getState(): Promise<ExtensionState> {
  const result = await chrome.storage.local.get('state');
  return (result.state as ExtensionState) ?? DEFAULT_STATE;
}

export async function setState(state: ExtensionState): Promise<void> {
  await chrome.storage.local.set({ state });
}

export async function patchState(partial: Partial<ExtensionState>): Promise<void> {
  const current = await getState();

  const next: ExtensionState = {
    ...current,
    ...partial,
    preferences: {
      ...current.preferences,
      ...partial.preferences,
    },
    connection: {
      ...current.connection,
      ...partial.connection,
    },
  };

  await setState(next);
}

export async function ensureDefaults(): Promise<void> {
  const current = await getState();

  await setState({
    ...DEFAULT_STATE,
    ...current,
    preferences: {
      ...DEFAULT_STATE.preferences,
      ...current.preferences,
    },
    connection: {
      ...DEFAULT_STATE.connection,
      ...current.connection,
    },
  });
}
```

`src/shared/types.ts`

```typescript
/**
 * Legacy API block type
 */
export type BlockMessage = {
  gasLimit: number;
  gasUsed: number;
  nonce?: number;
  number: number;
  size: number;
  timestamp?: string;
  uncles?: string[];
  gasUtilizationRatio: number;
  txCount: number;
  basefee: number;
  priorityFees: {
    fast: number;
    average: number;
    slow: number;
  };
};

/**
 * Legacy API spot data type (will parse price to number)
 */
export type SpotPricesMessage = {
  [ticker: string]: string;
};

/**
 * Data that will be written to storage under key 'spots' that will be fetched by popup
 */
export type NormalisedSpotPrices = {
  [ticker: string]: number;
};

/**
 * Data that will be written to storage under key 'block' that will be fetched by popup
 */
export type NormalisedBlock = {
  gasLimit: number;
  gasUsed: number;
  number: number;
  size: number;
  gasUtilizationRatio: number;
  txCount: number;
  basefee: number;
  priorityFees: {
    fast: number;
    average: number;
    slow: number;
  };
  updatedAt?: number;
};

export type GasSpeed = 'fast' | 'average' | 'slow';
export type FiatPreference = 'ethusd' | 'ethzar' | 'etheur' | 'ethaud';
export type TransactionPreference = 'eth-send';

export type Preferences = {
  gasPreference: GasSpeed;
  fiatPreference: FiatPreference;
  transactionPreference: TransactionPreference;
};

export type ConnectionState = {
  wsConnected: boolean;
  internetReachable: boolean;
  lastSpotFetchAt?: number;
  lastBlockAt?: number;
};

export type ExtensionState = {
  block?: NormalisedBlock;
  spots?: NormalisedSpotPrices;
  preferences: Preferences;
  connection: ConnectionState;
};
```
