"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";

const TABLE = "user_data";

type Updater<T> = T | ((prev: T) => T);

/**
 * State that is always persisted to localStorage and, when the user is signed
 * in, mirrored to Supabase (one row per key). On sign-in the local and cloud
 * values are merged (via `merge`) so data from multiple devices converges.
 *
 * When cloud sync isn't configured or the user is signed out, this behaves
 * exactly like a localStorage-backed state — the original offline behavior.
 */
export function useSyncedState<T>(
  storageKey: string,
  initial: T,
  merge?: (local: T, remote: T) => T,
) {
  const { client, user } = useAuth();
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const valueRef = useRef(value);
  valueRef.current = value;

  // 1) Initial local load (instant, offline-friendly).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setValue(JSON.parse(raw) as T);
    } catch {
      // ignore corrupt/unavailable storage
    }
    setHydrated(true);
  }, [storageKey]);

  // 2) Persist locally on every change (after hydration).
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // quota/availability errors are non-fatal
    }
  }, [value, hydrated, storageKey]);

  const pushRemote = useCallback(
    async (next: T) => {
      if (!client || !user) return;
      await client
        .from(TABLE)
        .upsert({ user_id: user.id, key: storageKey, value: next, updated_at: new Date().toISOString() });
    },
    [client, user, storageKey],
  );

  // 3) On sign-in (user id available), merge cloud <-> local, then push back.
  //    Intentionally excludes `value` from deps to avoid a write loop.
  useEffect(() => {
    if (!hydrated || !client || !user) return;
    let cancelled = false;
    setSyncing(true);
    (async () => {
      const { data } = await client
        .from(TABLE)
        .select("value")
        .eq("user_id", user.id)
        .eq("key", storageKey)
        .maybeSingle();
      if (cancelled) return;

      const remote = (data?.value ?? undefined) as T | undefined;
      const local = valueRef.current;
      const next =
        remote === undefined || remote === null
          ? local
          : merge
            ? merge(local, remote)
            : remote;

      setValue(next);
      await pushRemote(next);
      if (!cancelled) setSyncing(false);
    })().catch(() => {
      if (!cancelled) setSyncing(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, hydrated, client, storageKey]);

  // Setter mirrors to the cloud (fire-and-forget) when signed in.
  const update = useCallback(
    (updater: Updater<T>) => {
      setValue((prev) => {
        const next = typeof updater === "function" ? (updater as (p: T) => T)(prev) : updater;
        void pushRemote(next);
        return next;
      });
    },
    [pushRemote],
  );

  return { value, setValue: update, hydrated, syncing } as const;
}
