import { NextResponse } from "next/server";
import { analyzePlaylist } from "@/lib/engine";
import { TRACKS, getTrack } from "@/lib/data/tracks";

interface AnalyzeBody {
  trackIds: string[];
}

export async function POST(req: Request) {
  let body: AnalyzeBody;
  try {
    body = (await req.json()) as AnalyzeBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const playlist = (body?.trackIds ?? [])
    .map(getTrack)
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  const analysis = analyzePlaylist(playlist, TRACKS);
  return NextResponse.json({ analysis });
}
