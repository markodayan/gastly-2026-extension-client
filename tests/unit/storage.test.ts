import { preferencesNeedRepair, DEFAULT_PREFERENCES } from '../../src/shared/storage';

describe('preferencesNeedRepair', () => {
  it('returns true for undefined (no preferences stored yet)', () => {
    expect(preferencesNeedRepair(undefined)).toBe(true);
  });

  it('returns true when any required key is missing', () => {
    expect(preferencesNeedRepair({ gasPreference: 'fast' } as never)).toBe(true);
    expect(preferencesNeedRepair({ fiatPreference: 'ethusd', gasPreference: 'fast' } as never)).toBe(true);
  });

  it('returns false for a fully populated preferences object', () => {
    expect(preferencesNeedRepair(DEFAULT_PREFERENCES)).toBe(false);
  });

  it('returns false when all four keys are explicitly present', () => {
    expect(
      preferencesNeedRepair({
        gasPreference: 'slow',
        fiatPreference: 'ethaud',
        transactionPreference: 'swap-cowswap',
        appScalePreference: 0.8,
      }),
    ).toBe(false);
  });
});
