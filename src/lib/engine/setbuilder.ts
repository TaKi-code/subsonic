import type {
  GeneratedSet,
  ScoredTrack,
  SetRequest,
  SetShape,
  Track,
} from "@/lib/types";
import { buildBpmCurve, buildEnergyCurve } from "./energy";
import { evaluateTransition } from "./transition";
import { genreAffinity, trackSimilarity, undergroundScore } from "./scoring";

const AVG_TRACK_SEC = 6 * 60; // assume ~6 min of play time per track in a mix

/**
 * Generate a full DJ set. Builds an energy/BPM curve for the requested shape,
 * then greedily selects tracks that best fit each slot's target while
 * maximizing transition quality from the previous track.
 */
export function generateSet(library: Track[], req: SetRequest): GeneratedSet {
  const slotCount = Math.max(1, Math.round((req.durationMin * 60) / AVG_TRACK_SEC));
  const energyCurve = buildEnergyCurve(slotCount, req.shape);

  const startBpm = req.startBpm ?? defaultStartBpm(req);
  const peakBpm = req.peakBpm ?? startBpm + 8;
  const bpmCurve = buildBpmCurve(energyCurve, startBpm, peakBpm);

  const pool = library.filter((t) => {
    if (req.genres?.length && !req.genres.some((g) => genreAffinity(g, t.genre) >= 0.5)) {
      return false;
    }
    if (req.maxPopularity !== undefined && t.popularity > req.maxPopularity) return false;
    return true;
  });

  const used = new Set<string>();
  const picked: Track[] = [];

  // Opening track.
  let current: Track | undefined = req.seedTrackId
    ? pool.find((t) => t.id === req.seedTrackId)
    : undefined;
  if (!current) {
    current = bestForSlot(pool, used, energyCurve[0], bpmCurve[0], undefined, req);
  }
  if (!current) {
    return emptySet(req, energyCurve);
  }
  used.add(current.id);
  picked.push(current);

  // Remaining slots.
  for (let i = 1; i < slotCount; i++) {
    const next = bestForSlot(pool, used, energyCurve[i], bpmCurve[i], current!, req);
    if (!next) break;
    used.add(next.id);
    picked.push(next);
    current = next;
  }

  return assembleSet(picked, req.shape);
}

/**
 * Recompute a full GeneratedSet from an explicit, ordered list of tracks.
 * Used both by the generator and by manual editing (reorder / swap / remove)
 * so flow, energy, and underground scores always reflect the current order.
 */
export function assembleSet(tracks: Track[], shape: SetShape): GeneratedSet {
  if (tracks.length === 0) {
    return {
      slots: [],
      totalDurationSec: 0,
      flowScore: 0,
      undergroundScore: 0,
      shape,
      energyCurve: [],
    };
  }

  const energyCurve = buildEnergyCurve(tracks.length, shape);
  const slots = tracks.map((track, i) => ({
    position: i,
    track,
    targetEnergy: energyCurve[i] ?? 5,
    transitionIn: i === 0 ? undefined : evaluateTransition(tracks[i - 1], track),
  }));

  const transitions = slots.map((s) => s.transitionIn).filter(Boolean);
  const flowScore = transitions.length
    ? Math.round(transitions.reduce((a, t) => a + t!.quality, 0) / transitions.length)
    : 100;
  const undergroundAvg = Math.round(
    slots.reduce((a, s) => a + undergroundScore(s.track), 0) / slots.length,
  );

  return {
    slots,
    totalDurationSec: tracks.reduce((a, t) => a + t.durationSec, 0),
    flowScore,
    undergroundScore: undergroundAvg,
    shape,
    energyCurve,
  };
}

/**
 * Suggest replacement tracks for one slot, ranked by how well they mix with the
 * surrounding tracks, hit the slot's target energy, and resemble the current
 * pick. Excludes tracks already in the set.
 */
export function suggestReplacements(
  library: Track[],
  set: GeneratedSet,
  position: number,
  count = 5,
): ScoredTrack[] {
  const slot = set.slots[position];
  if (!slot) return [];

  const inSet = new Set(set.slots.map((s) => s.track.id));
  const prev = position > 0 ? set.slots[position - 1].track : undefined;
  const next = position < set.slots.length - 1 ? set.slots[position + 1].track : undefined;
  const current = slot.track;

  const scored: ScoredTrack[] = [];
  for (const cand of library) {
    if (inSet.has(cand.id)) continue;

    const inFit = prev ? evaluateTransition(prev, cand).quality / 100 : 0.7;
    const outFit = next ? evaluateTransition(cand, next).quality / 100 : 0.7;
    const energyFit = 1 - Math.min(Math.abs(cand.energy - slot.targetEnergy) / 5, 1);
    const sim = trackSimilarity(current, cand);

    const score = inFit * 0.3 + outFit * 0.3 + energyFit * 0.2 + sim * 0.2;

    const reasons: string[] = [];
    if (inFit > 0.8 && outFit > 0.8) reasons.push("Mixes both sides cleanly");
    else if (inFit > 0.8) reasons.push("Smooth mix in");
    if (energyFit > 0.85) reasons.push("On the energy curve");
    if (sim > 0.6) reasons.push("Similar sound");
    if (reasons.length === 0) reasons.push(`${cand.bpm} BPM · ${cand.key}`);

    scored.push({ track: cand, score: Math.round(score * 100), reasons });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count);
}

/**
 * Score every candidate for a slot and return the best. Balances energy fit,
 * transition quality from the previous track, and underground preference.
 */
function bestForSlot(
  pool: Track[],
  used: Set<string>,
  targetEnergy: number,
  targetBpm: number,
  prev: Track | undefined,
  req: SetRequest,
): Track | undefined {
  let best: Track | undefined;
  let bestScore = -Infinity;

  for (const t of pool) {
    if (used.has(t.id)) continue;

    const energyFit = 1 - Math.min(Math.abs(t.energy - targetEnergy) / 5, 1);
    const bpmFit = 1 - Math.min(Math.abs(t.bpm - targetBpm) / 12, 1);
    const transitionFit = prev ? evaluateTransition(prev, t).quality / 100 : 0.7;
    const ugPref = req.maxPopularity !== undefined ? undergroundScore(t) / 100 : 0.5;

    const score =
      energyFit * 0.32 +
      transitionFit * 0.34 +
      bpmFit * 0.2 +
      ugPref * 0.14;

    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return best;
}

function defaultStartBpm(req: SetRequest): number {
  switch (req.shape) {
    case "warmup":
      return 120;
    case "peaktime":
      return 128;
    case "closing":
      return 124;
    case "journey":
    default:
      return 122;
  }
}

function emptySet(req: SetRequest, energyCurve: number[]): GeneratedSet {
  return {
    slots: [],
    totalDurationSec: 0,
    flowScore: 0,
    undergroundScore: 0,
    shape: req.shape,
    energyCurve,
  };
}
