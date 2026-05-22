import type { DiscoveryFilters, ScoredTrack, Track } from "@/lib/types";
import { trackSimilarity, undergroundScore, vibeMatch } from "./scoring";

/**
 * Filter and rank tracks against discovery criteria. Returns scored matches
 * with human-readable reasons, best first.
 */
export function discover(tracks: Track[], filters: DiscoveryFilters): ScoredTrack[] {
  const seed = filters.similarToId
    ? tracks.find((t) => t.id === filters.similarToId)
    : undefined;

  const results: ScoredTrack[] = [];

  for (const track of tracks) {
    if (seed && track.id === seed.id) continue;
    if (!passesHardFilters(track, filters)) continue;

    const reasons: string[] = [];
    let score = 50; // neutral baseline

    if (seed) {
      const sim = trackSimilarity(seed, track);
      score = sim * 70;
      if (sim > 0.6) reasons.push(`${Math.round(sim * 100)}% similar to "${seed.title}"`);
    }

    if (filters.vibe) {
      const v = vibeMatch(filters.vibe, track);
      score += v * 30;
      if (v > 0.3) reasons.push(`Matches vibe "${filters.vibe}"`);
    }

    // Reward hidden gems when the digger asks for underground.
    const ug = undergroundScore(track);
    if (filters.maxPopularity !== undefined) {
      score += (ug / 100) * 18;
      if (ug >= 70) reasons.push("Hidden gem");
    }

    if (filters.genres?.includes(track.genre)) reasons.push(track.genre);
    if (filters.labels?.some((l) => eq(l, track.label))) reasons.push(`Label: ${track.label}`);
    if (filters.artists?.some((a) => eq(a, track.artist))) reasons.push(`Artist: ${track.artist}`);

    if (reasons.length === 0) reasons.push(`${track.bpm} BPM · ${track.key} · energy ${track.energy}`);

    results.push({ track, score: clamp(Math.round(score), 0, 100), reasons });
  }

  results.sort((a, b) => b.score - a.score || a.track.popularity - b.track.popularity);
  return results.slice(0, filters.limit ?? 24);
}

function passesHardFilters(t: Track, f: DiscoveryFilters): boolean {
  if (f.genres?.length && !f.genres.includes(t.genre)) return false;
  if (f.bpmMin !== undefined && t.bpm < f.bpmMin) return false;
  if (f.bpmMax !== undefined && t.bpm > f.bpmMax) return false;
  if (f.keys?.length && !f.keys.includes(t.key)) return false;
  if (f.energyMin !== undefined && t.energy < f.energyMin) return false;
  if (f.energyMax !== undefined && t.energy > f.energyMax) return false;
  if (f.labels?.length && !f.labels.some((l) => eq(l, t.label))) return false;
  if (f.artists?.length && !f.artists.some((a) => eq(a, t.artist))) return false;
  if (f.maxPopularity !== undefined && t.popularity > f.maxPopularity) return false;
  return true;
}

function eq(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
