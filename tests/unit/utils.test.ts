import { gasPriceToFiat, clean, normaliseBlock, normaliseSpots } from '../../src/shared/utils';

// ---------------------------------------------------------------------------
// gasPriceToFiat
// ---------------------------------------------------------------------------

describe('gasPriceToFiat', () => {
  it('calculates the correct fiat cost for a Send ETH at known gas price and spot rate', () => {
    // gasPrice=12 Gwei, gasUnits=21_000, spotRate=$3500
    // costInEth = (12 * 21_000) / 1e9 = 0.000252
    // fiatCost  = round(0.000252 * 3500 * 100) / 100 = $0.88
    const [belowThreshold, cost] = gasPriceToFiat(12, 21_000, 3_500);
    expect(belowThreshold).toBe(false);
    expect(cost).toBe(0.88);
  });

  it('calculates the correct fiat cost for a CowSwap swap', () => {
    // gasPrice=12 Gwei, gasUnits=250_000, spotRate=$3500
    // costInEth = (12 * 250_000) / 1e9 = 0.003
    // fiatCost  = round(0.003 * 3500 * 100) / 100 = $10.50
    const [, cost] = gasPriceToFiat(12, 250_000, 3_500);
    expect(cost).toBe(10.5);
  });

  it('sets belowThreshold when the fiat cost is under $0.01', () => {
    // gasPrice=1 Gwei, gasUnits=100, spotRate=1 → costInEth ≈ 0.0000000001, fiatCost ≈ 0
    const [belowThreshold] = gasPriceToFiat(1, 100, 1);
    expect(belowThreshold).toBe(true);
  });

  it('rounds fiat cost to exactly 2 decimal places', () => {
    // gasPrice=10, gasUnits=21_000, spotRate=3000
    // costInEth = 0.00021, fiatCost = round(0.63 * 100) / 100 = 0.63
    const [, cost] = gasPriceToFiat(10, 21_000, 3_000);
    expect(cost).toBe(0.63);
  });
});

// ---------------------------------------------------------------------------
// clean
// ---------------------------------------------------------------------------

describe('clean', () => {
  it('rounds values ≥ 100 to the nearest integer', () => {
    expect(clean(150.7)).toBe(151);
    expect(clean(100)).toBe(100);
  });

  it('returns 2 decimal places for values < 100', () => {
    expect(clean(50.7)).toBe(50.7);
    expect(clean(9.5)).toBe(9.5);
  });

  it('handles whole numbers without adding unnecessary decimals', () => {
    expect(clean(12)).toBe(12);
    expect(clean(5)).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// normaliseBlock
// ---------------------------------------------------------------------------

describe('normaliseBlock', () => {
  const BASE = {
    number: 22_500_000,
    basefee: 10,
    gasUsed: 15_000_000,
    gasLimit: 30_000_000,
    gasUtilizationRatio: 50,
    txCount: 142,
    size: 98_000,
    priorityFees: { fast: 2, average: 1, slow: 0.5 },
  };

  it('passes through numeric values correctly', () => {
    const block = normaliseBlock(BASE);
    expect(block.number).toBe(22_500_000);
    expect(block.basefee).toBe(10);
    expect(block.priorityFees.fast).toBe(2);
    expect(block.priorityFees.slow).toBe(0.5);
  });

  it('casts string values to numbers (real API may send strings)', () => {
    const rawWithStrings = {
      ...BASE,
      basefee: '10.5' as unknown as number,
      number: '22500000' as unknown as number,
      priorityFees: { fast: '2' as unknown as number, average: '1' as unknown as number, slow: '0.5' as unknown as number },
    };
    const block = normaliseBlock(rawWithStrings);
    expect(block.basefee).toBe(10.5);
    expect(block.number).toBe(22_500_000);
    expect(block.priorityFees.fast).toBe(2);
  });

  it('strips timestamp and uncles from the output', () => {
    const rawWithExtras = { ...BASE, timestamp: '2024-01-01', uncles: ['0xabc'] };
    const block = normaliseBlock(rawWithExtras);
    expect('timestamp' in block).toBe(false);
    expect('uncles' in block).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// normaliseSpots
// ---------------------------------------------------------------------------

describe('normaliseSpots', () => {
  it('converts string prices to numbers', () => {
    const spots = normaliseSpots({ ethusd: '3500.25', ethbtc: '0.0532' });
    expect(spots['ethusd']).toBe(3500.25);
    expect(spots['ethbtc']).toBe(0.0532);
  });

  it('handles numeric strings that represent integers', () => {
    const spots = normaliseSpots({ ethzar: '65000' });
    expect(spots['ethzar']).toBe(65_000);
  });
});
