export type GasSpeed = 'fast' | 'average' | 'slow';
export type FiatPreference = 'ethusd' | 'ethzar' | 'etheur' | 'ethaud';
export type TransactionPreference = 'eth-send';

/**
 * Legacy API block type
 */
export type BlockData = {
  gasLimit: number;
  gasUsed: number;
  nonce: number;
  number: number;
  size: number;
  timestamp: string;
  uncles: string[];
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
 * Legacy API spot data type
 */
export type SpotData = {
  [ticker: string]: string;
};

/**
 * Updated API block type
 */
// export type BlockData = {
//   gasLimit: number;
//   gasUsed: number;
//   nonce: number;
//   number: number;
//   size: number;
//   timestamp: string;
//   uncles: string[];
//   gasUtilizationRatio: number;
//   txCount: number;
//   basefee: number;
//   priorityFees: {
//     fast: number;
//     average: number;
//     slow: number;
//   };
// };

/**
 * Updated API spot data type
 */
// export type SpotData = {
//   [ticker: string]: number;
// }

export type Preferences = {
  gasPreference: GasSpeed;
  fiatPreference: FiatPreference;
  transactionPreference: TransactionPreference;
};

export type ConnectionState = {
  wsConnected?: boolean;
  internetReachable: boolean;
  lastSpotFetchAt?: number;
  lastBlockAt?: number;
};

export type ExtensionState = {
  block?: BlockData;
  spots?: SpotData;
  preferences: Preferences;
  connection: ConnectionState;
};
