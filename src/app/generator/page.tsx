"use client";

import { useState } from "react";
import type { GeneratedSet, Genre, SetRequest, SetShape, Track } from "@/lib/types";
import { GENRES } from "@/lib/data/tracks";
import { generateSet, assembleSet, suggestReplacements } from "@/lib/engine";
import { useLibrary } from "@/lib/library/useLibrary";
import { useSavedSets } from "@/lib/library/useSavedSets";
import { formatTracklist, downloadText, slugify } from "@/lib/export/tracklist";
import { useToast } from "@/components/Toast";
import { CamelotBadge, EnergyMeter, ScoreBar, Stat } from "@/components/ui";
import { EnergyCurve } from "@/components/EnergyCurve";
import { PreviewButton } from "@/components/PreviewButton";

const SHAPES: { id: SetShape; label: string; desc: string }[] = [
  { id: "warmup", label: "Warmup", desc: "Slow steady build, never peaks" },
  { id: "peaktime", label: "Peak Time", desc: "Fast lift, sustained high, final surge" },
  { id: "journey", label: "Journey", desc: "Build → peak ~70% → resolve" },
  { id: "closing", label: "Closing", desc: "Comedown, ease the room down" },
];

function fmtDuration(sec: number): string {
  const m = Math.round(sec / 60);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

export default function GeneratorPage() {
  const { library, importedCount } = useLibrary();
  const { sets, saveSet, removeSet } = useSavedSets();
  const toast = useToast();
  const [durationMin, setDurationMin] = useState(60);
  const [shape, setShape] = useState<SetShape>("journey");
  const [genres, setGenres] = useState<Genre[]>(["Techno", "Melodic Techno"]);
  const [undergroundOnly, setUndergroundOnly] = useState(false);
  const [set, setSet] = useState<GeneratedSet | null>(null);
  const [lastRequest, setLastRequest] = useState<SetRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [edited, setEdited] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [swapPos, setSwapPos] = useState<number | null>(null);

  // Re-assemble the set from an edited track order; scores update live.
  function applyTracks(tracks: Track[]) {
    if (!set) return;
    setSet(assembleSet(tracks, set.shape));
    setEdited(true);
    setSwapPos(null);
  }

  function currentTracks(): Track[] {
    return set ? set.slots.map((s) => s.track) : [];
  }

  function reorder(from: number, to: number) {
    if (from === to) return;
    const tracks = currentTracks();
    const [moved] = tracks.splice(from, 1);
    tracks.splice(to, 0, moved);
    applyTracks(tracks);
  }

  function move(i: number, dir: -1 | 1) {
    const to = i + dir;
    if (to < 0 || to >= currentTracks().length) return;
    reorder(i, to);
  }

  function removeAt(i: number) {
    const tracks = currentTracks();
    tracks.splice(i, 1);
    applyTracks(tracks);
  }

  function replaceAt(i: number, track: Track) {
    const tracks = currentTracks();
    tracks[i] = track;
    applyTracks(tracks);
  }

  function toggleGenre(g: Genre) {
    setGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  function generate() {
    setLoading(true);
    const body: SetRequest = {
      durationMin,
      shape,
      genres: genres.length ? genres : undefined,
      maxPopularity: undergroundOnly ? 50 : undefined,
    };
    // Builds the set client-side against the full library (seed + imported).
    setSet(generateSet(library, body));
    setLastRequest(body);
    setEdited(false);
    setSwapPos(null);
    setLoading(false);
  }

  function save() {
    if (!set || !lastRequest) return;
    const name = saveName.trim() || `${shape} · ${durationMin}min`;
    saveSet(name, lastRequest, set);
    toast.success(`Saved "${name}".`);
    setSaveName("");
  }

  function load(id: string) {
    const saved = sets.find((s) => s.id === id);
    if (!saved) return;
    setDurationMin(saved.request.durationMin);
    setShape(saved.request.shape);
    setGenres(saved.request.genres ?? []);
    setUndergroundOnly(saved.request.maxPopularity !== undefined);
    setSet(saved.set);
    setLastRequest(saved.request);
    setEdited(false);
    setSwapPos(null);
  }

  function exportSet() {
    if (!set) return;
    const name = saveName.trim() || `SUBSONIC ${shape} set`;
    downloadText(`${slugify(name)}.txt`, formatTracklist(name, set));
    toast.success("Tracklist downloaded.");
  }

  return (
    <div className="space-y-7">
      <div>
        <span className="label-cap">Intelligent set creation</span>
        <h1 className="mt-1 text-3xl font-bold text-white">Set Builder</h1>
        <p className="mt-1 text-sm text-white/55">
          Pick a shape and length. The engine fits tracks to an energy curve and locks transitions harmonically.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Controls */}
        <div className="panel h-fit space-y-5 p-5">
          <div>
            <label className="label-cap flex justify-between">
              <span>Set length</span>
              <span className="font-mono text-white/60">{durationMin} min</span>
            </label>
            <input type="range" min={20} max={240} step={10} value={durationMin} onChange={(e) => setDurationMin(+e.target.value)} className="mt-2 w-full accent-neon-cyan" />
          </div>

          <div>
            <label className="label-cap">Set shape</label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {SHAPES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setShape(s.id)}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    shape === s.id
                      ? "border-neon-violet/50 bg-neon-violet/10 shadow-glow-violet"
                      : "border-white/10 bg-white/5 hover:border-white/25"
                  }`}
                >
                  <div className="text-sm font-semibold text-white">{s.label}</div>
                  <div className="mt-0.5 text-[11px] leading-snug text-white/45">{s.desc}</div>
                </button>
              ))}
            </div>
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

          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-white/70">
            <input type="checkbox" checked={undergroundOnly} onChange={(e) => setUndergroundOnly(e.target.checked)} className="h-4 w-4 accent-neon-violet" />
            Prioritize underground gems
          </label>

          <button onClick={generate} disabled={loading} className="btn-primary w-full">
            {loading ? "Building set…" : "Generate set →"}
          </button>
          <p className="text-center text-[11px] text-white/35">
            Drawing from {library.length} tracks
            {importedCount > 0 && <span className="text-neon-violet/80"> ({importedCount} imported)</span>}
          </p>

          {sets.length > 0 && (
            <div className="border-t border-white/5 pt-4">
              <div className="label-cap mb-2">Saved sets ({sets.length})</div>
              <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
                {sets.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-2 rounded-lg border border-white/5 bg-ink-800/50 px-3 py-2"
                  >
                    <button onClick={() => load(s.id)} className="min-w-0 flex-1 text-left">
                      <div className="truncate text-sm text-white/85">{s.name}</div>
                      <div className="truncate text-[11px] text-white/40">
                        {s.set.slots.length} tracks · flow {s.set.flowScore} ·{" "}
                        {new Date(s.createdAt).toLocaleDateString()}
                      </div>
                    </button>
                    <button
                      onClick={() => removeSet(s.id)}
                      className="shrink-0 text-white/30 hover:text-neon-magenta"
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Output */}
        <div className="space-y-5">
          {!set && (
            <div className="panel flex h-full min-h-[300px] items-center justify-center p-10 text-center text-white/40">
              Configure your set and hit generate.
            </div>
          )}

          {set && set.slots.length > 0 && (
            <>
              <div className="panel flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
                <input
                  className="input flex-1 py-2"
                  placeholder="Name this set…"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && save()}
                />
                <div className="flex gap-2">
                  <button onClick={save} className="btn-primary py-2 text-xs">Save set</button>
                  <button onClick={exportSet} className="btn-ghost py-2 text-xs">Export .txt</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Tracks" value={set.slots.length} />
                <Stat label="Runtime" value={fmtDuration(set.totalDurationSec)} accent="#8b5cf6" />
                <Stat label="Flow score" value={set.flowScore} accent="#b6ff3c" />
                <Stat label="Underground" value={set.undergroundScore} accent="#ff2bd6" />
              </div>

              <div className="panel p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white/80">Energy progression</h3>
                  <span className="chip border-white/10 bg-white/5 capitalize text-white/60">{set.shape}</span>
                </div>
                <EnergyCurve target={set.energyCurve} actual={set.slots.map((s) => s.track.energy)} />
              </div>

              <div className="panel divide-y divide-white/5">
                <div className="flex items-center justify-between px-4 py-2 text-[11px] text-white/40">
                  <span>Drag ⠿ to reorder · swap or remove any track — scores update live</span>
                  {edited && <span className="text-neon-amber/80">edited</span>}
                </div>
                {set.slots.map((slot) => (
                  <div
                    key={slot.position}
                    draggable
                    onDragStart={() => setDragIndex(slot.position)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragIndex !== null) reorder(dragIndex, slot.position);
                      setDragIndex(null);
                    }}
                    className={`p-4 transition-colors ${
                      dragIndex === slot.position ? "bg-white/5" : ""
                    }`}
                  >
                    {slot.transitionIn && (
                      <div className="mb-3 flex flex-wrap items-center gap-2 pl-1 text-[11px]">
                        <span className="text-white/30">↓ transition</span>
                        <span className={`chip ${slot.transitionIn.quality >= 70 ? "border-neon-lime/40 bg-neon-lime/10 text-neon-lime" : slot.transitionIn.quality >= 45 ? "border-neon-amber/40 bg-neon-amber/10 text-neon-amber" : "border-neon-magenta/40 bg-neon-magenta/10 text-neon-magenta"}`}>
                          {slot.transitionIn.quality}/100
                        </span>
                        <span className="text-white/45">{slot.transitionIn.harmonicRelation}</span>
                        <span className="font-mono text-white/35">
                          {slot.transitionIn.bpmDelta > 0 ? "+" : ""}{slot.transitionIn.bpmDelta} BPM
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <span className="cursor-grab select-none text-white/25 active:cursor-grabbing" title="Drag to reorder">⠿</span>
                      <span className="w-5 shrink-0 text-center font-mono text-sm text-white/30">{slot.position + 1}</span>
                      <PreviewButton track={slot.track} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold text-white">{slot.track.title}</div>
                        <div className="truncate text-sm text-white/50">{slot.track.artist} · {slot.track.label}</div>
                      </div>
                      <div className="hidden items-center gap-3 sm:flex">
                        <CamelotBadge keyCode={slot.track.key} />
                        <span className="font-mono text-sm text-white/60">{slot.track.bpm}</span>
                        <EnergyMeter value={slot.track.energy} />
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button onClick={() => move(slot.position, -1)} disabled={slot.position === 0} className="px-1.5 text-white/30 hover:text-white disabled:opacity-20" title="Move up">▲</button>
                        <button onClick={() => move(slot.position, 1)} disabled={slot.position === set.slots.length - 1} className="px-1.5 text-white/30 hover:text-white disabled:opacity-20" title="Move down">▼</button>
                        <button
                          onClick={() => setSwapPos(swapPos === slot.position ? null : slot.position)}
                          className={`ml-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${swapPos === slot.position ? "bg-neon-cyan/20 text-neon-cyan" : "text-neon-cyan/80 hover:bg-white/5"}`}
                          title="Swap for a suggested alternative"
                        >
                          Swap
                        </button>
                        <button onClick={() => removeAt(slot.position)} className="px-1.5 text-white/30 hover:text-neon-magenta" title="Remove">✕</button>
                      </div>
                    </div>

                    {swapPos === slot.position && (
                      <div className="mt-3 rounded-xl border border-neon-cyan/20 bg-ink-800/60 p-3">
                        <div className="mb-2 label-cap">Suggested replacements</div>
                        <div className="space-y-1.5">
                          {suggestReplacements(library, set, slot.position, 5).map((s) => (
                            <button
                              key={s.track.id}
                              onClick={() => replaceAt(slot.position, s.track)}
                              className="flex w-full items-center gap-3 rounded-lg border border-white/5 px-3 py-2 text-left transition-colors hover:border-neon-cyan/40 hover:bg-white/5"
                            >
                              <span className="shrink-0 rounded border border-neon-cyan/30 bg-neon-cyan/10 px-1.5 py-0.5 font-mono text-[10px] text-neon-cyan">{s.score}</span>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm text-white/90">{s.track.title}</div>
                                <div className="truncate text-[11px] text-white/45">{s.track.artist} · {s.reasons.join(" · ")}</div>
                              </div>
                              <CamelotBadge keyCode={s.track.key} />
                              <span className="font-mono text-xs text-white/50">{s.track.bpm}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="panel p-5">
                <ScoreBar value={set.flowScore} label="Average transition quality" />
                <div className="mt-3">
                  <ScoreBar value={set.undergroundScore} label="Underground depth" />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
