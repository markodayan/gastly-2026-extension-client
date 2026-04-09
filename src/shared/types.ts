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

/**
 * Data that will be written to storage under key 'spot' that will be fetched by popup
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
  wsConnected?: boolean;
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
