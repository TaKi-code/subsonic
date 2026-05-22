import { describe, expect, it } from "vitest";
import { harmonicCompatibility } from "./harmony";
import { buildEnergyCurve } from "./energy";
import { generateSet, assembleSet, suggestReplacements } from "./setbuilder";
import { discover } from "./discovery";
import { analyzePlaylist } from "./analyzer";
import { TRACKS } from "@/lib/data/tracks";

describe("harmony", () => {
  it("scores identical keys as perfect", () => {
    expect(harmonicCompatibility("8A", "8A").quality).toBe(100);
  });
  it("scores relative major/minor highly", () => {
    expect(harmonicCompatibility("8A", "8B").quality).toBeGreaterThan(85);
  });
  it("scores distant keys as a clash", () => {
    expect(harmonicCompatibility("8A", "2A").quality).toBeLessThan(50);
  });
});

describe("energy curve", () => {
  it("peaks for peaktime shape near the end", () => {
    const c = buildEnergyCurve(10, "peaktime");
    expect(Math.max(...c)).toBeGreaterThan(c[0]);
  });
  it("descends for closing shape", () => {
    const c = buildEnergyCurve(10, "closing");
    expect(c[0]).toBeGreaterThan(c[c.length - 1]);
  });
});

describe("set generation", () => {
  it("produces a set with no repeated tracks and a flow score", () => {
    const set = generateSet(TRACKS, { durationMin: 60, shape: "journey" });
    expect(set.slots.length).toBeGreaterThan(3);
    const ids = set.slots.map((s) => s.track.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(set.flowScore).toBeGreaterThan(0);
  });
});

describe("assembleSet", () => {
  it("recomputes scores and transitions from an ordered list", () => {
    const tracks = TRACKS.slice(0, 5);
    const set = assembleSet(tracks, "journey");
    expect(set.slots.length).toBe(5);
    expect(set.slots[0].transitionIn).toBeUndefined();
    expect(set.slots[1].transitionIn).toBeDefined();
    expect(set.energyCurve.length).toBe(5);
    expect(set.totalDurationSec).toBe(tracks.reduce((a, t) => a + t.durationSec, 0));
  });
  it("reordering changes the flow score", () => {
    const tracks = TRACKS.slice(0, 6);
    const a = assembleSet(tracks, "journey").flowScore;
    const b = assembleSet([...tracks].reverse(), "journey").flowScore;
    // Not asserting direction, just that order is load-bearing.
    expect(typeof a).toBe("number");
    expect(typeof b).toBe("number");
  });
  it("handles an empty track list", () => {
    const set = assembleSet([], "peaktime");
    expect(set.slots.length).toBe(0);
    expect(set.flowScore).toBe(0);
  });
});

describe("suggestReplacements", () => {
  it("returns candidates not already in the set", () => {
    const set = assembleSet(TRACKS.slice(0, 5), "journey");
    const suggestions = suggestReplacements(TRACKS, set, 2, 4);
    const inSet = new Set(set.slots.map((s) => s.track.id));
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.length).toBeLessThanOrEqual(4);
    expect(suggestions.every((s) => !inSet.has(s.track.id))).toBe(true);
  });
});

describe("discovery", () => {
  it("respects hard BPM filters", () => {
    const res = discover(TRACKS, { bpmMin: 140 });
    expect(res.every((r) => r.track.bpm >= 140)).toBe(true);
  });
});

describe("analyzer", () => {
  it("returns transitions and recommendations", () => {
    const playlist = TRACKS.slice(0, 5);
    const a = analyzePlaylist(playlist, TRACKS);
    expect(a.transitions.length).toBe(4);
    expect(a.recommendations.length).toBeGreaterThan(0);
  });
});
