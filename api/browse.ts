import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { CollectionDetail, Track } from "../src/types/music.js";
import {
  extractRuns,
  parseResponsiveTrack,
  stripEmojis,
  upgradeThumb,
  ytmPost,
} from "./_lib/ytm.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=1200");
  const rawId = String(req.query.id || "").trim();
  if (!rawId) {
    return res.status(400).json({ error: "Missing collection id" });
  }

  const browseId = rawId.startsWith("PL") ? `VL${rawId}` : rawId;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await ytmPost("browse", { browseId });

    const twoCol = data?.contents?.twoColumnBrowseResultsRenderer;
    const header =
      twoCol?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]
        ?.musicResponsiveHeaderRenderer ||
      data?.header?.musicDetailHeaderRenderer;

    const title = stripEmojis(extractRuns(header?.title).join("") || "Untitled Collection");
    const subtitleRuns = extractRuns(header?.subtitle)
      .map((s) => s.trim())
      .filter((s) => s && s !== "•" && s !== "·");
    const strapline = stripEmojis(extractRuns(header?.straplineTextOne).join(""));
    const description = stripEmojis(
      extractRuns(header?.description?.musicDescriptionShelfRenderer?.description).join(""),
    );

    const thumbs =
      header?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
      header?.thumbnail?.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails ||
      [];
    const artwork = upgradeThumb(thumbs.length ? thumbs[thumbs.length - 1]?.url : "");

    const year = subtitleRuns.find((s) => /^\d{4}$/.test(s));
    const isAlbum = browseId.startsWith("MPREb_") || subtitleRuns.some((s) => /^(album|ep|single)$/i.test(s));
    const artist =
      strapline ||
      subtitleRuns.find((s) => !/^(album|single|ep|playlist|chart)$/i.test(s) && !/^\d{4}$/.test(s)) ||
      "Various Artists";

    const secondarySections =
      twoCol?.secondaryContents?.sectionListRenderer?.contents ||
      data?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content
        ?.sectionListRenderer?.contents ||
      [];

    const tracks: Track[] = [];
    for (const sec of secondarySections) {
      const list =
        sec?.musicShelfRenderer?.contents ||
        sec?.musicPlaylistShelfRenderer?.contents ||
        [];
      for (const entry of list) {
        const renderer = entry?.musicResponsiveListItemRenderer;
        const track = parseResponsiveTrack(
          renderer,
          artwork,
          isAlbum ? artist : "",
          isAlbum ? title : "",
        );
        if (track) {
          if (isAlbum && !track.albumId) {
            track.albumId = browseId;
          }
          tracks.push(track);
        }
      }
    }

    const detail: CollectionDetail = {
      id: browseId,
      title,
      artist,
      subtitle: `${isAlbum ? "Album" : "Playlist"} — ${tracks.length} songs${year ? ` — ${year}` : ""}`,
      type: isAlbum ? "album" : "playlist",
      year,
      artwork: artwork || tracks[0]?.artwork || "",
      description: description || undefined,
      trackCount: tracks.length,
      tracks,
      source: "ytm",
    };

    return res.status(200).json(detail);
  } catch (err) {
    console.error("[api/browse]", err);
    return res.status(502).json({ error: "Failed to load collection from YouTube Music." });
  }
}
