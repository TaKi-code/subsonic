// Core domain types for the Subsonic AI DJ platform.

/**
 * Camelot wheel notation, e.g. "8A" / "8B".
 * Numbers 1-12, letter A (minor) or B (major). Used for harmonic mixing.
 */
export type CamelotKey = `${number}${"A" | "B"}`;

export type Genre =
  | "Techno"
  | "Melodic Techno"
  | "Peak Time Techno"
  | "Hard Techno"
  | "Minimal / Deep Tech"
  | "House"
  | "Deep House"
  | "Tech House"
  | "Progressive House"
  | "Afro House"
  | "Trance"
  | "Breakbeat"
  | "Electro"
  | "Dub Techno"
  | "Ambient";

/** A platform a track can be sourced from. */
export type Source = "Spotify" | "SoundCloud" | "Beatport" | "YouTube" | "Local";

export interface Track {
  id: string;
  title: string;
  artist: string;
  label: string;
  genre: Genre;
  subgenre?: string;
  /** Beats per minute. */
  bpm: number;
  /** Camelot key for harmonic mixing. */
  key: CamelotKey;
  /** Energy 1-10 (perceived intensity / drive). */
  energy: number;
  /**
   * Popularity 0-100. Higher = more mainstream / overplayed.
   * Lower = more underground / hidden gem.
   */
  popularity: number;
  /** Release year. */
  year: number;
  /** Track length in seconds. */
  durationSec: number;
  sources: Source[];
  /** Free-form descriptors used for vibe matching. */
  tags: string[];
}

/** Filters used by the discovery engine. */
export interface DiscoveryFilters {
  genres?: Genre[];
  bpmMin?: number;
  bpmMax?: number;
  keys?: CamelotKey[];
  energyMin?: number;
  energyMax?: number;
  labels?: string[];
  artists?: string[];
  /** Free-text vibe / mood query matched against tags + descriptors. */
  vibe?: string;
  /** 0-100 ceiling on popularity. Lower prioritizes hidden gems. */
  maxPopularity?: number;
  /** If set, find tracks similar to this seed track id. */
  similarToId?: string;
  limit?: number;
}

export interface ScoredTrack {
  track: Track;
  /** 0-100 relevance score. */
  score: number;
  /** Human-readable reasons the track matched. */
  reasons: string[];
}

/** Quality of a transition between two adjacent tracks. */
export interface Transition {
  fromId: string;
  toId: string;
  /** 0-100 overall transition quality. */
  quality: number;
  /** Camelot relationship label, e.g. "Perfect (same key)". */
  harmonicRelation: string;
  /** BPM delta between the two tracks. */
  bpmDelta: number;
  /** Energy delta (to.energy - from.energy). */
  energyDelta: number;
  notes: string[];
}

export type SetShape = "warmup" | "peaktime" | "journey" | "closing";

export interface SetRequest {
  /** Target set length in minutes. */
  durationMin: number;
  shape: SetShape;
  genres?: Genre[];
  /** Starting BPM. The engine builds a curve from here. */
  startBpm?: number;
  /** Peak BPM ceiling. */
  peakBpm?: number;
  /** 0-100 ceiling on track popularity (lower = more underground). */
  maxPopularity?: number;
  /** Optional seed track to open the set. */
  seedTrackId?: string;
  vibe?: string;
}

export interface SetSlot {
  position: number;
  track: Track;
  /** Target energy the engine aimed for at this position (1-10). */
  targetEnergy: number;
  /** Transition into this track from the previous one (undefined for first). */
  transitionIn?: Transition;
}

export interface GeneratedSet {
  slots: SetSlot[];
  totalDurationSec: number;
  /** 0-100 average transition quality across the set. */
  flowScore: number;
  /** 0-100 average underground score (100 = deepest cuts). */
  undergroundScore: number;
  shape: SetShape;
  /** The energy curve the set was built against (per slot). */
  energyCurve: number[];
}

export interface PlaylistIssue {
  severity: "info" | "warn" | "critical";
  /** Index in the analyzed playlist the issue refers to (if positional). */
  position?: number;
  message: string;
}

export interface PlaylistAnalysis {
  trackCount: number;
  avgBpm: number;
  bpmRange: [number, number];
  avgEnergy: number;
  flowScore: number;
  undergroundScore: number;
  /** Per-transition quality across the playlist as ordered. */
  transitions: Transition[];
  issues: PlaylistIssue[];
  /** Suggested reordering (track ids) for smoother flow. */
  suggestedOrder: string[];
  /** Recommended additional tracks to fill gaps. */
  recommendations: ScoredTrack[];
}
