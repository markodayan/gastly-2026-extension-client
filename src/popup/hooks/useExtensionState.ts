/*global chrome*/
import { useState, useEffect, useEffectEvent } from 'react';
import type { ExtensionState, Preferences } from '../../shared/types';
import { DEFAULT_PREFERENCES, getStorageSnapshot, managePreferences } from '../../shared/storage';

export function useExtensionState() {
  const [state, setState] = useState<ExtensionState | null>(null);

  // Listens for storage state changes and uses them to update hook state
  // The managePreference() function will check how to merge preference state conflicts (always prioritise preferences from hook state and backfill with storage or defaults if hook preferences are missing)
  const handleStorageChange = useEffectEvent(
    async (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName !== 'local') return;

      // console.log(`handleStorageChange ${new Date().toUTCString()}`, changes);

      let preferences: Preferences | undefined;

      // If storage has a 'preference' change
      if ('preferences' in changes) {
        // Check if preferences are in sync (storage, popup state). If not apply repairs. Write preferences to state (even if redundant). Return latest merged preferences.
        preferences = await managePreferences(state?.preferences);
      }

      console.log(`calling getStorageSnapshot (on storage change): [${Object.keys(changes)}]`);
      const snapshot = await getStorageSnapshot();

      setState(preferences ? { ...snapshot, preferences } : snapshot);
    },
  );

  // Updates preferences in hook state and thereafter, updates preferences in storage.
  const updatePreferences = useEffectEvent(async (patch: Partial<Preferences>) => {
    const currentPreferences = state?.preferences ?? DEFAULT_PREFERENCES;

    const nextPreferences: Preferences = {
      ...currentPreferences,
      ...patch,
    };

    // Optimistic React state update for instant UI response
    setState((prev) => {
      if (!prev) return prev; //stale data but better than unexpected data
      return { ...prev, preferences: nextPreferences };
    });

    await chrome.storage.local.set({
      preferences: nextPreferences,
    });
  });

  // const setPreference = useEffectEvent(async (key: string, value: string) => {
  //   await updatePreferences({ [key]: value } as Partial<Preferences>);
  // });

  // Receives preference update request from component (to be used by updatePreferences)
  function setPreference<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    console.log(`setPreference(${key}, ${value}) request from Header`);
    void updatePreferences({ [key]: value } as Partial<Preferences>);
  }

  useEffect(() => {
    let mounted = true;

    async function load() {
      const preferences = await managePreferences(undefined); // on popup open, this should fetch preferences from storage, if they don't exist then the default

      console.log('calling getStorageSnapshot (on load)');
      const snapshot = await getStorageSnapshot();

      if (!mounted) return;

      setState({
        ...snapshot,
        preferences,
      });
    }

    void load();

    const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (!mounted) return;
      void handleStorageChange(changes, areaName);
    };

    chrome.storage.onChanged.addListener(listener);

    return () => {
      mounted = false;
      chrome.storage.onChanged.removeListener(listener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // this lint error is not relevant for a things wrapped in an effect

  return { state, updatePreferences, setPreference };
}
