export interface PreviewMatch {
  /** Direct URL to a 30-second m4a clip — playable in <audio>. */
  previewUrl: string;
  /** Page on Apple Music for the track, if the user wants to dig deeper. */
  trackUrl: string;
  /** Title and artist as Apple Music has them — useful for confirming the match. */
  matchedTitle: string;
  matchedArtist: string;
}

interface ItunesResult {
  trackName?: string;
  artistName?: string;
  previewUrl?: string;
  trackViewUrl?: string;
}

/**
 * Look up a 30-second preview clip via the iTunes Search API. No credentials
 * required, generally reliable for tracks Apple Music carries. Returns null
 * when no usable match is found so the caller can show a "no preview" state.
 */
export async function lookupPreview(artist: string, title: string): Promise<PreviewMatch | null> {
  if (!artist || !title) return null;

  // Stripping punctuation improves match rate noticeably (special chars throw the search off).
  const term = `${artist} ${title}`.replace(/[^a-zA-Z0-9À-ſ ]/g, " ").replace(/\s+/g, " ").trim();
  if (!term) return null;

  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=5`;
  try {
    const res = await fetch(url, {
      // Cache for a day per artist+title; iTunes catalog doesn't change minute-to-minute.
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: ItunesResult[] };
    const results = data.results ?? [];

    // Prefer an exact artist-name match; otherwise take the first result.
    const want = artist.toLowerCase();
    const best =
      results.find((r) => r.artistName?.toLowerCase() === want && r.previewUrl) ??
      results.find((r) => r.previewUrl);

    if (!best?.previewUrl) return null;
    return {
      previewUrl: best.previewUrl,
      trackUrl: best.trackViewUrl ?? "",
      matchedTitle: best.trackName ?? title,
      matchedArtist: best.artistName ?? artist,
    };
  } catch {
    return null;
  }
}
