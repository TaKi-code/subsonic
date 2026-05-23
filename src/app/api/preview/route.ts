import { NextResponse } from "next/server";
import { lookupPreview } from "@/lib/preview/lookup";

/**
 * Looks up a 30-second preview clip for a given artist + title via iTunes.
 * The client calls this lazily when the user hits Play, so we never make a
 * lookup request for tracks no one previewed.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const artist = (searchParams.get("artist") ?? "").trim();
  const title = (searchParams.get("title") ?? "").trim();

  if (!artist || !title) {
    return NextResponse.json({ error: "artist and title are required" }, { status: 400 });
  }

  const match = await lookupPreview(artist, title);
  if (!match) return NextResponse.json({ found: false }, { status: 404 });

  return NextResponse.json(
    { found: true, ...match, source: "Apple Music" },
    {
      // Cache responses on Vercel's edge for a day so repeat lookups are instant.
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    },
  );
}
