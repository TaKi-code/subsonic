import { NextResponse } from "next/server";
import { interpretVibe } from "@/lib/ai/vibe";

interface InterpretBody {
  query: string;
}

/**
 * Interprets a natural-language request into structured discovery filters.
 * Returns the interpretation only — the client runs `discover()` against its
 * full library (seed + imported tracks) so imports are included in results.
 */
export async function POST(req: Request) {
  let body: InterpretBody;
  try {
    body = (await req.json()) as InterpretBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const interpretation = await interpretVibe(body?.query ?? "");
  return NextResponse.json(interpretation);
}
