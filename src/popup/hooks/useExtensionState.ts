/*global chrome*/
import { useState, useEffect, useEffectEvent } from 'react';
import type { ExtensionState, Preferences } from '../../shared/types';
import { DEFAULT_PREFERENCES, getStorageSnapshot, managePreferences } from '../../shared/storage';

export function useExtensionState() {
  const [state, setState] = useState<ExtensionState | null>(null);

  const handleStorageChange = useEffectEvent(
    async (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName !== 'local') return;

      console.log(`handleStorageChange ${new Date().toUTCString()}`, changes);

      let preferences: Preferences | undefined;

      // If storage has a 'preference' change
      if ('preferences' in changes) {
        // Check if preferences are in sync (storage, popup state). If not apply repairs. Write preferences to state (even if redundant). Return latest merged preferences.
        preferences = await managePreferences(state?.preferences);
      }

      const snapshot = await getStorageSnapshot();

      setState(preferences ? { ...snapshot, preferences } : snapshot);
    },
  );

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

  const setPreference = useEffectEvent(async (key: string, value: string) => {
    await updatePreferences({ [key]: value } as Partial<Preferences>);
  });

  useEffect(() => {
    let mounted = true;

    async function load() {
      const preferences = await managePreferences(undefined); // on popup open, this should fetch preferences from storage, if they don't exist then the default
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
  }, []); // this lint error is not relevant for a things wrapped in an effect

  return { state, updatePreferences, setPreference };
}
