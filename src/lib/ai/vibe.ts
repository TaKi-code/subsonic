import Anthropic from "@anthropic-ai/sdk";
import type { DiscoveryFilters, Genre } from "@/lib/types";

/**
 * Canonical genre vocabulary the LLM may select from. Must stay in sync with
 * the `Genre` union in types.ts — it's the enum the model is constrained to.
 */
const GENRE_ENUM: Genre[] = [
  "Techno",
  "Melodic Techno",
  "Peak Time Techno",
  "Hard Techno",
  "Minimal / Deep Tech",
  "House",
  "Deep House",
  "Tech House",
  "Progressive House",
  "Afro House",
  "Trance",
  "Breakbeat",
  "Electro",
  "Dub Techno",
  "Ambient",
];

export interface VibeInterpretation {
  /** "llm" when Claude parsed the request; "fallback" when the algorithm did. */
  source: "llm" | "fallback";
  /** Structured discovery filters derived from the natural-language request. */
  filters: DiscoveryFilters;
  /** Short, DJ-facing explanation of how the request was read. */
  rationale: string;
  /** Descriptive keywords for the algorithmic vibe matcher (always populated). */
  vibeKeywords: string[];
}

const SYSTEM_PROMPT = `You are the crate-digging brain of SUBSONIC, an AI platform for DJs rooted in underground electronic music culture. Your job: turn a DJ's plain-English request into structured discovery filters the engine can run.

You understand the culture deeply:
- Genre/subgenre relationships: melodic techno blends into progressive house; tech house sits next to minimal/deep tech; peak-time and hard techno escalate energy; dub techno and ambient are the deep, low-energy end.
- Crowd energy maps to a 1-10 scale: 1-3 = ambient/warmup, 4-6 = groovy/building, 7-8 = driving/main-room, 9-10 = peak-time/aggressive.
- BPM conventions: deep house ~118-122, melodic/prog ~120-124, techno ~130-135, peak-time ~130-138, hard techno ~140-150.
- Underground vs mainstream: "hidden gems", "deep cuts", "underground", "raw", "white label" imply a low popularity ceiling (maxPopularity <= 45). "Anthem", "festival", "big room" imply mainstream and no popularity ceiling.

Rules:
- Only set a field when the request clearly implies it. Use null for anything not implied — do NOT guess BPM or energy bounds the DJ didn't ask for.
- genres must be chosen ONLY from the provided enum.
- Always populate vibeKeywords with 3-6 lowercase descriptive tags (mood, texture, scene) that capture the request, even when other fields are null. These feed a fallback text matcher.
- rationale: one or two sentences, addressed to the DJ, explaining how you read the request. No preamble.`;

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    genres: {
      type: ["array", "null"],
      items: { type: "string", enum: GENRE_ENUM },
    },
    bpmMin: { type: ["integer", "null"] },
    bpmMax: { type: ["integer", "null"] },
    energyMin: { type: ["integer", "null"] },
    energyMax: { type: ["integer", "null"] },
    maxPopularity: { type: ["integer", "null"] },
    vibeKeywords: { type: "array", items: { type: "string" } },
    rationale: { type: "string" },
  },
  required: [
    "genres",
    "bpmMin",
    "bpmMax",
    "energyMin",
    "energyMax",
    "maxPopularity",
    "vibeKeywords",
    "rationale",
  ],
} as const;

interface RawInterpretation {
  genres: Genre[] | null;
  bpmMin: number | null;
  bpmMax: number | null;
  energyMin: number | null;
  energyMax: number | null;
  maxPopularity: number | null;
  vibeKeywords: string[];
  rationale: string;
}

/**
 * Interpret a natural-language crate-digging request into structured filters.
 *
 * Uses Claude (Opus 4.7) with structured outputs when ANTHROPIC_API_KEY is set;
 * otherwise degrades gracefully to the algorithmic vibe matcher so the platform
 * still works with zero configuration.
 */
export async function interpretVibe(query: string): Promise<VibeInterpretation> {
  const trimmed = query.trim();
  if (!process.env.ANTHROPIC_API_KEY || trimmed.length === 0) {
    return fallback(trimmed);
  }

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          // Stable prefix — cache it so repeated requests don't re-bill the prompt.
          cache_control: { type: "ephemeral" },
        },
      ],
      output_config: {
        format: { type: "json_schema", schema: OUTPUT_SCHEMA },
      },
      messages: [{ role: "user", content: `DJ request: ${trimmed}` }],
    });

    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") return fallback(trimmed);

    const raw = JSON.parse(text.text) as RawInterpretation;
    return {
      source: "llm",
      filters: toFilters(raw, trimmed),
      rationale: raw.rationale,
      vibeKeywords: raw.vibeKeywords ?? [],
    };
  } catch {
    // Network error, missing schema support, refusal, etc. — never break the UI.
    return fallback(trimmed);
  }
}

function toFilters(raw: RawInterpretation, query: string): DiscoveryFilters {
  const keywords = (raw.vibeKeywords ?? []).join(" ");
  return {
    genres: raw.genres ?? undefined,
    bpmMin: raw.bpmMin ?? undefined,
    bpmMax: raw.bpmMax ?? undefined,
    energyMin: raw.energyMin ?? undefined,
    energyMax: raw.energyMax ?? undefined,
    maxPopularity: raw.maxPopularity ?? undefined,
    // Feed both the model's keywords and the raw query to the text matcher.
    vibe: `${keywords} ${query}`.trim(),
    limit: 30,
  };
}

/** Pure-algorithmic interpretation: hand the raw query to the text matcher. */
function fallback(query: string): VibeInterpretation {
  return {
    source: "fallback",
    filters: query ? { vibe: query, limit: 30 } : { limit: 30 },
    rationale: query
      ? "Matched your words against track descriptors (algorithmic mode — set ANTHROPIC_API_KEY to enable AI interpretation)."
      : "Showing the crate.",
    vibeKeywords: [],
  };
}
