import { API_HTTP_BASE, API_WS_BASE } from '../shared/env';
import { ensureDefaults, getBlock, setBlock, setConnection, setSpots } from '../shared/storage';

import type {
  BlockMessage,
  NormalisedBlock,
  SpotPricesMessage,
  NormalisedSpotPrices,
  WsIncomingMessage,
} from '../shared/types';

let ws: WebSocket | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let bootstrapPromise: Promise<void> | null = null;

const SPOT_ALARM_NAME = 'fetchAndSyncSpotRates';
const WS_RECONNECT_DELAY_MS = 3_000;

/**
 * Some Notes:
 * - I need all these functions using void when called to be explained as to why they use void
 * - Maybe I need to also set an alarm to periodically check the ws connection (so that if there is an internet outage, that the wsConnected connection state variable is set to false)
 * - one thing i noticed is that net::ERR_INTERNET_DISCONNECTED can be something maybe useful to update connection state.
 * - the websocket client could fail for maybe two reasons (1. internet disconnected, 2. (maybe this is true) some unhealthy client-server ws connection). I need to ensure I cover both these cases
 */

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[onInstalled] bootstrapping...', details.reason);
  // void bootstrap();
  void runBootstrapOnce();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[onStartup] bootstrapping...');
  // void bootstrap();
  void runBootstrapOnce();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SPOT_ALARM_NAME) {
    void fetchAndSyncSpotRates();
  }
});

function runBootstrapOnce(): Promise<void> {
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = bootstrap().finally(() => {
    bootstrapPromise = null;
  });

  return bootstrapPromise;
}

async function bootstrap(): Promise<void> {
  await ensureDefaults();

  const cachedBlock = await getBlock();

  if (cachedBlock) {
    await setBadgeFromBlock(cachedBlock);
  } else {
    console.log('[bootstrap] no cached block found, requesting block over HTTP...');
    await fetchAndSyncLatestBlock();
  }

  await chrome.alarms.create(SPOT_ALARM_NAME, { periodInMinutes: 1 });

  void fetchAndSyncSpotRates();

  connectBlockWs();
}

async function fetchAndSyncLatestBlock(): Promise<void> {
  try {
    const res = await fetch(`${API_HTTP_BASE}/block`);

    if (!res.ok) {
      // backend reachable but returned error
      console.error('HTTP /block Backend returned error', res.status);
      await setConnection({
        backendReachable: true,
      });

      return;
      // throw new Error(`HTTP /block ${res.status}`);
    }

    const raw: BlockMessage = await res.json();
    const block = normaliseBlock(raw);
    console.log('HTTP /block (post-normalised)', block);

    await setBlock(block);
    await setConnection({
      backendReachable: true,
      lastBlockAt: Date.now(),
    });
    await setBadgeFromBlock(block);
  } catch (error) {
    console.error('Failed to complete fetch and sync of latest block', error);

    await setConnection({
      backendReachable: false,
    });
  }
}

async function fetchAndSyncSpotRates(): Promise<void> {
  try {
    const res = await fetch(`${API_HTTP_BASE}/spot`);

    if (!res.ok) {
      // backend reachable but returned error
      console.error('HTTP /spot Backend returned error', res.status);
      await setConnection({
        backendReachable: true,
      });

      return;
      // throw new Error(`HTTP /spot ${res.status}`);
    }

    const raw: SpotPricesMessage = await res.json();
    const spots = normaliseSpots(raw);
    console.log('HTTP /spot (post-normalised)', spots);

    await setSpots(spots);
    await setConnection({
      backendReachable: true,
      lastSpotFetchAt: Date.now(),
    });

    // using the periodic spot fetch as a recovery signal
    // tells me if HTTP works again, maybe the network is back, maybe the backend is back
    // and so can try restore websocket
    if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
      connectBlockWs();
    }
  } catch (error) {
    console.error('Failed to complete fetch and sync of spot rates', error);

    await setConnection({
      backendReachable: false,
    });
  }
}

function connectBlockWs(): void {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  ws = new WebSocket(`${API_WS_BASE}/block`);

  ws.onopen = () => {
    void handleWsOpen(); // why void all these event handlers? Find out
  };

  ws.onmessage = (event) => {
    void handleWsMessage(event);
  };

  ws.onclose = () => {
    handleWsClose();
  };

  ws.onerror = () => {
    ws?.close();
  };
}

async function handleWsOpen(): Promise<void> {
  clearReconnectTimer();

  await setConnection({
    wsConnected: true,
    backendReachable: true,
  });
}

async function handleWsMessage(event: MessageEvent<string>): Promise<void> {
  // treat parsed as a value that has all the fields of BlockMessage and may also have an optional type field
  const parsed = JSON.parse(event.data) as WsIncomingMessage;
  // [Dealing with legacy API, won't be needed once i remove this from server in future] - ignore non-block payloads if server emits control messages
  if ('type' in parsed) return;

  const nextBlock = normaliseBlock(parsed);
  console.log('ws /block (post-normalised)', nextBlock);
  const currentBlock = await getBlock();

  // Will leave this sanity check in for now, even if its not req89red (see development notes)
  if (currentBlock?.number === nextBlock.number) {
    return;
  }

  await setBlock(nextBlock);
  await setBadgeFromBlock(nextBlock);
  await setConnection({
    wsConnected: true,
    backendReachable: true,
    lastBlockAt: Date.now(),
  });
}

async function handleWsClose(): Promise<void> {
  ws = null;

  await setConnection({
    wsConnected: false,
  });

  scheduleReconnect();
}

function scheduleReconnect(): void {
  if (reconnectTimeout) return;

  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    connectBlockWs();
  }, WS_RECONNECT_DELAY_MS);
}

function clearReconnectTimer(): void {
  if (!reconnectTimeout) return;

  clearTimeout(reconnectTimeout);
  reconnectTimeout = null;
}

async function setBadgeFromBlock(block: Pick<NormalisedBlock, 'basefee'>): Promise<void> {
  console.log('Basefee badge', block.basefee);
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
function normaliseBlock(raw: BlockMessage): NormalisedBlock {
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

function normaliseSpots(raw: SpotPricesMessage): NormalisedSpotPrices {
  const normalised: NormalisedSpotPrices = {};

  for (const [ticker, value] of Object.entries(raw)) {
    normalised[ticker] = Number(value);
  }

  return normalised;
}
