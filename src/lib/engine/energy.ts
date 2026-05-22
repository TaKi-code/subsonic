import type { SetShape } from "@/lib/types";

/**
 * Build a normalized energy curve (values 1-10) across `n` slots for a given
 * set shape. The curve encodes peak-time structure and crowd dynamics.
 */
export function buildEnergyCurve(n: number, shape: SetShape): number[] {
  if (n <= 0) return [];
  if (n === 1) return [shape === "warmup" ? 4 : shape === "closing" ? 5 : 8];

  const curve: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1); // 0..1 progress through the set
    curve.push(round1(energyAt(t, shape)));
  }
  return curve;
}

function energyAt(t: number, shape: SetShape): number {
  switch (shape) {
    case "warmup":
      // Slow steady build from 3 -> 6.5, never peaks.
      return clamp(3 + t * 3.5, 1, 10);
    case "peaktime":
      // Quick lift then sustained high with a final surge: 6 -> 9.5.
      return clamp(6 + 3.5 * easeOutThenSurge(t), 1, 10);
    case "closing":
      // Comedown: starts high, eases the crowd down 7.5 -> 4.
      return clamp(7.5 - t * 3.5, 1, 10);
    case "journey":
    default: {
      // Classic arc: build, peak around 70%, gentle resolve.
      const peak = 0.7;
      const base = 4;
      const amp = 5;
      const bell = Math.exp(-Math.pow((t - peak) / 0.32, 2));
      const rampIn = Math.min(1, t / peak);
      return clamp(base + amp * bell * (0.55 + 0.45 * rampIn), 1, 10);
    }
  }
}

function easeOutThenSurge(t: number): number {
  // Rises fast, plateaus, then surges in the last 15%.
  const plateau = 1 - Math.pow(1 - Math.min(t, 0.85) / 0.85, 2);
  const surge = t > 0.85 ? (t - 0.85) / 0.15 : 0;
  return Math.min(1, plateau * 0.9 + surge * 0.1);
}

/**
 * Build a BPM curve that tracks the energy curve between start and peak BPM.
 */
export function buildBpmCurve(
  energyCurve: number[],
  startBpm: number,
  peakBpm: number,
): number[] {
  const minE = Math.min(...energyCurve);
  const maxE = Math.max(...energyCurve);
  const span = maxE - minE || 1;
  return energyCurve.map((e) => {
    const ratio = (e - minE) / span;
    return Math.round(startBpm + (peakBpm - startBpm) * ratio);
  });
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
