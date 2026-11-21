import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { CollectionSummary, Track } from "../src/types/music.js";
import {
  parseResponsiveCollection,
  parseResponsiveTrack,
  ytmPost,
} from "./_lib/ytm.js";

const FILTER_PARAMS: Record<string, string> = {
  songs: "EgWKAQIIAWoMEAMQBBAJEAoQBRAV",
  albums: "EgWKAQIYAWoMEAMQBBAJEAoQBRAV",
  playlists: "EgWKAQIoAWoMEAMQBBAJEAoQBRAV",
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=600");
  const q = String(req.query.q || "").trim();
  const filter = String(req.query.filter || "songs").toLowerCase();

  if (!q) {
    return res.status(400).json({ error: "Missing search query parameter q" });
  }

  try {
    const params = FILTER_PARAMS[filter] || FILTER_PARAMS.songs;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await ytmPost("search", { query: q, params });
    const sections =
      data?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content
        ?.sectionListRenderer?.contents || [];

    const tracks: Track[] = [];
    const collections: CollectionSummary[] = [];

    for (const section of sections) {
      const shelf = section?.musicShelfRenderer;
      if (!shelf?.contents) continue;
      for (const entry of shelf.contents) {
        const renderer = entry?.musicResponsiveListItemRenderer;
        if (!renderer) continue;
        if (filter === "albums" || filter === "playlists") {
          const col = parseResponsiveCollection(
            renderer,
            filter === "albums" ? "album" : "playlist",
          );
          if (col) collections.push(col);
        } else {
          const tr = parseResponsiveTrack(renderer);
          if (tr) tracks.push(tr);
        }
      }
    }

    return res.status(200).json({
      query: q,
      filter,
      tracks: tracks.slice(0, 25),
      collections: collections.slice(0, 20),
    });
  } catch (err) {
    console.error("[api/search]", err);
    return res.status(502).json({
      error: "Unable to query YouTube Music search right now.",
      tracks: [],
      collections: [],
    });
  }
}
