"use client";

import { useCallback, useMemo } from "react";
import type { Track } from "@/lib/types";
import { TRACKS } from "@/lib/data/tracks";
import { useSyncedState } from "@/lib/sync/useSyncedState";
import { mergeById } from "@/lib/sync/merge";

const STORAGE_KEY = "subsonic.imported.v1";

/**
 * Library store. Merges the seed crate with the DJ's imported tracks. Imported
 * tracks persist to localStorage and — when signed in — sync to the cloud
 * across devices. Discovery, set-building, and analysis all run on `library`.
 */
export function useLibrary() {
  const { value: imported, setValue, hydrated, syncing } = useSyncedState<Track[]>(
    STORAGE_KEY,
    [],
    mergeById,
  );

  const addTracks = useCallback(
    (incoming: Track[]) => {
      setValue((prev) => {
        const byId = new Map(prev.map((t) => [t.id, t]));
        for (const t of incoming) byId.set(t.id, t); // dedupe by id, newest wins
        return Array.from(byId.values());
      });
    },
    [setValue],
  );

  const clearImported = useCallback(() => setValue([]), [setValue]);

  const library = useMemo(() => [...TRACKS, ...imported], [imported]);

  return {
    library,
    imported,
    importedCount: imported.length,
    seedCount: TRACKS.length,
    hydrated,
    syncing,
    addTracks,
    clearImported,
  };
}
