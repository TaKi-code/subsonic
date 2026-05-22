import type { Track } from "@/lib/types";
import { toCamelot } from "./keys";
import {
  buildTrack,
  energyFromComment,
  parseBpm,
  type Field,
  type ImportResult,
} from "./track";

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
    return { tracks: [], warnings: ["File has no data rows."], rowsParsed: 0, rowsSkipped: 0, format: "csv", detectedColumns: {} };
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
    const key = toCamelot(rawKey);
    if (!key && rawKey) unparsedKeys++;

    const directEnergy = parseInt(get("energy"), 10);
    const energy =
      directEnergy >= 1 && directEnergy <= 10 ? directEnergy : energyFromComment(get("comments"));

    tracks.push(
      buildTrack({
        title,
        artist: get("artist"),
        label: get("label"),
        genre: get("genre"),
        bpm,
        key,
        energy,
        year: parseYear(get("year")),
        durationSec: parseDuration(get("duration")),
      }),
    );
  }

  if (unparsedKeys > 0) warnings.push(`${unparsedKeys} track(s) had an unrecognized key — defaulted to 8A.`);
  if (skipped > 0) warnings.push(`${skipped} row(s) skipped (missing title or BPM).`);

  return { tracks, warnings, rowsParsed: tracks.length, rowsSkipped: skipped, format: "csv", detectedColumns };
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

function parseYear(raw: string): number | null {
  const m = /(19|20)\d{2}/.exec(raw);
  return m ? parseInt(m[0], 10) : null;
}

function parseDuration(raw: string): number | null {
  if (!raw) return null;
  const parts = raw.split(":").map((p) => parseInt(p, 10));
  if (parts.some((p) => isNaN(p))) {
    const secs = parseInt(raw, 10);
    return isNaN(secs) ? null : secs;
  }
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || null;
}
