import type {
  NormalisedBlock,
  NormalisedSpotPrices,
  ConnectionState,
  Preferences,
  ExtensionState,
} from './types';

export const DEFAULT_PREFERENCES: Preferences = {
  gasPreference: 'fast',
  fiatPreference: 'ethusd',
  transactionPreference: 'eth-send',
};

const DEFAULT_CONNECTION: ConnectionState = {
  wsConnected: false,
  backendReachable: true,
};

/**
 * Describes the raw object return by chrome.storage.local.get(...). This value differs from the value under an individual key.
 */
type StorageShape = {
  block?: NormalisedBlock;
  spots?: NormalisedSpotPrices;
  preferences?: Partial<Preferences>;
  connection?: Partial<ConnectionState>;
};

export async function ensureDefaults(): Promise<void> {
  const result = (await chrome.storage.local.get(['preferences', 'connection'])) as StorageShape;

  await chrome.storage.local.set({
    preferences: {
      ...DEFAULT_PREFERENCES,
      ...(result.preferences ?? {}),
    },
    connection: {
      ...DEFAULT_CONNECTION,
      ...(result.connection ?? {}),
    },
  });
}

// Method is called when popup is open and is used for managing full or partial flushing of preferences from storage that occurred while popup was closed. (Cold-open repair) The desired outcome is that we either sync default preferences (if preferences was entirely flushed) or partially sync preferences (if only some preference keys were flushed). This method will return a snapshot that is either the original or repaired object of the preferences.
// For dealing with full or partial flushing of preferences from storage that occurred while the popup was open, that will require not using this function and instead comparing default preferences against the popup React preference state
/**
 * read preferences
 * merge with defaults
 * persist if missing/partial
 * return repaired snapshot
 */

/**
 * For dealing with cold-open repair
 * Either:
 *  - writes to 'preferences' => DEFAULT.PREFERENCES (if 'preferences' was entirely flushed)
 *  - writes to 'preferences' => {...DEFAULT.PREFERENCES, ...(result.preferences ?? {}) } (if 'preferences' was partially flushed)
 */
export async function ensurePreferencesPersisted(): Promise<Preferences> {
  const result = (await chrome.storage.local.get('preferences')) as StorageShape;

  const repaired: Preferences = {
    ...DEFAULT_PREFERENCES,
    ...(result.preferences ?? {}),
  };

  const needsRepair =
    !result.preferences ||
    result.preferences.gasPreference === undefined ||
    result.preferences.fiatPreference === undefined ||
    result.preferences.transactionPreference === undefined;

  if (needsRepair) {
    await chrome.storage.local.set({
      preferences: repaired,
    });
  }

  return repaired;
}

// Pure reading of state
export async function getStorageSnapshot(): Promise<ExtensionState> {
  const result = (await chrome.storage.local.get([
    'block',
    'spots',
    'preferences',
    'connection',
  ])) as StorageShape;

  return {
    block: result.block,
    spots: result.spots,
    preferences: {
      ...DEFAULT_PREFERENCES,
      ...(result.preferences ?? {}),
    },
    connection: {
      ...DEFAULT_CONNECTION,
      ...(result.connection ?? {}),
    },
  };
}

/**
 * Checks user preferences and attempts repair if not synced with storage (cold-open repair, live-session repair)
 * Returns preferences (if fine, no change, if needs repair, updated preference object returned)
 */
export async function managePreferences(
  reactPreferences: Partial<Preferences | undefined>,
): Promise<Preferences> {
  const storage = (await chrome.storage.local.get('preferences')) as StorageShape;

  // If preferences in storage exists, just return them (means the system is working normally)
  if (!preferencesNeedRepair(storage.preferences)) {
    return storage.preferences as Preferences;
  }

  // Compute repaired preferences
  //  - Cold-Start -> Merge between storage-available preference data and defaults
  //  - Live-Session -> Merge between react-stored preferences, storage preferences and defaults (in that order)
  const repaired: Preferences = {
    ...DEFAULT_PREFERENCES,
    ...(storage.preferences ?? {}),
    ...(reactPreferences ?? {}),
  };

  // Write repaired preferences to storage (syncing app preferences and storage preference record)
  await chrome.storage.local.set({
    preferences: repaired,
  });

  return repaired;
}

export function preferencesNeedRepair(preferences: Partial<Preferences> | undefined): boolean {
  return (
    !preferences ||
    preferences.gasPreference === undefined ||
    preferences.fiatPreference === undefined ||
    preferences.transactionPreference === undefined
  );
}

// will be used by the service worker
// will be used by the popup
export async function getBlock(): Promise<NormalisedBlock | undefined> {
  const result = (await chrome.storage.local.get('block')) as StorageShape;
  return result.block;
}

// will be used by the service worker
export async function setBlock(block: NormalisedBlock): Promise<void> {
  await chrome.storage.local.set({ block });
}

// will be used by the popup
export async function getSpots(): Promise<NormalisedSpotPrices | undefined> {
  const result = (await chrome.storage.local.get('spots')) as StorageShape;
  return result.spots;
}

// will be used by the service worker
export async function setSpots(spots: NormalisedSpotPrices): Promise<void> {
  await chrome.storage.local.set({ spots });
}

// Will be used by the popup
export async function getPreferences(): Promise<Preferences> {
  const result = (await chrome.storage.local.get('preferences')) as StorageShape;
  return {
    ...DEFAULT_PREFERENCES,
    ...(result.preferences ?? {}),
  };
}

// Will be used by the popup.
export async function setPreferences(preferences: Partial<Preferences>): Promise<void> {
  const current = await getPreferences();

  await chrome.storage.local.set({
    preferences: {
      ...current,
      ...preferences,
    },
  });
}

export async function getConnection(): Promise<ConnectionState> {
  const result = (await chrome.storage.local.get('connection')) as StorageShape;

  return {
    ...DEFAULT_CONNECTION,
    ...(result.connection ?? {}),
  };
}

export async function setConnection(connection: Partial<ConnectionState>): Promise<void> {
  const current = await getConnection();

  await chrome.storage.local.set({
    connection: {
      ...current,
      ...connection,
    },
  });
}
