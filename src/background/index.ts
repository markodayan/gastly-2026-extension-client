import { API_HTTP_BASE, API_WS_BASE } from '../shared/env';
import { ensureDefaults, getBlock, setBlock, setConnection, setSpots } from '../shared/storage';

import type {
  BlockMessage,
  NormalisedBlock,
  SpotPricesMessage,
  NormalisedSpotPrices,
} from '../shared/types';

let ws: WebSocket | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

const SPOT_ALARM_NAME = 'fetchAndSyncSpotRates';
const WS_RECONNECT_DELAY_MS = 3_000;

/**
 * Some Notes:
 * - I need all these functions using void when called to be explained as to why they use void
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('[onInstalled] bootstrapping...');
  void bootstrap();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[onStartup] bootstrapping...');
  void bootstrap();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SPOT_ALARM_NAME) {
    void fetchAndSyncSpotRates();
  }
});

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

  // Fetch spotsonce on boot so the popup can get data quickly
  void fetchAndSyncSpotRates();

  connectBlockWs();
}

async function fetchAndSyncLatestBlock(): Promise<void> {
  try {
    const res = await fetch(`${API_HTTP_BASE}/block`);

    if (!res.ok) {
      throw new Error(`HTTP /block ${res.status}`);
    }

    const raw: BlockMessage = await res.json();
    const block = normaliseBlock(raw);
    console.log('HTTP /block (post-normalised)', block);

    await setBlock(block);
    await setConnection({
      wsConnected: false, // am I sure about this? maybe I should remove this?
      internetReachable: true,
      lastBlockAt: Date.now(),
    });
    await setBadgeFromBlock(block);
  } catch (error) {
    console.error('Failed to complete fetch and sync of latest block', error);

    // What if not a network-related error? (maybe need to investigate this state change)
    await setConnection({
      wsConnected: false, // why am I setting wsConnected here? Its not related to anything
      internetReachable: false, // maybe this should rather be apiReachable? or api_http_reachable or something like that. Connection state can be improved - im obviously wanting to check internet is accessible, then after that its about checking if am connected to websocket server of backend as well as checking whether my designated http routes are successful whenever they fire (need to think about these things). But maybe everything is good as it is.
    });
  }
}

async function fetchAndSyncSpotRates(): Promise<void> {
  try {
    const res = await fetch(`${API_HTTP_BASE}/spot`);

    if (!res.ok) {
      throw new Error(`HTTP /spot ${res.status}`);
    }

    const raw: SpotPricesMessage = await res.json();
    const spots = normaliseSpots(raw);
    console.log('HTTP /spot (post-normalised)', spots);

    await setSpots(spots);
    await setConnection({
      internetReachable: true,
      lastSpotFetchAt: Date.now(),
    });

    // does this really belong here? Maybe I should set another alarm for it instead
    if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
      connectBlockWs();
    }
  } catch (error) {
    console.error('Failed to complete fetch and sync of spot rates', error);

    await setConnection({
      internetReachable: false, // again, need to be sure it is because of network failure
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
    internetReachable: true,
  });
}

async function handleWsMessage(event: MessageEvent<string>): Promise<void> {
  const parsed = JSON.parse(event.data) as BlockMessage & { type?: string }; // what does this type expression mean with & operation?

  // [Dealing with legacy API, won't be needed once i remove this from server in future] - ignore non-block payloads if server emits control messages
  if (parsed.type) return;

  const nextBlock = normaliseBlock(parsed);
  console.log('ws /block (post-normalised)', nextBlock);
  const currentBlock = await getBlock();

  // is this even necessary? It assumes my entire server-side block pipeline is not event-driven by new block heads, so I don't even now if this is worth checking nor the above step of fetching the currentBlock from storage.
  if (currentBlock?.number === nextBlock.number) {
    return;
  }

  await setBlock(nextBlock);
  await setBadgeFromBlock(nextBlock);
  await setConnection({
    wsConnected: true,
    internetReachable: true,
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
