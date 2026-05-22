import type { CamelotKey, Genre, Source, Track } from "@/lib/types";
import { normalizeGenre } from "./genre";

export type LibraryFormat = "csv" | "rekordbox" | "traktor" | "unknown";

export type Field =
  | "title"
  | "artist"
  | "bpm"
  | "key"
  | "genre"
  | "label"
  | "year"
  | "duration"
  | "energy"
  | "comments";

export interface ImportResult {
  tracks: Track[];
  warnings: string[];
  rowsParsed: number;
  rowsSkipped: number;
  format: LibraryFormat;
  /** CSV only: which library columns were detected, for UI feedback. */
  detectedColumns?: Partial<Record<Field, string>>;
}

/** Pre-resolved fields from a parser, before applying shared defaults. */
export interface RawTrack {
  title: string;
  artist?: string;
  label?: string;
  genre?: string;
  bpm: number;
  key: CamelotKey | null;
  energy?: number | null;
  year?: number | null;
  durationSec?: number | null;
}

/**
 * Build a Track from parser output, applying the conventions shared across all
 * import formats: genre normalization, neutral defaults for unknown fields,
 * "imported" tagging, and a stable, dedupe-able id.
 */
export function buildTrack(r: RawTrack): Track {
  const genre: Genre = normalizeGenre(r.genre || "");
  const tags = ["imported"];
  if (r.genre && r.genre.trim() && r.genre.toLowerCase() !== genre.toLowerCase()) {
    tags.push(r.genre.trim().toLowerCase());
  }
  const artist = r.artist?.trim() || "Unknown Artist";
  const energy = r.energy && r.energy >= 1 && r.energy <= 10 ? r.energy : 5;

  return {
    id: `imp-${hash(`${artist}|${r.title}|${r.bpm}`)}`,
    title: r.title.trim(),
    artist,
    label: r.label?.trim() || "Unknown",
    genre,
    subgenre: r.genre?.trim() || undefined,
    bpm: r.bpm,
    key: r.key ?? "8A",
    // Imported tracks have unknown popularity; treat as the DJ's own crate
    // (leaning underground) rather than mainstream.
    popularity: 35,
    energy,
    year: r.year && r.year > 1900 ? r.year : 2020,
    durationSec: r.durationSec && r.durationSec > 0 ? Math.round(r.durationSec) : 360,
    sources: ["Local"] as Source[],
    tags,
  };
}

/** Parse and sanitize a BPM string into a sane DJ range, or null. */
export function parseBpm(raw: string): number | null {
  const n = parseFloat((raw || "").replace(",", "."));
  if (!isFinite(n) || n < 60 || n > 250) return null;
  let bpm = n;
  if (bpm < 90) bpm *= 2; // off-grid half-tempo
  if (bpm > 200) bpm /= 2; // off-grid double-tempo
  return Math.round(bpm);
}

/** Extract a Mixed In Key style "Energy 7" value from a comment, or null. */
export function energyFromComment(comments: string): number | null {
  const m = /energy\s*(?:level)?\s*(\d{1,2})/i.exec(comments || "");
  if (m) {
    const e = parseInt(m[1], 10);
    if (e >= 1 && e <= 10) return e;
  }
  return null;
}

/** Small deterministic string hash for stable, dedupe-able track ids. */
export function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
