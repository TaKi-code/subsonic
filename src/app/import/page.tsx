"use client";

import { useRef, useState } from "react";
import { parseLibrary, type ImportResult, type LibraryFormat } from "@/lib/import";
import { useLibrary } from "@/lib/library/useLibrary";
import { CamelotBadge, EnergyMeter } from "@/components/ui";

const FORMAT_LABEL: Record<LibraryFormat, string> = {
  csv: "CSV / TSV",
  rekordbox: "Rekordbox XML",
  traktor: "Traktor NML",
  unknown: "Unrecognized",
};

const SAMPLE_CSV = `name,artist,bpm,key,genre,label,time,comment
Submerged,Vault Theory,132,Am,Techno,Semantica,6:48,Energy 7
Nightshift,Pulsar,128,8B,Tech House,Hot Creations,5:30,Energy 6
Aurora Pull,Mira Sole,124,Gbm,Melodic Techno,Innervisions,7:12,Energy 6
Concrete Rain,Korridor,136,7A,Hard Techno,Mord,6:05,Energy 9
Deep Current,Echo Marl,122,Dm,Dub Techno,Echocord,8:00,Energy 4`;

export default function ImportPage() {
  const { imported, importedCount, seedCount, addTracks, clearImported } = useLibrary();
  const [text, setText] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [justImported, setJustImported] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  function preview(raw: string, name?: string) {
    setText(raw);
    setFileName(name ?? null);
    setJustImported(0);
    setResult(raw.trim() ? parseLibrary(raw, name) : null);
  }

  async function onFile(file: File) {
    const raw = await file.text();
    preview(raw, file.name);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  }

  function confirmImport() {
    if (!result || result.tracks.length === 0) return;
    addTracks(result.tracks);
    setJustImported(result.tracks.length);
    setResult(null);
    setText("");
    setFileName(null);
  }

  const cols = result?.detectedColumns ?? {};

  return (
    <div className="space-y-7">
      <div>
        <span className="label-cap">Bring your own crate</span>
        <h1 className="mt-1 text-3xl font-bold text-white">Import library</h1>
        <p className="mt-1 max-w-2xl text-sm text-white/55">
          Drop a <span className="text-white/80">Rekordbox XML</span>, <span className="text-white/80">Traktor .nml</span>,
          or CSV/TSV export (Serato &amp; others). The importer auto-detects the format and converts
          musical/Open-Key notation to Camelot. Everything stays in your browser — your tracks then
          flow through Discover, the Set Builder, and the Analyzer.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="chip border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
          {seedCount} seed tracks
        </span>
        <span className="chip border-neon-violet/30 bg-neon-violet/10 text-neon-violet">
          {importedCount} imported
        </span>
        {importedCount > 0 && (
          <button onClick={clearImported} className="text-xs text-white/40 hover:text-neon-magenta">
            Clear imported
          </button>
        )}
      </div>

      {justImported > 0 && (
        <div className="panel border-neon-lime/30 bg-neon-lime/5 p-4 text-sm text-neon-lime">
          ✓ Imported {justImported} track(s). They&apos;re now part of your crate across the app.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Input */}
        <div className="space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className="panel panel-hover flex cursor-pointer flex-col items-center justify-center gap-2 border-dashed p-10 text-center"
          >
            <div className="text-3xl text-white/30">⇪</div>
            <div className="text-sm font-medium text-white/80">
              {fileName ? fileName : "Drop a file or click to browse"}
            </div>
            <div className="text-xs text-white/40">.xml · .nml · .csv · .txt — Rekordbox / Traktor / Serato exports</div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt,.tsv,.xml,.nml,text/csv,text/plain,text/xml,application/xml"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            />
          </div>

          <div>
            <label className="label-cap flex items-center justify-between">
              <span>…or paste export text</span>
              <button
                onClick={() => preview(SAMPLE_CSV, "sample.csv")}
                className="text-[11px] text-neon-cyan hover:underline"
              >
                Load sample
              </button>
            </label>
            <textarea
              className="input mt-2 h-40 resize-none font-mono text-xs"
              placeholder="name,artist,bpm,key,genre,..."
              value={text}
              onChange={(e) => preview(e.target.value)}
            />
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-4">
          {!result && (
            <div className="panel flex h-full min-h-[300px] items-center justify-center p-10 text-center text-white/40">
              A preview of detected tracks appears here.
            </div>
          )}

          {result && (
            <>
              <div className="panel space-y-3 p-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white/80">
                      Detected {result.rowsParsed} track(s)
                    </h3>
                    <span className="chip border-neon-cyan/30 bg-neon-cyan/10 text-[10px] text-neon-cyan">
                      {FORMAT_LABEL[result.format]}
                    </span>
                  </div>
                  <button
                    onClick={confirmImport}
                    disabled={result.rowsParsed === 0}
                    className="btn-primary py-2 text-xs"
                  >
                    Import {result.rowsParsed} →
                  </button>
                </div>

                {result.format === "csv" && (
                  <div className="flex flex-wrap gap-1.5">
                    {(["title", "artist", "bpm", "key", "genre", "energy", "label", "duration"] as const).map(
                      (f) => (
                        <span
                          key={f}
                          className={`chip text-[10px] ${
                            cols[f]
                              ? "border-neon-lime/30 bg-neon-lime/10 text-neon-lime"
                              : "border-white/10 bg-white/5 text-white/30"
                          }`}
                          title={cols[f] ? `mapped from "${cols[f]}"` : "not found"}
                        >
                          {cols[f] ? "✓" : "—"} {f}
                        </span>
                      ),
                    )}
                  </div>
                )}

                {result.warnings.length > 0 && (
                  <ul className="space-y-1">
                    {result.warnings.map((w, i) => (
                      <li key={i} className="text-[11px] text-neon-amber/90">⚠ {w}</li>
                    ))}
                  </ul>
                )}
              </div>

              {result.tracks.length > 0 && (
                <div className="panel max-h-[360px] divide-y divide-white/5 overflow-y-auto">
                  {result.tracks.slice(0, 50).map((t) => (
                    <div key={t.id} className="flex items-center gap-3 p-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm text-white/90">{t.title}</div>
                        <div className="truncate text-xs text-white/45">
                          {t.artist} · {t.genre}
                          {t.subgenre && t.subgenre.toLowerCase() !== t.genre.toLowerCase()
                            ? ` (${t.subgenre})`
                            : ""}
                        </div>
                      </div>
                      <CamelotBadge keyCode={t.key} />
                      <span className="font-mono text-xs text-white/50">{t.bpm}</span>
                      <EnergyMeter value={t.energy} />
                    </div>
                  ))}
                  {result.tracks.length > 50 && (
                    <div className="p-3 text-center text-xs text-white/40">
                      + {result.tracks.length - 50} more
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {imported.length > 0 && (
        <div className="panel p-5">
          <h3 className="mb-3 text-sm font-semibold text-white/80">Your imported crate ({imported.length})</h3>
          <div className="flex flex-wrap gap-1.5">
            {imported.slice(0, 60).map((t) => (
              <span key={t.id} className="chip border-white/10 bg-white/5 text-[11px] text-white/55">
                {t.title} <span className="font-mono text-white/30">{t.key}·{t.bpm}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
