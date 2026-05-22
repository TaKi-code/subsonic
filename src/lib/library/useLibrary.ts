"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Track } from "@/lib/types";
import { TRACKS } from "@/lib/data/tracks";

const STORAGE_KEY = "subsonic.imported.v1";

/**
 * Client-side library store. Merges the seed crate with the DJ's imported
 * tracks (persisted in localStorage), so discovery, set-building, and analysis
 * all run against the combined library with no backend.
 */
export function useLibrary() {
  const [imported, setImported] = useState<Track[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load persisted imports once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setImported(JSON.parse(raw) as Track[]);
    } catch {
      // Corrupt/unavailable storage — start clean.
    }
    setHydrated(true);
  }, []);

  // Persist whenever imports change (after initial hydration).
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(imported));
    } catch {
      // Quota/availability errors are non-fatal.
    }
  }, [imported, hydrated]);

  const addTracks = useCallback((incoming: Track[]) => {
    setImported((prev) => {
      const byId = new Map(prev.map((t) => [t.id, t]));
      for (const t of incoming) byId.set(t.id, t); // dedupe by id, newest wins
      return Array.from(byId.values());
    });
  }, []);

  const clearImported = useCallback(() => setImported([]), []);

  const library = useMemo(() => [...TRACKS, ...imported], [imported]);

  return {
    /** Seed crate + imported tracks. */
    library,
    /** Just the imported tracks. */
    imported,
    importedCount: imported.length,
    seedCount: TRACKS.length,
    hydrated,
    addTracks,
    clearImported,
  };
}
