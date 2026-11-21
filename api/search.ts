import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { ArtistSummary, CollectionSummary, SearchFilter, Track } from "../src/types/music.js";
import {
  extractRuns,
  parseResponsiveArtist,
  parseResponsiveCollection,
  parseResponsiveTrack,
  sanitizeRegion,
  ytmPost,
} from "./_lib/ytm.js";

const FILTER_PARAMS: Record<string, string> = {
  songs: "EgWKAQIIAWoMEAMQBBAJEAoQBRAV",
  videos: "EgWKAQIQAWoMEAMQBBAJEAoQBRAV",
  albums: "EgWKAQIYAWoMEAMQBBAJEAoQBRAV",
  artists: "EgWKAQIgAWoMEAMQBBAJEAoQBRAV",
  playlists: "EgWKAQIoAWoMEAMQBBAJEAoQBRAV",
};

async function runFilteredSearch(
  query: string,
  filter: Exclude<SearchFilter, "all">,
  region: string,
): Promise<{ tracks: Track[]; collections: CollectionSummary[]; artists: ArtistSummary[] }> {
  const params = FILTER_PARAMS[filter] || FILTER_PARAMS.songs;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await ytmPost("search", { query, params }, region);
  const sections =
    data?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content
      ?.sectionListRenderer?.contents || [];

  const tracks: Track[] = [];
  const collections: CollectionSummary[] = [];
  const artists: ArtistSummary[] = [];

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
      } else if (filter === "artists") {
        const art = parseResponsiveArtist(renderer);
        if (art) artists.push(art);
      } else {
        const tr = parseResponsiveTrack(renderer);
        if (tr) {
          if (filter === "videos") tr.isVideo = true;
          tracks.push(tr);
        }
      }
    }
  }

  return { tracks, collections, artists };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=600");
  const q = String(req.query.q || "").trim();
  const region = sanitizeRegion(String(req.query.gl || "ID"));
  const suggestMode = req.query.suggest === "1";

  if (!q) {
    return res.status(400).json({ error: "Missing search query parameter q" });
  }

  try {
    if (suggestMode) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await ytmPost("music/get_search_suggestions", { input: q }, region);
      const list = data?.contents?.[0]?.searchSuggestionsSectionRenderer?.contents || [];
      const suggestions: string[] = [];
      for (const item of list) {
        const runs = extractRuns(item?.searchSuggestionRenderer?.suggestion);
        const text =
          item?.searchSuggestionRenderer?.navigationEndpoint?.searchEndpoint?.query ||
          runs.join("");
        if (text && !suggestions.includes(text)) suggestions.push(text);
        if (suggestions.length >= 6) break;
      }
      return res.status(200).json({ query: q, suggestions });
    }

    const rawFilter = String(req.query.filter || "all").toLowerCase();
    const filter: SearchFilter =
      rawFilter === "songs" ||
      rawFilter === "videos" ||
      rawFilter === "albums" ||
      rawFilter === "artists" ||
      rawFilter === "playlists"
        ? rawFilter
        : "all";

    if (filter === "all") {
      const [songsRes, albumsRes, artistsRes, playlistsRes] = await Promise.allSettled([
        runFilteredSearch(q, "songs", region),
        runFilteredSearch(q, "albums", region),
        runFilteredSearch(q, "artists", region),
        runFilteredSearch(q, "playlists", region),
      ]);

      const tracks = songsRes.status === "fulfilled" ? songsRes.value.tracks.slice(0, 20) : [];
      const albums = albumsRes.status === "fulfilled" ? albumsRes.value.collections.slice(0, 8) : [];
      const playlists =
        playlistsRes.status === "fulfilled" ? playlistsRes.value.collections.slice(0, 6) : [];
      const artists = artistsRes.status === "fulfilled" ? artistsRes.value.artists.slice(0, 6) : [];

      return res.status(200).json({
        query: q,
        filter,
        topResult: tracks[0] || null,
        tracks,
        collections: [...albums, ...playlists],
        artists,
      });
    }

    const resData = await runFilteredSearch(q, filter, region);
    return res.status(200).json({
      query: q,
      filter,
      topResult: resData.tracks[0] || null,
      tracks: resData.tracks.slice(0, 25),
      collections: resData.collections.slice(0, 20),
      artists: resData.artists.slice(0, 20),
    });
  } catch (err) {
    console.error("[api/search]", err);
    return res.status(502).json({
      error: "Unable to query YouTube Music search right now.",
      topResult: null,
      tracks: [],
      collections: [],
      artists: [],
    });
  }
}
