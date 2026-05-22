import type { Track, Transition } from "@/lib/types";
import { harmonicCompatibility } from "./harmony";
import { genreAffinity } from "./scoring";

/**
 * Evaluate the quality of mixing `from` into `to`. Combines harmonic
 * compatibility, BPM proximity, energy continuity, and genre affinity.
 */
export function evaluateTransition(from: Track, to: Track): Transition {
  const harmonic = harmonicCompatibility(from.key, to.key);
  const bpmDelta = to.bpm - from.bpm;
  const energyDelta = to.energy - from.energy;

  // BPM: within ~3% is seamless; tempo jumps degrade fast.
  const bpmPct = Math.abs(bpmDelta) / from.bpm;
  const bpmScore = clamp(100 - bpmPct * 100 * 6, 0, 100);

  // Energy: small lifts are ideal; big swings (either way) hurt flow.
  const energyScore = clamp(100 - Math.abs(energyDelta) * 14, 0, 100);

  const genreScore = genreAffinity(from.genre, to.genre) * 100;

  const quality = Math.round(
    harmonic.quality * 0.42 +
      bpmScore * 0.28 +
      energyScore * 0.2 +
      genreScore * 0.1,
  );

  const notes: string[] = [];
  if (Math.abs(bpmDelta) <= 2) notes.push("Beatmatch is effortless (≤2 BPM)");
  else if (Math.abs(bpmDelta) >= 6) notes.push(`Large tempo move (${bpmDelta > 0 ? "+" : ""}${bpmDelta} BPM) — consider a tempo blend`);
  if (energyDelta >= 1) notes.push(`Energy lift +${round1(energyDelta)}`);
  else if (energyDelta <= -1) notes.push(`Energy drop ${round1(energyDelta)}`);
  if (harmonic.quality >= 90) notes.push(`Harmonically locked: ${harmonic.relation}`);
  else if (harmonic.quality < 50) notes.push(`Key tension: ${harmonic.relation} — mix in low end only`);

  return {
    fromId: from.id,
    toId: to.id,
    quality,
    harmonicRelation: harmonic.relation,
    bpmDelta,
    energyDelta: round1(energyDelta),
    notes,
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
