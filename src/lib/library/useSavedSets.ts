"use client";

import { useCallback, useEffect, useState } from "react";
import type { GeneratedSet, SetRequest } from "@/lib/types";

const STORAGE_KEY = "subsonic.sets.v1";

export interface SavedSet {
  id: string;
  name: string;
  createdAt: number;
  request: SetRequest;
  set: GeneratedSet;
}

/**
 * Client-side store for named, generated DJ sets. Persists to localStorage so a
 * DJ can save a set, close the tab, and reload it later — no backend.
 */
export function useSavedSets() {
  const [sets, setSets] = useState<SavedSet[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSets(JSON.parse(raw) as SavedSet[]);
    } catch {
      // Corrupt/unavailable storage — start clean.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
    } catch {
      // Quota/availability errors are non-fatal.
    }
  }, [sets, hydrated]);

  const saveSet = useCallback((name: string, request: SetRequest, set: GeneratedSet) => {
    const entry: SavedSet = {
      id: `set-${Date.now().toString(36)}`,
      name: name.trim() || `Set ${new Date().toLocaleString()}`,
      createdAt: Date.now(),
      request,
      set,
    };
    setSets((prev) => [entry, ...prev]);
    return entry;
  }, []);

  const removeSet = useCallback((id: string) => {
    setSets((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const renameSet = useCallback((id: string, name: string) => {
    setSets((prev) => prev.map((s) => (s.id === id ? { ...s, name: name.trim() || s.name } : s)));
  }, []);

  return { sets, hydrated, saveSet, removeSet, renameSet };
}
