"use client";

import { usePreview } from "@/lib/preview/PreviewProvider";
import type { Track } from "@/lib/types";

interface Props {
  track: Track;
  size?: "sm" | "md";
}

/**
 * Small play/pause button. Click fetches a 30s preview (iTunes) for this
 * track and plays it; clicking again stops. Disabled while loading. Briefly
 * shows a "no match" state when the lookup returns nothing.
 */
export function PreviewButton({ track, size = "md" }: Props) {
  const { playingId, loadingId, unavailableId, toggle } = usePreview();
  const isPlaying = playingId === track.id;
  const isLoading = loadingId === track.id;
  const isUnavailable = unavailableId === track.id;

  const base =
    size === "sm"
      ? "h-7 w-7 text-[11px]"
      : "h-8 w-8 text-xs";

  let icon: string;
  let title: string;
  let style: string;

  if (isUnavailable) {
    icon = "∅";
    title = "No preview available for this track";
    style = "border-white/10 bg-white/5 text-white/30";
  } else if (isLoading) {
    icon = "…";
    title = "Loading preview…";
    style = "border-white/10 bg-white/5 text-white/60";
  } else if (isPlaying) {
    icon = "⏸";
    title = "Stop preview";
    style = "border-neon-cyan/50 bg-neon-cyan/15 text-neon-cyan shadow-glow";
  } else {
    icon = "▶";
    title = "Play 30s preview";
    style = "border-white/10 bg-white/5 text-white/70 hover:border-neon-cyan/40 hover:text-neon-cyan";
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggle(track.id, track.artist, track.title);
      }}
      disabled={isLoading || isUnavailable}
      title={title}
      aria-label={title}
      className={`inline-flex shrink-0 items-center justify-center rounded-full border font-mono transition-all disabled:cursor-default ${base} ${style}`}
    >
      {icon}
    </button>
  );
}
