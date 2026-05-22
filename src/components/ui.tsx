import type { CamelotKey, Source } from "@/lib/types";

/** Color a Camelot key by its number (position on the wheel). */
const WHEEL_HUES: Record<number, string> = {
  1: "#22e5d6", 2: "#28d6a8", 3: "#5fd14d", 4: "#b6ff3c", 5: "#ffe14d",
  6: "#ffb020", 7: "#ff7a3c", 8: "#ff2bd6", 9: "#d14dff", 10: "#8b5cf6",
  11: "#5b7bff", 12: "#22b4e5",
};

export function CamelotBadge({ keyCode }: { keyCode: CamelotKey }) {
  const num = parseInt(keyCode, 10);
  const hue = WHEEL_HUES[num] ?? "#8b5cf6";
  return (
    <span
      className="inline-flex h-6 min-w-[34px] items-center justify-center rounded-md px-1.5 font-mono text-xs font-bold"
      style={{
        color: hue,
        backgroundColor: `${hue}1a`,
        border: `1px solid ${hue}40`,
      }}
      title={`Camelot ${keyCode}`}
    >
      {keyCode}
    </span>
  );
}

export function EnergyMeter({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-[3px]" title={`Energy ${value}/10`}>
      {Array.from({ length: 10 }).map((_, i) => {
        const on = i < value;
        const hot = i >= 7;
        return (
          <span
            key={i}
            className="h-3.5 w-[3px] rounded-full"
            style={{
              backgroundColor: on
                ? hot
                  ? "#ff2bd6"
                  : "#22e5d6"
                : "rgba(255,255,255,0.12)",
            }}
          />
        );
      })}
    </span>
  );
}

const SOURCE_STYLE: Record<Source, string> = {
  Spotify: "text-[#1DB954] border-[#1DB954]/30 bg-[#1DB954]/10",
  SoundCloud: "text-[#ff5500] border-[#ff5500]/30 bg-[#ff5500]/10",
  Beatport: "text-neon-lime border-neon-lime/30 bg-neon-lime/10",
  YouTube: "text-[#ff4d4d] border-[#ff4d4d]/30 bg-[#ff4d4d]/10",
  Local: "text-white/60 border-white/15 bg-white/5",
};

export function SourceBadges({ sources }: { sources: Source[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {sources.map((s) => (
        <span key={s} className={`chip ${SOURCE_STYLE[s]} px-1.5 py-0.5 text-[10px]`}>
          {s}
        </span>
      ))}
    </span>
  );
}

export function ScoreBar({ value, label }: { value: number; label?: string }) {
  const color = value >= 75 ? "#b6ff3c" : value >= 50 ? "#22e5d6" : value >= 30 ? "#ffb020" : "#ff2bd6";
  return (
    <div className="w-full">
      {label && (
        <div className="mb-1 flex justify-between text-[11px] text-white/45">
          <span>{label}</span>
          <span className="font-mono text-white/70">{value}</span>
        </div>
      )}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${value}%`, backgroundColor: color, boxShadow: `0 0 10px ${color}80` }}
        />
      </div>
    </div>
  );
}

export function Stat({
  label,
  value,
  accent = "#22e5d6",
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className="panel px-4 py-3">
      <div className="label-cap">{label}</div>
      <div className="mt-1 font-mono text-2xl font-bold" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}

export function UndergroundPill({ score }: { score: number }) {
  const deep = score >= 65;
  return (
    <span
      className={`chip ${
        deep
          ? "border-neon-violet/40 bg-neon-violet/10 text-neon-violet"
          : "border-neon-amber/40 bg-neon-amber/10 text-neon-amber"
      }`}
      title={`Underground score ${score}/100`}
    >
      {deep ? "◆ Hidden gem" : "◇ Known"}
      <span className="font-mono">{score}</span>
    </span>
  );
}
