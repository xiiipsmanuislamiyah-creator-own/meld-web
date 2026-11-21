import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { LyricLine, LyricsPayload } from "../src/types/music.js";
import { extractRuns, ytmPost } from "./_lib/ytm.js";

function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const rawLines = lrc.split(/\r?\n/);
  const timeRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;

  for (const raw of rawLines) {
    const matches = [...raw.matchAll(timeRegex)];
    if (matches.length === 0) continue;
    const text = raw.replace(timeRegex, "").trim();
    if (!text) continue;

    for (const m of matches) {
      const mins = Number(m[1]);
      const secs = Number(m[2]);
      const fracStr = (m[3] || "0").padEnd(3, "0").slice(0, 3);
      const ms = Number(fracStr);
      const time = mins * 60 + secs + ms / 1000;
      lines.push({ time, text });
    }
  }

  return lines.sort((a, b) => a.time - b.time);
}

function cleanTrackTitle(title: string): string {
  return title
    .replace(/\s*\((official|lyric|audio|video|remaster|feat\.?|ft\.?)[^)]*\)/gi, "")
    .replace(/\s*\[[^\]]*\]/g, "")
    .trim();
}

async function fetchYtmLyricsFallback(videoId: string): Promise<LyricsPayload | null> {
  if (!videoId) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nextData: any = await ytmPost("next", { videoId, isAudioOnly: true });
    const tabs =
      nextData?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer
        ?.watchNextTabbedResultsRenderer?.tabs || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lyricsTab = tabs.find((t: any) =>
      String(t?.tabRenderer?.endpoint?.browseEndpoint?.browseId || "").startsWith("MPLYt_"),
    );
    const browseId = lyricsTab?.tabRenderer?.endpoint?.browseEndpoint?.browseId;
    if (!browseId) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const browseData: any = await ytmPost("browse", { browseId });
    const timed =
      browseData?.contents?.elementRenderer?.newElement?.type?.componentType?.model
        ?.timedLyricsModel?.lyricsData ||
      browseData?.contents?.sectionListRenderer?.contents?.[0]?.musicTimedLyricsRenderer
        ?.timedLyricsData;

    if (Array.isArray(timed) && timed.length > 0) {
      const lines: LyricLine[] = [];
      for (const row of timed) {
        const text = String(row?.lyricLine || "").trim();
        const ms = Number(row?.cueRange?.startTimeMilliseconds ?? 0);
        if (text) lines.push({ time: ms / 1000, text });
      }
      if (lines.length > 0) {
        return {
          found: true,
          synced: true,
          lines,
          plainText: lines.map((l) => l.text).join("\n"),
          source: "ytmusic",
        };
      }
    }

    const desc =
      browseData?.contents?.sectionListRenderer?.contents?.[0]?.musicDescriptionShelfRenderer
        ?.description;
    const plain = extractRuns(desc).join("");
    if (plain.trim()) {
      return {
        found: true,
        synced: false,
        lines: [],
        plainText: plain.trim(),
        source: "ytmusic",
      };
    }
    return null;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  const title = String(req.query.title || "").trim();
  const artist = String(req.query.artist || "").trim();
  const videoId = String(req.query.videoId || "").trim();
  const duration = Number(req.query.duration || 0);

  if (!title) {
    return res.status(400).json({ error: "Missing title parameter" });
  }

  const cleanedTitle = cleanTrackTitle(title);
  const primaryArtist = artist.split(/[,&]|feat\.?|ft\.?/i)[0]?.trim() || artist;

  try {
    const headers = { "User-Agent": "MeldWeb/1.0 (https://github.com/xiiipsmanuislamiyah-creator-own/meld-web)" };

    // 1. Exact LRCLIB lookup
    const exactParams = new URLSearchParams({
      track_name: cleanedTitle,
      artist_name: primaryArtist,
    });
    if (duration > 10) {
      exactParams.set("duration", String(Math.round(duration)));
    }

    const exactRes = await fetch(`https://lrclib.net/api/get?${exactParams.toString()}`, { headers });
    if (exactRes.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const item: any = await exactRes.json();
      if (item?.syncedLyrics || item?.plainLyrics) {
        const syncedLines = item.syncedLyrics ? parseLrc(item.syncedLyrics) : [];
        const payload: LyricsPayload = {
          found: true,
          synced: syncedLines.length > 0,
          trackName: item.trackName,
          artistName: item.artistName,
          lines: syncedLines,
          plainText: item.plainLyrics || syncedLines.map((l) => l.text).join("\n"),
          source: "lrclib",
        };
        return res.status(200).json(payload);
      }
    }

    // 2. Fallback LRCLIB search lookup
    const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(`${cleanedTitle} ${primaryArtist}`)}`;
    const searchRes = await fetch(searchUrl, { headers });
    if (searchRes.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const list: any[] = await searchRes.json();
      if (Array.isArray(list) && list.length > 0) {
        const best = list.find((x) => Boolean(x?.syncedLyrics)) || list[0];
        const syncedLines = best?.syncedLyrics ? parseLrc(best.syncedLyrics) : [];
        if (syncedLines.length || best?.plainLyrics) {
          const payload: LyricsPayload = {
            found: true,
            synced: syncedLines.length > 0,
            trackName: best?.trackName,
            artistName: best?.artistName,
            lines: syncedLines,
            plainText: best?.plainLyrics || syncedLines.map((l) => l.text).join("\n"),
            source: "lrclib",
          };
          return res.status(200).json(payload);
        }
      }
    }

    // 3. Fallback to YouTube Music native lyrics
    if (videoId) {
      const ytm = await fetchYtmLyricsFallback(videoId);
      if (ytm) return res.status(200).json(ytm);
    }

    return res.status(200).json({
      found: false,
      synced: false,
      lines: [],
      source: "none",
    } satisfies LyricsPayload);
  } catch (err) {
    console.error("[api/lyrics]", err);
    return res.status(200).json({
      found: false,
      synced: false,
      lines: [],
      source: "none",
    } satisfies LyricsPayload);
  }
}
