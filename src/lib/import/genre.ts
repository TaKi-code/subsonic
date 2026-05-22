import type { Genre } from "@/lib/types";

// Ordered most-specific-first: "tech house" must beat "house", etc.
const GENRE_RULES: [RegExp, Genre][] = [
  [/tech\s*house/i, "Tech House"],
  [/deep\s*house/i, "Deep House"],
  [/afro/i, "Afro House"],
  [/prog/i, "Progressive House"],
  [/melodic/i, "Melodic Techno"],
  [/peak/i, "Peak Time Techno"],
  [/(hard\s*techno|hardgroove|schranz)/i, "Hard Techno"],
  [/dub\s*techno/i, "Dub Techno"],
  [/(minimal|deep\s*tech)/i, "Minimal / Deep Tech"],
  [/electro/i, "Electro"],
  [/(breakbeat|breaks|break\s)/i, "Breakbeat"],
  [/trance/i, "Trance"],
  [/ambient/i, "Ambient"],
  [/techno/i, "Techno"],
  [/house/i, "House"],
];

/**
 * Map a free-text genre string from an export to the platform's Genre union.
 * Falls back to "Techno" so the engine always has a usable category; callers
 * should preserve the original string as a tag.
 */
export function normalizeGenre(raw: string): Genre {
  const s = (raw || "").trim();
  for (const [pattern, genre] of GENRE_RULES) {
    if (pattern.test(s)) return genre;
  }
  return "Techno";
}
