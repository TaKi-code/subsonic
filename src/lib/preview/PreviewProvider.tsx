"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

interface PreviewValue {
  /** Track id whose preview is currently playing, or null. */
  playingId: string | null;
  /** Track id whose preview is currently being fetched, or null. */
  loadingId: string | null;
  /** Track id whose preview lookup failed (no match), or null. */
  unavailableId: string | null;
  /** Toggle preview for a track. Stops if it's the one already playing. */
  toggle: (trackId: string, artist: string, title: string) => Promise<void>;
  stop: () => void;
}

const PreviewContext = createContext<PreviewValue | null>(null);

/**
 * Global preview audio player. Exactly one preview plays at a time across the
 * whole app — starting a new one stops the previous. Audio comes from iTunes
 * Search (30-second m4a clips, no auth required).
 */
export function PreviewProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [unavailableId, setUnavailableId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const audio = new Audio();
    audio.preload = "none";
    audioRef.current = audio;
    const onEnd = () => setPlayingId(null);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.pause();
      audio.removeEventListener("ended", onEnd);
      audioRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    setPlayingId(null);
  }, []);

  const toggle = useCallback(
    async (id: string, artist: string, title: string) => {
      if (playingId === id) {
        stop();
        return;
      }
      // Switching tracks — stop the previous one immediately.
      stop();
      setUnavailableId(null);
      setLoadingId(id);
      try {
        const res = await fetch(
          `/api/preview?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`,
        );
        if (!res.ok) {
          setUnavailableId(id);
          // Auto-clear the "unavailable" state after a few seconds.
          setTimeout(() => setUnavailableId((u) => (u === id ? null : u)), 3000);
          return;
        }
        const data = (await res.json()) as { previewUrl?: string };
        const audio = audioRef.current;
        if (!audio || !data.previewUrl) {
          setUnavailableId(id);
          setTimeout(() => setUnavailableId((u) => (u === id ? null : u)), 3000);
          return;
        }
        audio.src = data.previewUrl;
        await audio.play();
        setPlayingId(id);
      } catch {
        setUnavailableId(id);
        setTimeout(() => setUnavailableId((u) => (u === id ? null : u)), 3000);
      } finally {
        setLoadingId(null);
      }
    },
    [playingId, stop],
  );

  return (
    <PreviewContext.Provider value={{ playingId, loadingId, unavailableId, toggle, stop }}>
      {children}
    </PreviewContext.Provider>
  );
}

export function usePreview(): PreviewValue {
  const ctx = useContext(PreviewContext);
  if (!ctx) throw new Error("usePreview must be used within <PreviewProvider>");
  return ctx;
}
