import { API_HTTP_BASE } from '../shared/env';
import { ensureDefaults, patchState } from '../shared/storage';

chrome.runtime.onInstalled.addListener(async () => {
  console.log('Extension installed');
  await ensureDefaults();
  await bootstrap();
});

chrome.runtime.onStartup.addListener(async () => {
  console.log('Extension started');
  await bootstrap();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'fetchSpotRates') {
    await fetchSpotRates();
  }
});

async function bootstrap() {
  await ensureDefaults();
  await chrome.alarms.create('fetchSpotRates', { periodInMinutes: 1 });

  await fetchInitialBlock();
  await fetchSpotRates();
}

async function fetchInitialBlock() {
  try {
    const res = await fetch(`${API_HTTP_BASE}/block`);
    const data = await res.json();
    console.log('Initial block:', data);

    await patchState({
      connection: {
        internetReachable: true,
        lastBlockAt: Date.now(),
      },
    });
  } catch (error) {
    console.error('Failed to fetch initial block', error);

    await patchState({
      connection: {
        internetReachable: false,
      },
    });
  }
}

async function fetchSpotRates() {
  try {
    const res = await fetch(`${API_HTTP_BASE}/spot`);
    const data = await res.json();
    console.log('Spot rates:', data);

    await patchState({
      connection: {
        internetReachable: true,
        lastSpotFetchAt: Date.now(),
      },
    });
  } catch (error) {
    console.error('Failed to fetch spots', error);
  }
}
