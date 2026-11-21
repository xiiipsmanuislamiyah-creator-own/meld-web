import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { CollectionDetail, Track } from "../src/types/music.js";
import { formatDuration, parseResponsiveTrack, stripEmojis, ytmPost } from "./_lib/ytm.js";

function parseSpotifyUrl(rawUrl: string): { type: "playlist" | "album" | "track"; id: string } | null {
  const trimmed = rawUrl.trim();
  const match = trimmed.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(playlist|album|track)\/([a-zA-Z0-9]+)/i);
  if (match) {
    return { type: match[1].toLowerCase() as "playlist" | "album" | "track", id: match[2] };
  }
  const uriMatch = trimmed.match(/^spotify:(playlist|album|track):([a-zA-Z0-9]+)$/i);
  if (uriMatch) {
    return { type: uriMatch[1].toLowerCase() as "playlist" | "album" | "track", id: uriMatch[2] };
  }
  return null;
}

async function resolveYtmVideoId(title: string, artist: string): Promise<{ videoId?: string; artwork?: string }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await ytmPost("search", {
      query: `${title} ${artist}`,
      params: "EgWKAQIIAWoMEAMQBBAJEAoQBRAV",
    });
    const sections =
      data?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content
        ?.sectionListRenderer?.contents || [];
    for (const sec of sections) {
      const first = sec?.musicShelfRenderer?.contents?.[0]?.musicResponsiveListItemRenderer;
      if (!first) continue;
      const parsed = parseResponsiveTrack(first);
      if (parsed?.videoId) {
        return { videoId: parsed.videoId, artwork: parsed.artwork };
      }
    }
    return {};
  } catch {
    return {};
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "s-maxage=180, stale-while-revalidate=600");
  const rawUrl = String(req.query.url || "").trim();
  const parsed = parseSpotifyUrl(rawUrl);

  if (!parsed) {
    return res.status(400).json({
      error: "Paste a valid public Spotify playlist, album, or track URL (open.spotify.com/...).",
    });
  }

  try {
    const embedUrl = `https://open.spotify.com/embed/${parsed.type}/${parsed.id}`;
    const spRes = await fetch(embedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
    });
    if (!spRes.ok) {
      return res.status(404).json({
        error: "Spotify resource could not be read. Make sure the playlist or album is public.",
      });
    }

    const html = await spRes.text();
    const nextMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!nextMatch) {
      return res.status(502).json({ error: "Unable to parse Spotify embed metadata." });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nextJson: any = JSON.parse(nextMatch[1]);
    const entity = nextJson?.props?.pageProps?.state?.data?.entity;
    if (!entity) {
      return res.status(404).json({ error: "Spotify entity not found or private." });
    }

    const coverSources = entity?.coverArt?.sources || entity?.visualIdentity?.image || [];
    const coverArt =
      Array.isArray(coverSources) && coverSources.length > 0
        ? coverSources[0]?.url || ""
        : "";

    const rawTracks: Array<{ title: string; artist: string; durationSec: number; uri?: string }> = [];

    if (parsed.type === "track") {
      const artists = Array.isArray(entity.artists)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? entity.artists.map((a: any) => a.name).filter(Boolean).join(", ")
        : entity.subtitle || "Unknown Artist";
      rawTracks.push({
        title: stripEmojis(entity.name || entity.title || "Untitled"),
        artist: stripEmojis(artists),
        durationSec: Math.round((entity.duration || 210000) / 1000),
        uri: entity.uri,
      });
    } else if (Array.isArray(entity.trackList)) {
      for (const item of entity.trackList) {
        rawTracks.push({
          title: stripEmojis(item.title || "Untitled"),
          artist: stripEmojis(item.subtitle || "Unknown Artist"),
          durationSec: Math.round((item.duration || 210000) / 1000),
          uri: item.uri,
        });
      }
    }

    if (rawTracks.length === 0) {
      return res.status(404).json({ error: "No tracks found in this Spotify link." });
    }

    // Resolve first 8 tracks immediately in parallel so instant playback works on click;
    // remaining tracks carry source:"spotify" and resolve transparently via /api/search when played.
    const immediateCount = Math.min(rawTracks.length, 8);
    const resolvedBatch = await Promise.all(
      rawTracks.slice(0, immediateCount).map((t) => resolveYtmVideoId(t.title, t.artist)),
    );

    const tracks: Track[] = rawTracks.map((rt, idx) => {
      const matched = idx < immediateCount ? resolvedBatch[idx] : {};
      const vid = matched.videoId;
      const stableId = vid || `sp:${parsed.id}:${idx}`;
      return {
        id: stableId,
        videoId: vid,
        title: rt.title,
        artist: rt.artist,
        album: stripEmojis(entity.name || entity.title || "Spotify Import"),
        durationSec: rt.durationSec,
        durationText: formatDuration(rt.durationSec),
        artwork: matched.artwork || coverArt,
        source: vid ? "ytm" : "spotify",
      };
    });

    const detail: CollectionDetail = {
      id: `spotify:${parsed.type}:${parsed.id}`,
      title: stripEmojis(entity.name || entity.title || "Imported from Spotify"),
      artist: stripEmojis(entity.subtitle || "Spotify Public Collection"),
      subtitle: `Imported from Spotify — ${tracks.length} songs`,
      type: parsed.type === "album" ? "album" : "playlist",
      artwork: coverArt || tracks[0]?.artwork || "",
      trackCount: tracks.length,
      tracks,
      source: "spotify",
      spotifyUrl: `https://open.spotify.com/${parsed.type}/${parsed.id}`,
      createdAt: Date.now(),
    };

    return res.status(200).json(detail);
  } catch (err) {
    console.error("[api/spotify-import]", err);
    return res.status(502).json({
      error: "Failed to import from Spotify right now. Please try another public URL.",
    });
  }
}
