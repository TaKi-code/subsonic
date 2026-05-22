import { NextResponse } from "next/server";
import { generateSet } from "@/lib/engine";
import { TRACKS } from "@/lib/data/tracks";
import type { SetRequest } from "@/lib/types";

export async function POST(req: Request) {
  let body: SetRequest;
  try {
    body = (await req.json()) as SetRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body?.durationMin || !body?.shape) {
    return NextResponse.json(
      { error: "durationMin and shape are required" },
      { status: 400 },
    );
  }
  const set = generateSet(TRACKS, body);
  return NextResponse.json({ set });
}
