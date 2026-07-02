import type { BlockMessage, NormalisedBlock, SpotPricesMessage, NormalisedSpotPrices } from './types';

/**
 * Converts a gas price + gas units to a fiat cost.
 * Returns [belowCentThreshold, fiatCost] where belowCentThreshold is true if cost < $0.01.
 */
export function gasPriceToFiat(gasPrice: number, gasUnits: number, spotRate: number): [boolean, number] {
  const costInEth = (gasPrice * gasUnits) / 1_000_000_000;
  const unfilteredFiatCost = costInEth * spotRate;
  const filteredFiatCost = Math.round(costInEth * spotRate * 100) / 100;
  const belowCentThreshold = unfilteredFiatCost < 0.01;
  return [belowCentThreshold, filteredFiatCost];
}

/**
 * Rounds a gas price for display: 2 decimal places below 100 Gwei, integer above.
 */
export function clean(n: number): number {
  if (n < 100) return Number(n.toFixed(2));
  return Math.round(n);
}

/**
 * Casts all raw block fields to numbers and strips unused API fields.
 */
export function normaliseBlock(raw: BlockMessage): NormalisedBlock {
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

/**
 * Converts string spot prices from the API to numbers.
 */
export function normaliseSpots(raw: SpotPricesMessage): NormalisedSpotPrices {
  const normalised: NormalisedSpotPrices = {};
  for (const [ticker, value] of Object.entries(raw)) {
    normalised[ticker] = Number(value);
  }
  return normalised;
}
