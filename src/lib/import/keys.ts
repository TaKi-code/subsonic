import type { CamelotKey } from "@/lib/types";

// Musical key (root + minor mode) -> Camelot. "A" suffix = minor on the wheel.
const MINOR_TO_CAMELOT: Record<string, CamelotKey> = {
  A: "8A", "A#": "3A", Bb: "3A", B: "10A", C: "5A", "C#": "12A", Db: "12A",
  D: "7A", "D#": "2A", Eb: "2A", E: "9A", F: "4A", "F#": "11A", Gb: "11A",
  G: "6A", "G#": "1A", Ab: "1A",
};

// Musical key (root + major mode) -> Camelot. "B" suffix = major on the wheel.
const MAJOR_TO_CAMELOT: Record<string, CamelotKey> = {
  C: "8B", "C#": "3B", Db: "3B", D: "10B", "D#": "5B", Eb: "5B", E: "12B",
  F: "7B", "F#": "2B", Gb: "2B", G: "9B", "G#": "4B", Ab: "4B", A: "11B",
  "A#": "6B", Bb: "6B", B: "1B",
};

function wrap12(n: number): number {
  return ((n - 1) % 12 + 12) % 12 + 1;
}

// Chromatic note order from C, used to decode Traktor's numeric key field.
const NOTE_INDEX = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** Look up the Camelot key for a musical root note + mode. */
export function noteToCamelot(root: string, isMinor: boolean): CamelotKey | null {
  return (isMinor ? MINOR_TO_CAMELOT : MAJOR_TO_CAMELOT)[root] ?? null;
}

/**
 * Decode Traktor's MUSICAL_KEY VALUE (0-23): 0-11 are major keys and 12-23 are
 * minor keys, both chromatic from C. Returns Camelot, or null if out of range.
 */
export function fromTraktorKeyValue(value: number): CamelotKey | null {
  if (!Number.isInteger(value) || value < 0 || value > 23) return null;
  const isMinor = value >= 12;
  const root = NOTE_INDEX[value % 12];
  return noteToCamelot(root, isMinor);
}

/**
 * Convert a key string from a DJ-software export into Camelot notation.
 * Handles Camelot ("8A"), Open Key ("1m"/"1d"), and musical notation
 * ("Am", "F#m", "Gbm", "C", "Db", with unicode ♯/♭ and "min"/"maj" suffixes).
 * Returns null if the key can't be parsed.
 */
export function toCamelot(raw: string): CamelotKey | null {
  if (!raw) return null;
  const s = raw.trim().replace(/[♯]/g, "#").replace(/[♭]/g, "b");

  // Already Camelot, e.g. "8A" / "12b".
  const camelot = /^(\d{1,2})\s*([AB])$/i.exec(s);
  if (camelot) {
    const num = Number(camelot[1]);
    if (num >= 1 && num <= 12) return `${num}${camelot[2].toUpperCase()}` as CamelotKey;
  }

  // Open Key notation, e.g. "1m" (minor) / "1d" (major). Camelot = OpenKey + 7.
  const openKey = /^(\d{1,2})\s*([dm])$/i.exec(s);
  if (openKey) {
    const num = Number(openKey[1]);
    if (num >= 1 && num <= 12) {
      const camelotNum = wrap12(num + 7);
      const letter = openKey[2].toLowerCase() === "m" ? "A" : "B";
      return `${camelotNum}${letter}` as CamelotKey;
    }
  }

  // Musical notation. Extract root (letter + optional accidental) and mode.
  const musical = /^([A-G])\s*([#b]?)\s*(.*)$/i.exec(s);
  if (!musical) return null;
  const root = musical[1].toUpperCase() + (musical[2] || "");
  const rest = musical[3].toLowerCase();
  const isMinor = /maj/.test(rest) ? false : /^(m|min|-)/.test(rest);

  const table = isMinor ? MINOR_TO_CAMELOT : MAJOR_TO_CAMELOT;
  return table[root] ?? null;
}
