"use client";

import { useEffect, useState } from "react";
import type { DiscoveryFilters, Genre, ScoredTrack } from "@/lib/types";
import { GENRES, LABELS } from "@/lib/data/tracks";
import { discover } from "@/lib/engine";
import { useLibrary } from "@/lib/library/useLibrary";
import { TrackCard } from "@/components/TrackCard";

const SHORTCUTS: { label: string; filters: DiscoveryFilters }[] = [
  { label: "Hidden gems", filters: { maxPopularity: 40, limit: 24 } },
  { label: "Peak-time techno", filters: { genres: ["Peak Time Techno", "Hard Techno"], energyMin: 8 } },
  { label: "Deep & hypnotic", filters: { vibe: "hypnotic deep dub rolling", energyMax: 7 } },
  { label: "Warmup material", filters: { energyMax: 6, bpmMax: 124 } },
  { label: "Melodic journey", filters: { genres: ["Melodic Techno", "Progressive House"], vibe: "emotional uplifting journey" } },
];

export default function DiscoverPage() {
  const { library, importedCount, hydrated } = useLibrary();
  const [vibe, setVibe] = useState("");
  const [genres, setGenres] = useState<Genre[]>([]);
  const [bpm, setBpm] = useState<[number, number]>([118, 150]);
  const [energy, setEnergy] = useState<[number, number]>([1, 10]);
  const [label, setLabel] = useState("");
  const [undergroundOnly, setUndergroundOnly] = useState(false);
  const [similarToId, setSimilarToId] = useState<string | undefined>();
  const [results, setResults] = useState<ScoredTrack[]>([]);

  // Natural-language ("ask in plain English") state.
  const [nlQuery, setNlQuery] = useState("");
  const [interpreting, setInterpreting] = useState(false);
  const [interpretation, setInterpretation] = useState<{
    source: "llm" | "fallback";
    rationale: string;
    vibeKeywords: string[];
  } | null>(null);

  function buildFilters(): DiscoveryFilters {
    return {
      vibe: vibe.trim() || undefined,
      genres: genres.length ? genres : undefined,
      bpmMin: bpm[0],
      bpmMax: bpm[1],
      energyMin: energy[0],
      energyMax: energy[1],
      labels: label ? [label] : undefined,
      maxPopularity: undergroundOnly ? 45 : undefined,
      similarToId,
      limit: 30,
    };
  }

  // Runs the engine client-side against the full library (seed + imported).
  function run(filters: DiscoveryFilters) {
    setResults(discover(library, filters));
  }

  async function askAI() {
    const q = nlQuery.trim();
    if (!q) return;
    setInterpreting(true);
    setSimilarToId(undefined);
    try {
      // The server interprets the request; discovery runs locally so imported
      // tracks are included in the results.
      const res = await fetch("/api/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      setResults(discover(library, data.filters ?? { vibe: q, limit: 30 }));
      setInterpretation({
        source: data.source,
        rationale: data.rationale,
        vibeKeywords: data.vibeKeywords ?? [],
      });
    } finally {
      setInterpreting(false);
    }
  }

  // Initial load — wait for localStorage hydration so imports are included.
  useEffect(() => {
    if (hydrated) run({ maxPopularity: 50, limit: 30 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  function toggleGenre(g: Genre) {
    setGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  const seed = similarToId ? library.find((t) => t.id === similarToId) : undefined;

  return (
    <div className="space-y-7">
      <div>
        <span className="label-cap">Crate-digging</span>
        <h1 className="mt-1 text-3xl font-bold text-white">Discover</h1>
        <p className="mt-1 text-sm text-white/55">
          Filter the crate, match a vibe, or find tracks similar to a seed. Underground gems rank first.
        </p>
      </div>

      {/* Plain-English (AI) search */}
      <div className="panel relative overflow-hidden p-5">
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-neon-violet/15 blur-[60px]" />
        <div className="relative">
          <label className="label-cap flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-neon-violet animate-pulseglow" />
            Ask in plain English
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              className="input flex-1"
              placeholder='e.g. "deep hypnotic warmup, nothing mainstream" or "peak-time techno around 135 BPM"'
              value={nlQuery}
              onChange={(e) => setNlQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && askAI()}
            />
            <button onClick={askAI} disabled={interpreting} className="btn-primary sm:w-44">
              {interpreting ? "Interpreting…" : "Interpret →"}
            </button>
          </div>

          {interpretation && (
            <div className="mt-3 rounded-xl border border-white/5 bg-ink-800/60 p-3">
              <div className="flex items-center gap-2">
                <span
                  className={`chip ${
                    interpretation.source === "llm"
                      ? "border-neon-violet/40 bg-neon-violet/10 text-neon-violet"
                      : "border-neon-amber/40 bg-neon-amber/10 text-neon-amber"
                  }`}
                >
                  {interpretation.source === "llm" ? "◆ AI interpreted" : "◇ Algorithmic"}
                </span>
                {interpretation.vibeKeywords.map((k) => (
                  <span key={k} className="chip border-white/10 bg-white/5 text-[10px] text-white/55">
                    {k}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-sm text-white/65">{interpretation.rationale}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {SHORTCUTS.map((s) => (
          <button
            key={s.label}
            onClick={() => {
              setSimilarToId(undefined);
              run({ ...s.filters, limit: 30 });
            }}
            className="chip border-white/10 bg-white/5 text-white/70 hover:border-neon-cyan/40 hover:text-white"
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Filter rail */}
        <div className="panel h-fit space-y-5 p-5">
          <div>
            <label className="label-cap">Vibe / mood</label>
            <input
              className="input mt-2"
              placeholder="e.g. dark hypnotic rolling"
              value={vibe}
              onChange={(e) => setVibe(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && run(buildFilters())}
            />
          </div>

          <div>
            <label className="label-cap">Genres</label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {GENRES.map((g) => (
                <button
                  key={g}
                  onClick={() => toggleGenre(g as Genre)}
                  className={`chip text-[11px] ${
                    genres.includes(g as Genre)
                      ? "border-neon-cyan/50 bg-neon-cyan/15 text-neon-cyan"
                      : "border-white/10 bg-white/5 text-white/55 hover:text-white"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label-cap flex justify-between">
              <span>BPM</span>
              <span className="font-mono text-white/60">{bpm[0]}–{bpm[1]}</span>
            </label>
            <div className="mt-2 flex items-center gap-2">
              <input type="range" min={118} max={150} value={bpm[0]} onChange={(e) => setBpm([Math.min(+e.target.value, bpm[1]), bpm[1]])} className="w-full accent-neon-cyan" />
              <input type="range" min={118} max={150} value={bpm[1]} onChange={(e) => setBpm([bpm[0], Math.max(+e.target.value, bpm[0])])} className="w-full accent-neon-cyan" />
            </div>
          </div>

          <div>
            <label className="label-cap flex justify-between">
              <span>Energy</span>
              <span className="font-mono text-white/60">{energy[0]}–{energy[1]}</span>
            </label>
            <div className="mt-2 flex items-center gap-2">
              <input type="range" min={1} max={10} value={energy[0]} onChange={(e) => setEnergy([Math.min(+e.target.value, energy[1]), energy[1]])} className="w-full accent-neon-magenta" />
              <input type="range" min={1} max={10} value={energy[1]} onChange={(e) => setEnergy([energy[0], Math.max(+e.target.value, energy[0])])} className="w-full accent-neon-magenta" />
            </div>
          </div>

          <div>
            <label className="label-cap">Label</label>
            <select className="input mt-2" value={label} onChange={(e) => setLabel(e.target.value)}>
              <option value="">Any label</option>
              {LABELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-white/70">
            <input type="checkbox" checked={undergroundOnly} onChange={(e) => setUndergroundOnly(e.target.checked)} className="h-4 w-4 accent-neon-violet" />
            Underground only (hidden gems)
          </label>

          <button onClick={() => { setSimilarToId(undefined); run(buildFilters()); }} className="btn-primary w-full">
            Search crate
          </button>
        </div>

        {/* Results */}
        <div>
          {seed && (
            <div className="panel mb-4 flex items-center justify-between gap-3 border-neon-violet/30 bg-neon-violet/5 p-4">
              <div className="text-sm text-white/70">
                Showing tracks similar to <span className="font-semibold text-white">{seed.title}</span> — {seed.artist}
              </div>
              <button onClick={() => { setSimilarToId(undefined); run(buildFilters()); }} className="btn-ghost py-1.5 text-xs">
                Clear
              </button>
            </div>
          )}
          <div className="mb-3 text-sm text-white/45">
            {results.length} results
            {importedCount > 0 && (
              <span className="ml-2 text-neon-violet/80">· {importedCount} imported in crate</span>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((r) => (
              <TrackCard
                key={r.track.id}
                track={r.track}
                score={r.score}
                reasons={r.reasons}
                action={
                  <button
                    onClick={() => { setSimilarToId(r.track.id); run({ similarToId: r.track.id, limit: 30 }); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className="text-xs font-medium text-neon-cyan hover:underline"
                  >
                    Similar →
                  </button>
                }
              />
            ))}
          </div>
          {results.length === 0 && (
            <div className="panel p-10 text-center text-white/40">No tracks match these filters. Loosen the range.</div>
          )}
        </div>
      </div>
    </div>
  );
}
