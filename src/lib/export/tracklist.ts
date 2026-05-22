import type { GeneratedSet } from "@/lib/types";

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Render a generated set as a plain-text tracklist suitable for sharing or
 * loading into a DJ app's notes. Includes running time, key, BPM, and the
 * transition note into each track.
 */
export function formatTracklist(name: string, set: GeneratedSet): string {
  const lines: string[] = [];
  lines.push(`${name}`);
  lines.push(
    `${set.slots.length} tracks · ${fmtTime(set.totalDurationSec)} · flow ${set.flowScore}/100 · underground ${set.undergroundScore}/100 · shape: ${set.shape}`,
  );
  lines.push("");

  let elapsed = 0;
  set.slots.forEach((slot, i) => {
    const pos = String(i + 1).padStart(2, "0");
    const t = slot.track;
    lines.push(
      `${pos}. [${fmtTime(elapsed)}] ${t.artist} - ${t.title}  (${t.key} · ${t.bpm} BPM · E${t.energy} · ${t.genre})`,
    );
    if (slot.transitionIn) {
      const tr = slot.transitionIn;
      lines.push(
        `      ↳ mix: ${tr.harmonicRelation}, ${tr.bpmDelta > 0 ? "+" : ""}${tr.bpmDelta} BPM, quality ${tr.quality}/100`,
      );
    }
    elapsed += t.durationSec;
  });

  lines.push("");
  lines.push("Generated with SUBSONIC");
  return lines.join("\n");
}

/** Trigger a client-side download of the given text as a .txt file. */
export function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Safe filename slug from a set name. */
export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "set"
  );
}
