"use client";

import type { Track } from "@/lib/types";
import { CamelotBadge, EnergyMeter, SourceBadges } from "./ui";
import { PreviewButton } from "./PreviewButton";

export function TrackCard({
  track,
  score,
  reasons,
  action,
  compact = false,
}: {
  track: Track;
  score?: number;
  reasons?: string[];
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`panel panel-hover animate-rise p-4 ${compact ? "" : "flex flex-col gap-3"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <PreviewButton track={track} size="sm" />
          <div className="min-w-0">
            <div className="truncate font-semibold text-white">{track.title}</div>
            <div className="truncate text-sm text-white/55">{track.artist}</div>
          </div>
        </div>
        {typeof score === "number" && (
          <span className="shrink-0 rounded-lg border border-neon-cyan/30 bg-neon-cyan/10 px-2 py-1 font-mono text-xs font-bold text-neon-cyan">
            {score}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
        <CamelotBadge keyCode={track.key} />
        <span className="font-mono text-white/70">{track.bpm} BPM</span>
        <EnergyMeter value={track.energy} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="chip border-white/10 bg-white/5 text-white/60">{track.genre}</span>
        <span className="chip border-white/10 bg-white/5 text-white/45">{track.label}</span>
        <span className="text-white/30">·</span>
        <span className="font-mono text-white/40">{track.year}</span>
      </div>

      {reasons && reasons.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {reasons.slice(0, 3).map((r, i) => (
            <span key={i} className="chip border-neon-violet/25 bg-neon-violet/10 text-[10px] text-neon-violet/90">
              {r}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        <SourceBadges sources={track.sources} />
        {action}
      </div>
    </div>
  );
}
