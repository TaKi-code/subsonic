import type { CamelotKey } from "@/lib/types";

export interface CamelotParts {
  number: number; // 1-12
  letter: "A" | "B";
}

export function parseCamelot(key: CamelotKey): CamelotParts {
  const match = /^(\d{1,2})([AB])$/.exec(key);
  if (!match) throw new Error(`Invalid Camelot key: ${key}`);
  return { number: Number(match[1]), letter: match[2] as "A" | "B" };
}

function wrap12(n: number): number {
  // Map any integer onto 1..12.
  return ((n - 1) % 12 + 12) % 12 + 1;
}

export interface HarmonicMatch {
  /** 0-100 compatibility. */
  quality: number;
  relation: string;
}

/**
 * Evaluate the harmonic relationship between two Camelot keys following
 * standard mixing rules (the Camelot wheel / "energy boost" conventions).
 */
export function harmonicCompatibility(from: CamelotKey, to: CamelotKey): HarmonicMatch {
  const a = parseCamelot(from);
  const b = parseCamelot(to);

  if (a.number === b.number && a.letter === b.letter) {
    return { quality: 100, relation: "Perfect (same key)" };
  }

  // Relative major/minor: same number, swapped letter.
  if (a.number === b.number && a.letter !== b.letter) {
    return { quality: 92, relation: "Relative major/minor" };
  }

  const sameLetter = a.letter === b.letter;
  const diff = Math.min(
    (b.number - a.number + 12) % 12,
    (a.number - b.number + 12) % 12,
  );

  // Adjacent on the wheel (±1), same letter: smooth perfect-fifth move.
  if (sameLetter && diff === 1) {
    const up = wrap12(a.number + 1) === b.number;
    return {
      quality: 90,
      relation: up ? "Adjacent +1 (energy lift)" : "Adjacent -1 (energy drop)",
    };
  }

  // Energy boost: +2 same letter — bigger lift, still mixable.
  if (sameLetter && diff === 2) {
    return { quality: 72, relation: "Energy boost (+2)" };
  }

  // Diagonal: ±1 number AND letter swap — usable mood shift.
  if (!sameLetter && diff === 1) {
    return { quality: 68, relation: "Diagonal mood shift" };
  }

  // Three semitones (+7 / -5 etc.) tend to clash.
  if (sameLetter && diff === 3) {
    return { quality: 40, relation: "Distant (3 steps)" };
  }

  return { quality: 18, relation: "Key clash" };
}

/** All harmonically compatible keys for a given key, best first. */
export function compatibleKeys(key: CamelotKey): CamelotKey[] {
  const { number, letter } = parseCamelot(key);
  const other = letter === "A" ? "B" : "A";
  return [
    `${number}${letter}` as CamelotKey,
    `${number}${other}` as CamelotKey,
    `${wrap12(number + 1)}${letter}` as CamelotKey,
    `${wrap12(number - 1)}${letter}` as CamelotKey,
    `${wrap12(number + 2)}${letter}` as CamelotKey,
  ];
}
