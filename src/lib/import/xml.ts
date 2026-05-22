import type { Track } from "@/lib/types";
import { toCamelot, fromTraktorKeyValue } from "./keys";
import { buildTrack, energyFromComment, parseBpm, type ImportResult } from "./track";

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

/** Read an attribute value from an opening-tag string. */
function getAttr(tag: string, name: string): string {
  const m = new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, "i").exec(tag);
  return m ? decodeEntities(m[1]) : "";
}

function intOrNull(raw: string): number | null {
  const n = parseInt(raw, 10);
  return isNaN(n) ? null : n;
}

/**
 * Parse a Rekordbox collection XML export (`File → Export Collection in xml`).
 * Tracks live as self-closing <TRACK .../> elements inside <COLLECTION>.
 */
export function parseRekordboxXml(text: string): ImportResult {
  const warnings: string[] = [];
  const collection = /<COLLECTION\b[\s\S]*?<\/COLLECTION>/i.exec(text);
  const scope = collection ? collection[0] : text;
  const trackTags = scope.match(/<TRACK\b[^>]*\/?>/gi) ?? [];

  const tracks: Track[] = [];
  let skipped = 0;
  let unparsedKeys = 0;

  for (const tag of trackTags) {
    const title = getAttr(tag, "Name");
    if (!title) continue; // playlist references / non-collection rows have no Name

    const bpm = parseBpm(getAttr(tag, "AverageBpm"));
    if (bpm === null) {
      skipped++;
      continue;
    }

    const rawKey = getAttr(tag, "Tonality");
    const key = toCamelot(rawKey);
    if (!key && rawKey) unparsedKeys++;

    tracks.push(
      buildTrack({
        title,
        artist: getAttr(tag, "Artist"),
        label: getAttr(tag, "Label"),
        genre: getAttr(tag, "Genre"),
        bpm,
        key,
        energy: energyFromComment(getAttr(tag, "Comments")),
        year: intOrNull(getAttr(tag, "Year")),
        durationSec: intOrNull(getAttr(tag, "TotalTime")),
      }),
    );
  }

  if (tracks.length === 0) {
    warnings.push("No tracks found — is this a Rekordbox collection XML export?");
  }
  if (unparsedKeys > 0) warnings.push(`${unparsedKeys} track(s) had an unrecognized key — defaulted to 8A.`);
  if (skipped > 0) warnings.push(`${skipped} track(s) skipped (missing BPM).`);

  return { tracks, warnings, rowsParsed: tracks.length, rowsSkipped: skipped, format: "rekordbox" };
}

/**
 * Parse a Traktor `.nml` collection. Each <ENTRY> carries TITLE/ARTIST, with
 * child <INFO> (genre/label/playtime/key text), <TEMPO> (BPM), and
 * <MUSICAL_KEY> (numeric key) elements.
 */
export function parseTraktorNml(text: string): ImportResult {
  const warnings: string[] = [];
  const entries = text.match(/<ENTRY\b[\s\S]*?<\/ENTRY>/gi) ?? [];

  const tracks: Track[] = [];
  let skipped = 0;
  let unparsedKeys = 0;

  for (const entry of entries) {
    const head = /<ENTRY\b[^>]*>/i.exec(entry)?.[0] ?? "";
    const info = /<INFO\b[^>]*\/?>/i.exec(entry)?.[0] ?? "";
    const tempo = /<TEMPO\b[^>]*\/?>/i.exec(entry)?.[0] ?? "";
    const musicalKey = /<MUSICAL_KEY\b[^>]*\/?>/i.exec(entry)?.[0] ?? "";

    const title = getAttr(head, "TITLE");
    if (!title) {
      skipped++;
      continue;
    }

    const bpm = parseBpm(getAttr(tempo, "BPM"));
    if (bpm === null) {
      skipped++;
      continue;
    }

    // Prefer the textual key; fall back to Traktor's numeric MUSICAL_KEY.
    const keyText = getAttr(info, "KEY");
    let key = keyText ? toCamelot(keyText) : null;
    const keyValueRaw = getAttr(musicalKey, "VALUE");
    if (!key && keyValueRaw) {
      const v = parseInt(keyValueRaw, 10);
      if (!isNaN(v)) key = fromTraktorKeyValue(v);
    }
    if (!key && (keyText || keyValueRaw)) unparsedKeys++;

    const releaseYear = /(19|20)\d{2}/.exec(getAttr(info, "RELEASE_DATE"))?.[0];

    tracks.push(
      buildTrack({
        title,
        artist: getAttr(head, "ARTIST"),
        label: getAttr(info, "LABEL"),
        genre: getAttr(info, "GENRE"),
        bpm,
        key,
        energy: energyFromComment(getAttr(info, "COMMENT")),
        year: releaseYear ? parseInt(releaseYear, 10) : null,
        durationSec: intOrNull(getAttr(info, "PLAYTIME")),
      }),
    );
  }

  if (tracks.length === 0) {
    warnings.push("No tracks found — is this a Traktor .nml collection?");
  }
  if (unparsedKeys > 0) warnings.push(`${unparsedKeys} track(s) had an unrecognized key — defaulted to 8A.`);
  if (skipped > 0) warnings.push(`${skipped} track(s) skipped (missing title or BPM).`);

  return { tracks, warnings, rowsParsed: tracks.length, rowsSkipped: skipped, format: "traktor" };
}
