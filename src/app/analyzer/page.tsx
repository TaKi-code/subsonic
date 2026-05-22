"use client";

import { useState } from "react";
import type { PlaylistAnalysis } from "@/lib/types";
import { analyzePlaylist } from "@/lib/engine";
import { useLibrary } from "@/lib/library/useLibrary";
import { CamelotBadge, EnergyMeter, ScoreBar, Stat, UndergroundPill } from "@/components/ui";
import { TrackCard } from "@/components/TrackCard";

const SEVERITY_STYLE = {
  critical: "border-neon-magenta/40 bg-neon-magenta/10 text-neon-magenta",
  warn: "border-neon-amber/40 bg-neon-amber/10 text-neon-amber",
  info: "border-white/10 bg-white/5 text-white/60",
};

export default function AnalyzerPage() {
  const { library } = useLibrary();
  const [playlist, setPlaylist] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<PlaylistAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const getTrack = (id: string) => library.find((t) => t.id === id);

  function add(id: string) {
    setPlaylist((p) => (p.includes(id) ? p : [...p, id]));
    setAnalysis(null);
  }
  function remove(id: string) {
    setPlaylist((p) => p.filter((x) => x !== id));
    setAnalysis(null);
  }

  function analyze(ids = playlist) {
    if (ids.length === 0) return;
    setLoading(true);
    const tracks = ids.map(getTrack).filter((t): t is NonNullable<typeof t> => Boolean(t));
    // Analysis runs client-side against the full library (seed + imported).
    setAnalysis(analyzePlaylist(tracks, library));
    setLoading(false);
  }

  function applyReorder() {
    if (!analysis) return;
    setPlaylist(analysis.suggestedOrder);
    analyze(analysis.suggestedOrder);
  }

  function loadSample() {
    // Deliberately bumpy order to show the analyzer flagging issues.
    const sample = ["t03", "t05", "t16", "t30", "t07", "t48", "t36"];
    setPlaylist(sample);
    analyze(sample);
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="label-cap">Playlist intelligence</span>
          <h1 className="mt-1 text-3xl font-bold text-white">Analyzer</h1>
          <p className="mt-1 text-sm text-white/55">
            Build a tracklist, then audit its flow, energy and underground balance — with a smoother reorder.
          </p>
        </div>
        <button onClick={loadSample} className="btn-ghost">Load sample playlist</button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Builder */}
        <div className="space-y-4">
          <div className="panel p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white/80">Your playlist ({playlist.length})</h3>
              {playlist.length > 0 && (
                <button onClick={() => { setPlaylist([]); setAnalysis(null); }} className="text-xs text-white/40 hover:text-white">
                  Clear
                </button>
              )}
            </div>
            {playlist.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-white/35">
                Add tracks from the crate below, or load the sample.
              </div>
            ) : (
              <div className="space-y-2">
                {playlist.map((id, i) => {
                  const t = getTrack(id)!;
                  return (
                    <div key={id} className="flex items-center gap-3 rounded-lg border border-white/5 bg-ink-800/50 px-3 py-2">
                      <span className="font-mono text-xs text-white/30">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-white">{t.title}</div>
                        <div className="truncate text-xs text-white/45">{t.artist}</div>
                      </div>
                      <CamelotBadge keyCode={t.key} />
                      <span className="font-mono text-xs text-white/50">{t.bpm}</span>
                      <button onClick={() => remove(id)} className="text-white/30 hover:text-neon-magenta">✕</button>
                    </div>
                  );
                })}
                <button onClick={() => analyze()} disabled={loading} className="btn-primary mt-2 w-full">
                  {loading ? "Analyzing…" : "Analyze playlist"}
                </button>
              </div>
            )}
          </div>

          <div className="panel p-5">
            <h3 className="mb-3 text-sm font-semibold text-white/80">Add from crate</h3>
            <div className="max-h-[360px] space-y-1.5 overflow-y-auto pr-1">
              {library.map((t) => (
                <button
                  key={t.id}
                  onClick={() => add(t.id)}
                  disabled={playlist.includes(t.id)}
                  className="flex w-full items-center gap-3 rounded-lg border border-white/5 px-3 py-2 text-left transition-colors hover:border-neon-cyan/30 hover:bg-white/5 disabled:opacity-30"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-white/90">{t.title}</div>
                    <div className="truncate text-xs text-white/40">{t.artist} · {t.genre}</div>
                  </div>
                  <span className="font-mono text-xs text-white/40">{t.bpm}</span>
                  <CamelotBadge keyCode={t.key} />
                  <span className="text-neon-cyan">+</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Analysis */}
        <div className="space-y-4">
          {!analysis && (
            <div className="panel flex h-full min-h-[300px] items-center justify-center p-10 text-center text-white/40">
              Analysis appears here once you analyze a playlist.
            </div>
          )}

          {analysis && analysis.trackCount > 0 && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Avg BPM" value={analysis.avgBpm} />
                <Stat label="Avg energy" value={analysis.avgEnergy} accent="#ff2bd6" />
                <Stat label="Flow" value={analysis.flowScore} accent="#b6ff3c" />
                <Stat label="Underground" value={analysis.undergroundScore} accent="#8b5cf6" />
              </div>

              <div className="panel space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white/80">Findings</h3>
                  <UndergroundPill score={analysis.undergroundScore} />
                </div>
                <ScoreBar value={analysis.flowScore} label="Overall flow" />
                <div className="space-y-2 pt-1">
                  {analysis.issues.map((iss, i) => (
                    <div key={i} className={`chip w-full justify-start rounded-lg px-3 py-2 text-left text-xs ${SEVERITY_STYLE[iss.severity]}`}>
                      <span className="font-mono uppercase opacity-70">{iss.severity}</span>
                      <span className="ml-1">{iss.message}</span>
                    </div>
                  ))}
                </div>
              </div>

              {analysis.suggestedOrder.length > 1 && (
                <div className="panel p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white/80">Suggested reorder</h3>
                    <button onClick={applyReorder} className="btn-ghost py-1.5 text-xs">Apply reorder</button>
                  </div>
                  <p className="mt-1 text-xs text-white/45">Greedy nearest-neighbour ordering for smoother transitions.</p>
                  <ol className="mt-3 flex flex-wrap gap-1.5">
                    {analysis.suggestedOrder.map((id, i) => {
                      const t = getTrack(id)!;
                      return (
                        <li key={id} className="chip border-white/10 bg-white/5 text-[11px] text-white/65">
                          <span className="font-mono text-white/30">{i + 1}</span> {t.title}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}

              {analysis.recommendations.length > 0 && (
                <div className="panel p-5">
                  <h3 className="mb-3 text-sm font-semibold text-white/80">Recommended additions</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {analysis.recommendations.map((r) => (
                      <TrackCard
                        key={r.track.id}
                        track={r.track}
                        score={r.score}
                        reasons={r.reasons}
                        action={
                          <button onClick={() => add(r.track.id)} className="text-xs font-medium text-neon-cyan hover:underline">
                            + Add
                          </button>
                        }
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
