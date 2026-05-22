import { parseLibraryExport } from "./csv";
import { parseRekordboxXml, parseTraktorNml } from "./xml";
import type { ImportResult } from "./track";

export type { ImportResult, LibraryFormat, Field } from "./track";
export { parseLibraryExport } from "./csv";
export { parseRekordboxXml, parseTraktorNml } from "./xml";

/**
 * Detect the export format and parse accordingly. Supports Rekordbox
 * collection XML, Traktor `.nml`, and CSV/TSV (Serato and generic exports).
 */
export function parseLibrary(text: string, filename?: string): ImportResult {
  const trimmed = text.trimStart();
  const head = trimmed.slice(0, 4000).toLowerCase();
  const ext = filename?.toLowerCase().split(".").pop();

  const looksXml = trimmed.startsWith("<?xml") || trimmed.startsWith("<") || ext === "xml" || ext === "nml";

  if (looksXml) {
    if (ext === "nml" || head.includes("<nml") || head.includes("traktor")) {
      return parseTraktorNml(text);
    }
    if (head.includes("dj_playlists") || head.includes("rekordbox") || head.includes("<collection")) {
      return parseRekordboxXml(text);
    }
    // Unknown XML — try both, keep whichever finds tracks.
    const rb = parseRekordboxXml(text);
    if (rb.tracks.length > 0) return rb;
    const tk = parseTraktorNml(text);
    if (tk.tracks.length > 0) return tk;
    return {
      tracks: [],
      warnings: ["Unrecognized XML. Supported: Rekordbox collection XML and Traktor .nml."],
      rowsParsed: 0,
      rowsSkipped: 0,
      format: "unknown",
    };
  }

  return parseLibraryExport(text);
}
