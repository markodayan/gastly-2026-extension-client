import { API_HTTP_BASE, API_WS_BASE } from '../shared/env';
import { getState, patchState, ensureDefaults } from '../shared/storage';
import type { BlockData } from '../shared/types';

let ws: WebSocket | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

chrome.runtime.onInstalled.addListener(async () => {
  await bootstrap();
});

chrome.runtime.onStartup.addListener(async () => {
  await bootstrap();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'fetchSpotRates') {
    await fetchSpotRates();
  }
});

async function bootstrap() {
  await ensureDefaults();

  const state = await getState();

  if (state.block) {
    await setBadgeFromBlock(state.block);
  } else {
    await fetchInitialBlock();
  }

  await chrome.alarms.create('fetchSpotRates', { periodInMinutes: 1 });
  connectBlockWs();
}

async function fetchInitialBlock() {
  try {
    const res = await fetch(`${API_HTTP_BASE}/block`);

    if (!res.ok) {
      throw new Error(`HTTP /block ${res.status}`);
    }

    const data = await res.json();

    await patchState({
      block: normaliseBlock(data),
      connection: {
        wsConnected: false,
        internetReachable: true,
        lastBlockAt: Date.now(),
      },
    });

    await setBadgeFromBlock(data);
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

async function fetchSpotRates() {
  try {
    const res = await fetch(`${API_HTTP_BASE}/spot`);

    if (!res.ok) {
      throw new Error(`HTTP /spot ${res.status}`);
    }

    const spots = await res.json();
    const state = await getState();

    await patchState({
      spots,
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

    const normalised = normaliseBlock(block);

    console.log(normalised);

    const state = await getState();

    if (state.block?.number === block.number) return;
    await patchState({
      block: normalised,
      connection: {
        ...state.connection,
        wsConnected: true,
        lastBlockAt: Date.now(),
      },
    });

    await setBadgeFromBlock(block);
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

async function setBadgeFromBlock(block: BlockData) {
  console.log('basefee to be badge', block.basefee);
  await chrome.action.setBadgeText({
    text: String(block.basefee),
  });
}

function normaliseBlock(raw: BlockData) {
  return {
    gasLimit: Number(raw.number),
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
    updatedAt: Date.now(),
  };
}
