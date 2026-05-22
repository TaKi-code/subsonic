import type { Genre, Track } from "@/lib/types";

/**
 * Underground score 0-100. 100 = deepest hidden gem, 0 = mainstream anthem.
 * Driven primarily by inverse popularity, nudged by label/recency signals.
 */
export function undergroundScore(track: Track): number {
  const base = 100 - track.popularity;
  // Slightly reward niche descriptors and very recent or older deep cuts.
  const niche = track.tags.some((t) =>
    ["raw", "hypnotic", "dub", "outsider", "white label", "limited", "vinyl"].includes(
      t.toLowerCase(),
    ),
  )
    ? 6
    : 0;
  return clamp(base + niche, 0, 100);
}

/**
 * Genre adjacency graph. Higher = more compatible to blend within a set.
 * Symmetric; a genre is always 1.0 with itself.
 */
const GENRE_AFFINITY: Partial<Record<Genre, Partial<Record<Genre, number>>>> = {
  Techno: { "Melodic Techno": 0.8, "Peak Time Techno": 0.85, "Hard Techno": 0.7, "Dub Techno": 0.7, "Minimal / Deep Tech": 0.65, Electro: 0.55 },
  "Melodic Techno": { Techno: 0.8, "Progressive House": 0.75, Trance: 0.6, "Peak Time Techno": 0.6 },
  "Peak Time Techno": { Techno: 0.85, "Hard Techno": 0.8, "Melodic Techno": 0.6 },
  "Hard Techno": { "Peak Time Techno": 0.8, Techno: 0.7 },
  "Minimal / Deep Tech": { "Tech House": 0.8, Techno: 0.65, "Deep House": 0.6 },
  House: { "Deep House": 0.85, "Tech House": 0.85, "Afro House": 0.7, "Progressive House": 0.7 },
  "Deep House": { House: 0.85, "Afro House": 0.75, "Minimal / Deep Tech": 0.6, "Tech House": 0.7 },
  "Tech House": { House: 0.85, "Minimal / Deep Tech": 0.8, "Deep House": 0.7 },
  "Progressive House": { "Melodic Techno": 0.75, House: 0.7, Trance: 0.7 },
  "Afro House": { "Deep House": 0.75, House: 0.7 },
  Trance: { "Melodic Techno": 0.6, "Progressive House": 0.7 },
  Breakbeat: { Electro: 0.7, Techno: 0.5 },
  Electro: { Breakbeat: 0.7, Techno: 0.55 },
  "Dub Techno": { Techno: 0.7, Ambient: 0.5, "Minimal / Deep Tech": 0.6 },
  Ambient: { "Dub Techno": 0.5 },
};

export function genreAffinity(a: Genre, b: Genre): number {
  if (a === b) return 1;
  return GENRE_AFFINITY[a]?.[b] ?? GENRE_AFFINITY[b]?.[a] ?? 0.2;
}

/**
 * Match a free-text vibe query against a track's descriptors.
 * Returns 0-1. Naive token overlap — the seam where an LLM layer can plug in.
 */
export function vibeMatch(query: string, track: Track): number {
  const tokens = tokenize(query);
  if (tokens.length === 0) return 0;
  const haystack = new Set(
    [...track.tags, track.genre, track.subgenre ?? "", track.artist, track.label]
      .flatMap(tokenize),
  );
  let hits = 0;
  for (const t of tokens) {
    if (haystack.has(t)) hits += 1;
    else if ([...haystack].some((h) => h.includes(t) || t.includes(h))) hits += 0.5;
  }
  return clamp(hits / tokens.length, 0, 1);
}

/**
 * Similarity 0-1 between two tracks across the dimensions DJs care about:
 * genre, BPM, key proximity, energy, era, and shared descriptors.
 */
export function trackSimilarity(a: Track, b: Track): number {
  if (a.id === b.id) return 1;
  const genre = genreAffinity(a.genre, b.genre);
  const bpm = 1 - Math.min(Math.abs(a.bpm - b.bpm) / 16, 1);
  const energy = 1 - Math.min(Math.abs(a.energy - b.energy) / 6, 1);
  const era = 1 - Math.min(Math.abs(a.year - b.year) / 15, 1);
  const sharedTags = jaccard(new Set(a.tags), new Set(b.tags));
  const sameLabel = a.label === b.label ? 1 : 0;

  return clamp(
    genre * 0.34 +
      bpm * 0.22 +
      energy * 0.18 +
      sharedTags * 0.14 +
      era * 0.06 +
      sameLabel * 0.06,
    0,
    1,
  );
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function jaccard<T>(a: Set<T>, b: Set<T>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  return inter / (a.size + b.size - inter || 1);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
