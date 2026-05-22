import type { Track, Genre, Source } from "@/lib/types";
import { toCamelot } from "./keys";
import { normalizeGenre } from "./genre";

export interface ImportResult {
  tracks: Track[];
  warnings: string[];
  rowsParsed: number;
  rowsSkipped: number;
  /** Which library columns were detected, for UI feedback. */
  detectedColumns: Partial<Record<Field, string>>;
}

type Field =
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

// Header aliases across Rekordbox / Serato / Traktor / generic exports.
const HEADER_ALIASES: Record<Field, string[]> = {
  title: ["track title", "title", "name", "song", "trackname"],
  artist: ["artist", "artists", "artist name"],
  bpm: ["bpm", "tempo"],
  key: ["key", "tonality", "initial key"],
  genre: ["genre", "grouping"],
  label: ["label", "publisher", "record label"],
  year: ["year", "date", "release date", "added"],
  duration: ["time", "duration", "length", "track time"],
  energy: ["energy", "energy level"],
  comments: ["comment", "comments", "my tag", "mytag", "remix"],
};

/** Parse the text of a CSV/TSV export into Track records. */
export function parseLibraryExport(text: string): ImportResult {
  const warnings: string[] = [];
  const lines = text.split(/\r\n|\r|\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { tracks: [], warnings: ["File has no data rows."], rowsParsed: 0, rowsSkipped: 0, detectedColumns: {} };
  }

  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headerCells = splitRow(lines[0], delimiter).map((h) => h.trim().toLowerCase());
  const colIndex = mapColumns(headerCells);
  const detectedColumns = describeColumns(colIndex, headerCells);

  if (colIndex.title === undefined) {
    warnings.push("No title column found — using the first column as the track title.");
    colIndex.title = 0;
  }
  if (colIndex.bpm === undefined) {
    warnings.push("No BPM column detected. Rows without a BPM will be skipped.");
  }
  if (colIndex.key === undefined) {
    warnings.push("No key column detected. Harmonic mixing will be limited for these tracks.");
  }

  const tracks: Track[] = [];
  let skipped = 0;
  let unparsedKeys = 0;

  for (let i = 1; i < lines.length; i++) {
    const cells = splitRow(lines[i], delimiter);
    const get = (f: Field) => (colIndex[f] !== undefined ? (cells[colIndex[f]!] ?? "").trim() : "");

    const title = get("title");
    const bpm = parseBpm(get("bpm"));
    if (!title || bpm === null) {
      skipped++;
      continue;
    }

    const rawKey = get("key");
    let camelot = toCamelot(rawKey);
    if (!camelot) {
      camelot = "8A"; // neutral default so the engine still runs
      if (rawKey) unparsedKeys++;
    }

    const rawGenre = get("genre");
    const genre: Genre = normalizeGenre(rawGenre);
    const comments = get("comments");
    const energy = parseEnergy(get("energy"), comments);

    const tags = ["imported"];
    if (rawGenre && rawGenre.toLowerCase() !== genre.toLowerCase()) tags.push(rawGenre.toLowerCase());

    const artist = get("artist") || "Unknown Artist";
    tracks.push({
      id: `imp-${hash(`${artist}|${title}|${bpm}`)}`,
      title,
      artist,
      label: get("label") || "Unknown",
      genre,
      subgenre: rawGenre || undefined,
      bpm,
      key: camelot,
      energy,
      // Imported tracks have unknown popularity; treat as the DJ's own crate
      // (leaning underground) rather than mainstream.
      popularity: 35,
      year: parseYear(get("year")),
      durationSec: parseDuration(get("duration")),
      sources: ["Local"] as Source[],
      tags,
    });
  }

  if (unparsedKeys > 0) {
    warnings.push(`${unparsedKeys} track(s) had an unrecognized key — defaulted to 8A.`);
  }
  if (skipped > 0) {
    warnings.push(`${skipped} row(s) skipped (missing title or BPM).`);
  }

  return { tracks, warnings, rowsParsed: tracks.length, rowsSkipped: skipped, detectedColumns };
}

function mapColumns(headers: string[]): Partial<Record<Field, number>> {
  const result: Partial<Record<Field, number>> = {};
  (Object.keys(HEADER_ALIASES) as Field[]).forEach((field) => {
    const idx = headers.findIndex((h) => HEADER_ALIASES[field].includes(h));
    if (idx >= 0) result[field] = idx;
  });
  return result;
}

function describeColumns(
  colIndex: Partial<Record<Field, number>>,
  headers: string[],
): Partial<Record<Field, string>> {
  const out: Partial<Record<Field, string>> = {};
  (Object.keys(colIndex) as Field[]).forEach((f) => {
    const idx = colIndex[f];
    if (idx !== undefined && headers[idx]) out[f] = headers[idx];
  });
  return out;
}

/** Split one CSV/TSV row, honoring double-quoted fields for comma-delimited files. */
function splitRow(line: string, delimiter: string): string[] {
  if (delimiter === "\t") return line.split("\t");

  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells;
}

function parseBpm(raw: string): number | null {
  const n = parseFloat(raw.replace(",", "."));
  if (!isFinite(n) || n < 60 || n > 250) return null;
  // Halve/double obviously off-grid tempos into a sane DJ range.
  let bpm = n;
  if (bpm < 90) bpm *= 2;
  if (bpm > 200) bpm /= 2;
  return Math.round(bpm);
}

function parseEnergy(rawEnergy: string, comments: string): number {
  const direct = parseInt(rawEnergy, 10);
  if (direct >= 1 && direct <= 10) return direct;
  // Mixed In Key writes "Energy 7" / "Energy Level 8" into comments.
  const m = /energy\s*(?:level)?\s*(\d{1,2})/i.exec(comments);
  if (m) {
    const e = parseInt(m[1], 10);
    if (e >= 1 && e <= 10) return e;
  }
  return 5; // neutral default
}

function parseYear(raw: string): number {
  const m = /(19|20)\d{2}/.exec(raw);
  return m ? parseInt(m[0], 10) : 2020;
}

function parseDuration(raw: string): number {
  if (!raw) return 360;
  const parts = raw.split(":").map((p) => parseInt(p, 10));
  if (parts.some((p) => isNaN(p))) {
    const secs = parseInt(raw, 10);
    return isNaN(secs) ? 360 : secs;
  }
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 360;
}

/** Small deterministic string hash for stable, dedupe-able track ids. */
function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
