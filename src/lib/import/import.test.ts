import { describe, expect, it } from "vitest";
import { toCamelot, fromTraktorKeyValue } from "./keys";
import { normalizeGenre } from "./genre";
import { parseLibraryExport } from "./csv";
import { parseRekordboxXml, parseTraktorNml } from "./xml";
import { parseLibrary } from "./index";

const REKORDBOX_XML = `<?xml version="1.0" encoding="UTF-8"?>
<DJ_PLAYLISTS Version="1.0.0">
<COLLECTION Entries="2">
<TRACK TrackID="1" Name="Night Run" Artist="Korridor" Genre="Techno" Label="Mord" AverageBpm="134.00" Tonality="Am" TotalTime="402" Year="2023" Comments="Energy 8 - peak"/>
<TRACK TrackID="2" Name="Drift &amp; Pull" Artist="Vela" Genre="Tech House" AverageBpm="127" Tonality="8B" TotalTime="330"/>
</COLLECTION>
<PLAYLISTS><NODE Type="1" Name="A"><TRACK Key="1"/></NODE></PLAYLISTS>
</DJ_PLAYLISTS>`;

const TRAKTOR_NML = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<NML VERSION="19">
<COLLECTION ENTRIES="2">
<ENTRY MODIFIED_DATE="2023/1/1" TITLE="Hollow" ARTIST="Aelo">
<LOCATION DIR="/x/" FILE="a.mp3"/>
<INFO GENRE="Melodic Techno" LABEL="Afterlife" PLAYTIME="421" RELEASE_DATE="2021/1/1" KEY="9A" COMMENT="Energy 6"/>
<TEMPO BPM="124.000000" BPM_QUALITY="100"/>
<MUSICAL_KEY VALUE="9"/>
</ENTRY>
<ENTRY TITLE="Pulse" ARTIST="Cae Volt">
<INFO GENRE="Peak Time Techno" PLAYTIME="388"/>
<TEMPO BPM="131.0"/>
<MUSICAL_KEY VALUE="21"/>
</ENTRY>
</COLLECTION>
</NML>`;

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

describe("fromTraktorKeyValue", () => {
  it("maps numeric Traktor keys to Camelot", () => {
    expect(fromTraktorKeyValue(9)).toBe("11B"); // A major
    expect(fromTraktorKeyValue(21)).toBe("8A"); // A minor (9 + 12)
    expect(fromTraktorKeyValue(0)).toBe("8B"); // C major
  });
  it("rejects out-of-range values", () => {
    expect(fromTraktorKeyValue(24)).toBeNull();
    expect(fromTraktorKeyValue(-1)).toBeNull();
  });
});

describe("parseRekordboxXml", () => {
  it("parses collection tracks and ignores playlist refs", () => {
    const r = parseRekordboxXml(REKORDBOX_XML);
    expect(r.format).toBe("rekordbox");
    expect(r.rowsParsed).toBe(2);
    expect(r.tracks[0].title).toBe("Night Run");
    expect(r.tracks[0].key).toBe("8A"); // Am
    expect(r.tracks[0].bpm).toBe(134);
    expect(r.tracks[0].energy).toBe(8);
    expect(r.tracks[0].label).toBe("Mord");
    expect(r.tracks[0].durationSec).toBe(402);
    expect(r.tracks[1].title).toBe("Drift & Pull"); // entity decoded
    expect(r.tracks[1].key).toBe("8B");
  });
});

describe("parseTraktorNml", () => {
  it("parses entries with textual and numeric keys", () => {
    const r = parseTraktorNml(TRAKTOR_NML);
    expect(r.format).toBe("traktor");
    expect(r.rowsParsed).toBe(2);
    expect(r.tracks[0].title).toBe("Hollow");
    expect(r.tracks[0].key).toBe("9A"); // from textual KEY
    expect(r.tracks[0].bpm).toBe(124);
    expect(r.tracks[0].genre).toBe("Melodic Techno");
    expect(r.tracks[0].year).toBe(2021);
    expect(r.tracks[1].key).toBe("8A"); // from numeric MUSICAL_KEY=21
    expect(r.tracks[1].bpm).toBe(131);
  });
});

describe("parseLibrary (dispatcher)", () => {
  it("detects Rekordbox XML", () => {
    expect(parseLibrary(REKORDBOX_XML).format).toBe("rekordbox");
  });
  it("detects Traktor NML", () => {
    expect(parseLibrary(TRAKTOR_NML).format).toBe("traktor");
    expect(parseLibrary("anything", "collection.nml").format).toBe("traktor");
  });
  it("falls back to CSV for delimited text", () => {
    const csv = "name,artist,bpm,key\nA,B,128,Am";
    expect(parseLibrary(csv).format).toBe("csv");
  });
});
