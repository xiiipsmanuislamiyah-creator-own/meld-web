import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { Track } from "../src/types/music.js";
import {
  extractRuns,
  formatDuration,
  parseDurationSec,
  stripEmojis,
  upgradeThumb,
  ytmPost,
} from "./_lib/ytm.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "s-maxage=180, stale-while-revalidate=600");
  const videoId = String(req.query.videoId || "").trim();
  if (!videoId) {
    return res.status(400).json({ error: "Missing videoId" });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await ytmPost("next", {
      videoId,
      playlistId: `RDAMVM${videoId}`,
      isAudioOnly: true,
    });

    const queue =
      data?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer
        ?.watchNextTabbedResultsRenderer?.tabs?.[0]?.tabRenderer?.content
        ?.musicQueueRenderer?.content?.playlistPanelRenderer?.contents || [];

    const tracks: Track[] = [];
    for (const entry of queue) {
      const r = entry?.playlistPanelVideoRenderer;
      if (!r?.videoId || r.videoId === videoId) continue;

      const title = stripEmojis(extractRuns(r.title).join("") || "Untitled");
      const byline = extractRuns(r.longBylineText)
        .map((s) => s.trim())
        .filter((s) => s && s !== "•" && s !== "·");
      const artist = stripEmojis(byline[0] || "Unknown Artist");
      const album = stripEmojis(
        byline[1] && !/^\d{4}$/.test(byline[1]) ? byline[1] : "",
      );
      const lengthText = extractRuns(r.lengthText)[0] || "3:30";
      const durationSec = parseDurationSec(lengthText);
      const thumbs = r?.thumbnail?.thumbnails || [];
      const artwork =
        upgradeThumb(thumbs.length ? thumbs[thumbs.length - 1]?.url : "") ||
        `https://i.ytimg.com/vi/${r.videoId}/hqdefault.jpg`;

      tracks.push({
        id: r.videoId,
        videoId: r.videoId,
        title,
        artist,
        album: album || undefined,
        durationSec,
        durationText: durationSec > 0 ? formatDuration(durationSec) : lengthText,
        artwork,
        source: "ytm",
      });

      if (tracks.length >= 20) break;
    }

    return res.status(200).json({ videoId, tracks });
  } catch (err) {
    console.error("[api/upnext]", err);
    return res.status(200).json({ videoId, tracks: [] });
  }
}
