import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

// Known inputs chosen so the fee calculations are easy to verify by hand.
// Fast gasPrice = basefee(10) + priorityFee.fast(2) = 12 Gwei
const MOCK_BLOCK = {
  number: 22_500_000,
  basefee: 10,
  gasUsed: 15_000_000,
  gasLimit: 30_000_000,
  gasUtilizationRatio: 50,
  txCount: 142,
  size: 98_000,
  priorityFees: { fast: 2, average: 1, slow: 0.5 },
};

const MOCK_SPOTS = {
  ethusd: 3500,
  ethbtc: 0.0532,
  ethaud: 5400,
  ethzar: 65_000,
};

const DEFAULT_PREFS = {
  fiatPreference: 'ethusd',
  transactionPreference: 'eth-send',
  gasPreference: 'fast',
  appScalePreference: 1,
};

/**
 * Navigate to the popup, seed chrome.storage.local with known data,
 * then reload so the React app reads it from a clean mount.
 */
async function seedAndOpen(
  page: Page,
  extensionId: string,
  prefOverrides: Record<string, unknown> = {},
) {
  await page.goto(`chrome-extension://${extensionId}/index.html`);

  await page.evaluate(async (data: Record<string, unknown>) => {
    await chrome.storage.local.set(data);
  }, {
    block: MOCK_BLOCK,
    spots: MOCK_SPOTS,
    preferences: { ...DEFAULT_PREFS, ...prefOverrides },
    connection: { wsConnected: false, backendReachable: false },
  });

  await page.reload();
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

test('all three gas speed cards are visible', async ({ context, extensionId }) => {
  const page = await context.newPage();
  await seedAndOpen(page, extensionId);

  await expect(page.locator('#fast')).toBeVisible();
  await expect(page.locator('#average')).toBeVisible();
  await expect(page.locator('#slow')).toBeVisible();
});

test('block metrics render with correct values', async ({ context, extensionId }) => {
  const page = await context.newPage();
  await seedAndOpen(page, extensionId);

  // CountUp uses a space thousands separator, so 22_500_000 → "22 500 000"
  await expect(page.getByText(/22.500.000/)).toBeVisible();
  // .first() because base fee also appears in each gas card's breakdown row
  await expect(page.getByText('10 Gwei').first()).toBeVisible();
});

// ---------------------------------------------------------------------------
// Fee calculation
// ---------------------------------------------------------------------------

test('Fast card shows correct USD fee for Send ETH', async ({ context, extensionId }) => {
  // gasPrice = 12 Gwei, gasUnits = 21_000 (Send ETH)
  // costInEth = (12 * 21_000) / 1e9 = 0.000252
  // fiatCost = round(0.000252 * 3500 * 100) / 100 = $0.88
  const page = await context.newPage();
  await seedAndOpen(page, extensionId);

  await expect(page.locator('#fast')).toContainText('$0.88');
});

test('swap transaction type shows a higher fee than Send ETH', async ({ context, extensionId }) => {
  // Swap (CowSwap): 250_000 gas units
  // gasPrice = 12 Gwei
  // costInEth = (12 * 250_000) / 1e9 = 0.003
  // fiatCost = round(0.003 * 3500 * 100) / 100 = $10.50
  const page = await context.newPage();
  await seedAndOpen(page, extensionId, { transactionPreference: 'swap-cowswap' });

  await expect(page.locator('#fast')).toContainText('$10.50');
});

// ---------------------------------------------------------------------------
// Preferences — fiat currency
// ---------------------------------------------------------------------------

test('fiat preference change updates the spot ticker label', async ({ context, extensionId }) => {
  const page = await context.newPage();
  await seedAndOpen(page, extensionId);

  await expect(page.getByText(/ETH\/USD/)).toBeVisible();

  // First <select> in the header is the fiat currency picker
  await page.locator('select').first().selectOption('ethaud');

  await expect(page.getByText(/ETH\/AUD/)).toBeVisible();
});

test('fiat preference is written to storage after change', async ({ context, extensionId }) => {
  const page = await context.newPage();
  await seedAndOpen(page, extensionId);

  await page.locator('select').first().selectOption('ethzar');

  // Poll storage until the async write from setPreference lands.
  await expect.poll(async () => {
    const prefs = await page.evaluate(async () => {
      const result = await chrome.storage.local.get('preferences');
      return (result as Record<string, Record<string, unknown>>).preferences;
    });
    return prefs?.fiatPreference;
  }).toBe('ethzar');
});

// ---------------------------------------------------------------------------
// Preferences — app scale
// ---------------------------------------------------------------------------

test('app scale preference is written to storage after change', async ({ context, extensionId }) => {
  const page = await context.newPage();
  await seedAndOpen(page, extensionId);

  await page.click('button[aria-label="Open settings"]');
  await page.locator('#app-size').selectOption('0.7');

  await expect.poll(async () => {
    const prefs = await page.evaluate(async () => {
      const result = await chrome.storage.local.get('preferences');
      return (result as Record<string, Record<string, unknown>>).preferences;
    });
    return prefs?.appScalePreference;
  }).toBe(0.7);
});
