import { describe, expect, it } from "vitest";
import { toCamelot } from "./keys";
import { normalizeGenre } from "./genre";
import { parseLibraryExport } from "./csv";

describe("toCamelot", () => {
  it("passes through Camelot notation", () => {
    expect(toCamelot("8A")).toBe("8A");
    expect(toCamelot("12b")).toBe("12B");
  });
  it("converts minor musical keys", () => {
    expect(toCamelot("Am")).toBe("8A");
    expect(toCamelot("F#m")).toBe("11A");
    expect(toCamelot("Gbm")).toBe("11A");
  });
  it("converts major musical keys", () => {
    expect(toCamelot("C")).toBe("8B");
    expect(toCamelot("G")).toBe("9B");
    expect(toCamelot("Cmaj")).toBe("8B");
  });
  it("converts Open Key notation", () => {
    expect(toCamelot("1m")).toBe("8A"); // A minor
    expect(toCamelot("1d")).toBe("8B"); // C major
  });
  it("returns null for garbage", () => {
    expect(toCamelot("xyz")).toBeNull();
    expect(toCamelot("")).toBeNull();
  });
});

describe("normalizeGenre", () => {
  it("prefers specific genres over general ones", () => {
    expect(normalizeGenre("Tech House")).toBe("Tech House");
    expect(normalizeGenre("Deep House")).toBe("Deep House");
    expect(normalizeGenre("Hard Techno")).toBe("Hard Techno");
  });
  it("defaults unknown genres to Techno", () => {
    expect(normalizeGenre("Future Bass")).toBe("Techno");
  });
});

describe("parseLibraryExport", () => {
  it("parses a Serato-style CSV", () => {
    const csv = [
      "name,artist,bpm,key,genre,label,time",
      'Midnight Drive,Some DJ,130,Am,Techno,Mord,6:42',
      '"Track, with comma",Other DJ,128,8B,Tech House,Hot Creations,5:30',
    ].join("\n");
    const r = parseLibraryExport(csv);
    expect(r.rowsParsed).toBe(2);
    expect(r.tracks[0].bpm).toBe(130);
    expect(r.tracks[0].key).toBe("8A");
    expect(r.tracks[1].title).toBe("Track, with comma");
    expect(r.tracks[1].durationSec).toBe(330);
  });

  it("parses a Rekordbox-style tab-delimited export", () => {
    const tsv = [
      "Track Title\tArtist\tBPM\tKey\tGenre\tTime",
      "Concrete\tKorridor\t136.00\t7A\tTechno\t6:36",
    ].join("\n");
    const r = parseLibraryExport(tsv);
    expect(r.rowsParsed).toBe(1);
    expect(r.tracks[0].artist).toBe("Korridor");
    expect(r.tracks[0].bpm).toBe(136);
  });

  it("skips rows missing BPM and warns", () => {
    const csv = ["name,bpm,key", "No Tempo,,Am", "Good,128,Am"].join("\n");
    const r = parseLibraryExport(csv);
    expect(r.rowsParsed).toBe(1);
    expect(r.rowsSkipped).toBe(1);
  });

  it("reads Mixed In Key energy from comments", () => {
    const csv = ["name,bpm,key,comment", "Deep One,124,Am,Energy 7 - peak"].join("\n");
    const r = parseLibraryExport(csv);
    expect(r.tracks[0].energy).toBe(7);
  });

  it("produces stable ids for identical tracks", () => {
    const csv = ["name,artist,bpm,key", "X,Y,128,Am"].join("\n");
    const a = parseLibraryExport(csv).tracks[0].id;
    const b = parseLibraryExport(csv).tracks[0].id;
    expect(a).toBe(b);
  });
});
