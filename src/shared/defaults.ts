import type { ExtensionState } from './types';

export const DEFAULT_STATE: ExtensionState = {
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
