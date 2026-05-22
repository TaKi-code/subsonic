import { NextResponse } from "next/server";
import { discover } from "@/lib/engine";
import { TRACKS } from "@/lib/data/tracks";
import type { DiscoveryFilters } from "@/lib/types";

export async function POST(req: Request) {
  let filters: DiscoveryFilters;
  try {
    filters = (await req.json()) as DiscoveryFilters;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const results = discover(TRACKS, filters ?? {});
  return NextResponse.json({ results });
}
