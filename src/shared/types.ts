import { TX_OPTIONS } from './config';

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

// will remove once legacy api is deprecated
type WSControlMessage = {
  type: string;
};

export type WsIncomingMessage = BlockMessage | WSControlMessage;

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

// When adding new preferences (need to add type here, then update Preferences below, then update default preferences in storage.ts, update preferencesNeedRepair() method in storage.ts to check for new preference, then update extension hook
export type GasSpeed = 'fast' | 'average' | 'slow';
export type FiatPreference = 'ethusd' | 'ethzar' | 'etheur' | 'ethaud';
// To add new transaction options -> update the src/shared/config.ts file
export type TransactionPreference = keyof typeof TX_OPTIONS;
export type AppScale = 0.7 | 0.8 | 0.9 | 1;

export type Preferences = {
  gasPreference: GasSpeed;
  fiatPreference: FiatPreference;
  transactionPreference: TransactionPreference;
  appScalePreference: AppScale;
};

export type ConnectionState = {
  wsConnected: boolean;
  backendReachable: boolean;
  lastSpotFetchAt?: number;
  lastBlockAt?: number;
};

export type ExtensionState = {
  block?: NormalisedBlock;
  spots?: NormalisedSpotPrices;
  preferences: Preferences;
  connection: ConnectionState;
};
