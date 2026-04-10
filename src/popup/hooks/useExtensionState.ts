// import { useState, useEffect, useRef } from 'react';
// import type { ExtensionState, Preferences } from '../../shared/types';
// import {
//   getStorageSnapshot,
//   ensurePreferencesPersisted,
//   managePreferences,
//   DEFAULT_PREFERENCES,
// } from '../../shared/storage';

// /**
//  * On initial load (for handling cold-open repair of preferences):
//  *  - call ensurePreferencesPersisted()
//  *  - call getStorageSnapshot()
//  *  - initialise React state from the repaired snapshot
//  *
//  * During normal storage changes
//  *  - read fresh snapshot
//  *  - sync React state
//  *
//  * During destructive preference change events (live-session repair protocol for preferences)
//  *  - check if changes.preferences indicates for missing preferences object or partial preferences object
//  *    - repair using current React preferences first
//  *    - fill any remaining missing keys from default
//  *    - persist repaired preferences
//  *    - then sync snapshot to React
//  */

// function useExtensionState() {
//   const [state, setState] = useState<ExtensionState | null>(null);

//   useEffect(() => {
//     let mounted = true;

//     async function load() {
//       const [snapshot, preferences] = await Promise.all([
//         getStorageSnapshot(),
//         ensurePreferencesPersisted(),
//       ]);

//       if (!mounted) return;

//       setState({
//         ...snapshot,
//         preferences,
//       });
//     }

//     void load();

//     const listener = async (
//       changes: Record<string, chrome.storage.StorageChange>,
//       areaName: string,
//     ) => {
//       if (areaName !== 'local') return;

//       // If preferences were removed or touched -> repair
//       if ('preferences' in changes) {
//         await ensurePreferencesPersisted();
//       }

//       const snapshot = await getStorageSnapshot();

//       if (!mounted) return;
//       setState(snapshot);
//     };

//     chrome.storage.onChanged.addListener(listener);

//     return () => {
//       mounted = false;
//       chrome.storage.onChanged.removeListener(listener);
//     };
//   }, []);
// }

// function useExtensionStateV2() {
//   const [state, setState] = useState<ExtensionState | null>(null);

//   useEffect(() => {
//     let mounted = true;

//     async function load() {
//       const [preferences, snapshot] = await Promise.all([
//         managePreferences(state?.preferences),
//         getStorageSnapshot(),
//       ]);

//       if (!mounted) return;

//       setState({
//         ...snapshot,
//         preferences,
//       });
//     }

//     void load();

//     const listener = async (
//       changes: Record<string, chrome.storage.StorageChange>,
//       areaName: string,
//     ) => {
//       let preferences;
//       if (areaName !== 'local') return;

//       // If preferences were removed or touched -> repair
//       if ('preferences' in changes) {
//         preferences = (await managePreferences(state?.preferences)) as Preferences;
//       }

//       const snapshot = await getStorageSnapshot();

//       const payload = preferences ? { ...snapshot, preferences } : snapshot;

//       if (!mounted) return;
//       setState(payload);
//     };

//     chrome.storage.onChanged.addListener(listener);

//     return () => {
//       mounted = false;
//       chrome.storage.onChanged.removeListener(listener);
//     };
//   }, []);
// }
