import { DEFAULT_STATE } from './defaults';
import type { ExtensionState } from './types';

const STATE_KEY = 'state';

export async function getState(): Promise<ExtensionState> {
  const result = await chrome.storage.local.get(STATE_KEY);
  return (result[STATE_KEY] as ExtensionState) ?? DEFAULT_STATE;
}

export async function setState(state: ExtensionState): Promise<void> {
  await chrome.storage.local.set({ [STATE_KEY]: state });
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
