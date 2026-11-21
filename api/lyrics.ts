import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { LyricLine, LyricsPayload } from "../src/types/music.js";

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  const title = String(req.query.title || "").trim();
  const artist = String(req.query.artist || "").trim();
  const duration = Number(req.query.duration || 0);

  if (!title) {
    return res.status(400).json({ error: "Missing title parameter" });
  }

  const cleanedTitle = cleanTrackTitle(title);
  const primaryArtist = artist.split(/[,&]|feat\.?|ft\.?/i)[0]?.trim() || artist;

  try {
    const headers = { "User-Agent": "MeldWeb/1.0 (https://github.com/xiiipsmanuislamiyah-creator-own/meld-web)" };

    // 1. Exact get lookup
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

    // 2. Fallback search lookup
    const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(`${cleanedTitle} ${primaryArtist}`)}`;
    const searchRes = await fetch(searchUrl, { headers });
    if (searchRes.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const list: any[] = await searchRes.json();
      if (Array.isArray(list) && list.length > 0) {
        const best = list.find((x) => Boolean(x?.syncedLyrics)) || list[0];
        const syncedLines = best?.syncedLyrics ? parseLrc(best.syncedLyrics) : [];
        const payload: LyricsPayload = {
          found: Boolean(syncedLines.length || best?.plainLyrics),
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
