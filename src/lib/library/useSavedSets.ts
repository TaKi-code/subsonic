"use client";

import { useCallback } from "react";
import type { GeneratedSet, SetRequest } from "@/lib/types";
import { useSyncedState } from "@/lib/sync/useSyncedState";
import { mergeById } from "@/lib/sync/merge";

const STORAGE_KEY = "subsonic.sets.v1";

export interface SavedSet {
  id: string;
  name: string;
  createdAt: number;
  request: SetRequest;
  set: GeneratedSet;
}

/**
 * Store for named, generated DJ sets. Persists to localStorage and — when
 * signed in — syncs to the cloud across devices.
 */
export function useSavedSets() {
  const { value: sets, setValue, hydrated, syncing } = useSyncedState<SavedSet[]>(
    STORAGE_KEY,
    [],
    mergeById,
  );

  const saveSet = useCallback(
    (name: string, request: SetRequest, set: GeneratedSet) => {
      const entry: SavedSet = {
        id: `set-${Date.now().toString(36)}`,
        name: name.trim() || `Set ${new Date().toLocaleString()}`,
        createdAt: Date.now(),
        request,
        set,
      };
      setValue((prev) => [entry, ...prev]);
      return entry;
    },
    [setValue],
  );

  const removeSet = useCallback((id: string) => setValue((prev) => prev.filter((s) => s.id !== id)), [setValue]);

  const renameSet = useCallback(
    (id: string, name: string) =>
      setValue((prev) => prev.map((s) => (s.id === id ? { ...s, name: name.trim() || s.name } : s))),
    [setValue],
  );

  return { sets, hydrated, syncing, saveSet, removeSet, renameSet };
}
