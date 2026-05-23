import { NextResponse } from "next/server";
import { interpretVibe } from "@/lib/ai/vibe";
import { AI_LIMIT_PER_DAY, checkAiRateLimit, clientIpFromHeaders } from "@/lib/ratelimit/check";

interface InterpretBody {
  query: string;
}

/**
 * Interprets a natural-language request into structured discovery filters.
 * Per-IP daily rate limit protects the AI key against abuse. Returns the
 * interpretation only — the client runs `discover()` against its full library
 * (seed + imported tracks) so imports are included in results.
 */
export async function POST(req: Request) {
  let body: InterpretBody;
  try {
    body = (await req.json()) as InterpretBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const ip = clientIpFromHeaders(req.headers);
  const limit = await checkAiRateLimit(ip);

  if (!limit.allowed) {
    const resetIn = limit.resetAt ? Math.ceil((limit.resetAt.getTime() - Date.now()) / 3_600_000) : 24;
    return NextResponse.json(
      {
        error: "rate_limit",
        message: `Daily limit reached (${AI_LIMIT_PER_DAY} AI searches per IP). Try again in ~${resetIn}h.`,
      },
      { status: 429, headers: { "Retry-After": String(resetIn * 3600) } },
    );
  }

  const interpretation = await interpretVibe(body?.query ?? "");
  return NextResponse.json({ ...interpretation, remaining: limit.remaining });
}
