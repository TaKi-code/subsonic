import type {
  PlaylistAnalysis,
  PlaylistIssue,
  ScoredTrack,
  Track,
  Transition,
} from "@/lib/types";
import { evaluateTransition } from "./transition";
import { trackSimilarity, undergroundScore } from "./scoring";

/**
 * Analyze an ordered playlist: flow, energy, underground balance, problem
 * transitions, a smoother suggested order, and tracks to fill gaps.
 */
export function analyzePlaylist(
  playlist: Track[],
  library: Track[],
): PlaylistAnalysis {
  const trackCount = playlist.length;
  if (trackCount === 0) {
    return {
      trackCount: 0,
      avgBpm: 0,
      bpmRange: [0, 0],
      avgEnergy: 0,
      flowScore: 0,
      undergroundScore: 0,
      transitions: [],
      issues: [{ severity: "info", message: "Playlist is empty." }],
      suggestedOrder: [],
      recommendations: [],
    };
  }

  const bpms = playlist.map((t) => t.bpm);
  const avgBpm = Math.round(avg(bpms));
  const avgEnergy = round1(avg(playlist.map((t) => t.energy)));
  const ugAvg = Math.round(avg(playlist.map(undergroundScore)));

  const transitions: Transition[] = [];
  for (let i = 1; i < playlist.length; i++) {
    transitions.push(evaluateTransition(playlist[i - 1], playlist[i]));
  }
  const flowScore = transitions.length
    ? Math.round(avg(transitions.map((t) => t.quality)))
    : 100;

  const issues = detectIssues(playlist, transitions, ugAvg);
  const suggestedOrder = greedyReorder(playlist);
  const recommendations = recommendFillers(playlist, library);

  return {
    trackCount,
    avgBpm,
    bpmRange: [Math.min(...bpms), Math.max(...bpms)],
    avgEnergy,
    flowScore,
    undergroundScore: ugAvg,
    transitions,
    issues,
    suggestedOrder,
    recommendations,
  };
}

function detectIssues(
  playlist: Track[],
  transitions: Transition[],
  ugAvg: number,
): PlaylistIssue[] {
  const issues: PlaylistIssue[] = [];

  transitions.forEach((t, i) => {
    if (t.quality < 45) {
      issues.push({
        severity: t.quality < 30 ? "critical" : "warn",
        position: i + 1,
        message: `Rough transition into track ${i + 2}: ${t.harmonicRelation}, ${
          t.bpmDelta > 0 ? "+" : ""
        }${t.bpmDelta} BPM.`,
      });
    }
  });

  // Energy whiplash: large up/down swings back to back.
  for (let i = 1; i < playlist.length - 1; i++) {
    const a = playlist[i].energy - playlist[i - 1].energy;
    const b = playlist[i + 1].energy - playlist[i].energy;
    if (a >= 2 && b <= -2) {
      issues.push({
        severity: "warn",
        position: i + 1,
        message: `Energy spike then drop around track ${i + 1} — crowd may lose momentum.`,
      });
    }
  }

  // Overplayed tracks.
  playlist.forEach((t, i) => {
    if (t.popularity >= 80) {
      issues.push({
        severity: "info",
        position: i,
        message: `"${t.title}" is heavily played (popularity ${t.popularity}). Consider a deeper alternative.`,
      });
    }
  });

  if (ugAvg < 35) {
    issues.push({
      severity: "info",
      message: `Set leans mainstream (underground score ${ugAvg}/100). Swap in a few hidden gems for distinction.`,
    });
  }

  if (issues.length === 0) {
    issues.push({ severity: "info", message: "Solid flow — no major issues detected." });
  }
  return issues;
}

/**
 * Greedy nearest-neighbour reorder that maximizes transition quality,
 * keeping the first track fixed as the opener.
 */
function greedyReorder(playlist: Track[]): string[] {
  if (playlist.length <= 2) return playlist.map((t) => t.id);
  const remaining = [...playlist];
  const ordered = [remaining.shift()!];

  while (remaining.length) {
    const last = ordered[ordered.length - 1];
    let bestIdx = 0;
    let bestQ = -Infinity;
    remaining.forEach((cand, idx) => {
      const q = evaluateTransition(last, cand).quality;
      if (q > bestQ) {
        bestQ = q;
        bestIdx = idx;
      }
    });
    ordered.push(remaining.splice(bestIdx, 1)[0]);
  }
  return ordered.map((t) => t.id);
}

/** Recommend library tracks that fit the playlist's character but aren't in it. */
function recommendFillers(playlist: Track[], library: Track[]): ScoredTrack[] {
  const present = new Set(playlist.map((t) => t.id));
  const scored: ScoredTrack[] = [];

  for (const cand of library) {
    if (present.has(cand.id)) continue;
    const sim = avg(playlist.map((p) => trackSimilarity(p, cand)));
    const ug = undergroundScore(cand) / 100;
    const score = Math.round((sim * 0.7 + ug * 0.3) * 100);
    const reasons: string[] = [];
    if (sim > 0.5) reasons.push("Fits the set's sound");
    if (ug > 0.7) reasons.push("Hidden gem");
    reasons.push(`${cand.bpm} BPM · ${cand.key}`);
    scored.push({ track: cand, score, reasons });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 6);
}

function avg(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
