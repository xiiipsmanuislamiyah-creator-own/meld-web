import type { CollectionSummary, Track } from "../../src/types/music.js";

const YTM_BASE = "https://music.youtube.com/youtubei/v1";

const YTM_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Origin: "https://music.youtube.com",
  Referer: "https://music.youtube.com/",
  "Accept-Language": "en-US,en;q=0.9",
};

const YTM_CONTEXT = {
  client: {
    clientName: "WEB_REMIX",
    clientVersion: "1.20241118.01.00",
    hl: "en",
    gl: "ID",
  },
};

export async function ytmPost<T = Record<string, unknown>>(
  endpoint: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const res = await fetch(`${YTM_BASE}/${endpoint}?prettyPrint=false`, {
      method: "POST",
      headers: YTM_HEADERS,
      body: JSON.stringify({
        context: YTM_CONTEXT,
        ...payload,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`InnerTube ${endpoint} HTTP ${res.status}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export function stripEmojis(input: string): string {
  return input
    .replace(
      /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0E}\u{FE0F}\u{200D}]/gu,
      "",
    )
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function upgradeThumb(url: string | undefined, size = 544): string {
  if (!url) return "";
  if (url.includes("googleusercontent.com")) {
    return url.replace(/=w\d+-h\d+[^&]*/i, `=w${size}-h${size}-l90-rj`);
  }
  return url;
}

export function parseDurationSec(text: string | undefined): number {
  if (!text) return 0;
  const cleaned = text.trim();
  if (!/^\d+:\d{2}(:\d{2})?$/.test(cleaned)) return 0;
  const parts = cleaned.split(":").map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return parts[0] * 60 + parts[1];
}

export function formatDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return "0:00";
  const total = Math.floor(sec);
  const mins = Math.floor(total / 60);
  const rem = total % 60;
  return `${mins}:${rem < 10 ? "0" : ""}${rem}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractRuns(obj: any): string[] {
  const runs = obj?.runs;
  if (!Array.isArray(runs)) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return runs.map((r: any) => String(r?.text ?? "")).filter(Boolean);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseResponsiveTrack(item: any, fallbackArtwork = "", fallbackArtist = "", fallbackAlbum = ""): Track | null {
  if (!item) return null;
  const videoId: string | undefined =
    item?.playlistItemData?.videoId ||
    item?.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer
      ?.playNavigationEndpoint?.watchEndpoint?.videoId ||
    item?.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]
      ?.navigationEndpoint?.watchEndpoint?.videoId;

  if (!videoId) return null;

  const col0 = extractRuns(item?.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text);
  const col1 = extractRuns(item?.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text);
  const col2 = extractRuns(item?.flexColumns?.[2]?.musicResponsiveListItemFlexColumnRenderer?.text);
  const fixed0 = extractRuns(item?.fixedColumns?.[0]?.musicResponsiveListItemFixedColumnRenderer?.text);

  const title = stripEmojis(col0.join("") || "Untitled Track");
  const metaTokens = col1.map((t) => t.trim()).filter((t) => t && t !== "•" && t !== "·");

  let durationText = fixed0[0] || "";
  if (!durationText) {
    const found = metaTokens.find((t) => /^\d+:\d{2}(:\d{2})?$/.test(t));
    if (found) durationText = found;
  }

  const nonDurationTokens = metaTokens.filter(
    (t) =>
      !/^\d+:\d{2}(:\d{2})?$/.test(t) &&
      !/^Song$/i.test(t) &&
      !/^Video$/i.test(t) &&
      !/plays$/i.test(t) &&
      !/views$/i.test(t),
  );

  // Extract album browseId if available in flexColumn 1 runs
  let albumId: string | undefined;
  const col1Runs = item?.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const run of col1Runs) {
    const bid = run?.navigationEndpoint?.browseEndpoint?.browseId;
    if (typeof bid === "string" && bid.startsWith("MPREb_")) {
      albumId = bid;
    }
  }

  const artist = stripEmojis(nonDurationTokens[0] || fallbackArtist || "Unknown Artist");
  const album = stripEmojis(
    (nonDurationTokens.length > 1 ? nonDurationTokens[nonDurationTokens.length - 1] : fallbackAlbum) || "",
  );
  const plays = col2.find((t) => /plays|views/i.test(t));

  const thumbs = item?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails;
  const rawThumb = Array.isArray(thumbs) && thumbs.length > 0 ? thumbs[thumbs.length - 1]?.url : "";
  const artwork = upgradeThumb(rawThumb) || fallbackArtwork || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  const durationSec = parseDurationSec(durationText);

  return {
    id: videoId,
    videoId,
    title,
    artist,
    album: album && album !== artist ? album : undefined,
    albumId,
    durationSec,
    durationText: durationText || (durationSec > 0 ? formatDuration(durationSec) : "3:30"),
    artwork,
    source: "ytm",
    plays,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseTwoRowCollection(item: any): CollectionSummary | null {
  if (!item) return null;
  const browseId: string | undefined =
    item?.navigationEndpoint?.browseEndpoint?.browseId;
  if (!browseId || (!browseId.startsWith("MPREb_") && !browseId.startsWith("VL") && !browseId.startsWith("PL"))) {
    return null;
  }

  const title = stripEmojis(extractRuns(item?.title).join("") || "Untitled Collection");
  const subRuns = extractRuns(item?.subtitle)
    .map((s) => s.trim())
    .filter((s) => s && s !== "•" && s !== "·");

  const rawType = (subRuns[0] || "").toLowerCase();
  let type: CollectionSummary["type"] = "playlist";
  if (browseId.startsWith("MPREb_") || rawType === "album" || rawType === "ep") {
    type = "album";
  } else if (rawType === "single") {
    type = "single";
  } else if (rawType === "chart") {
    type = "chart";
  }

  const subtitle = stripEmojis(
    subRuns.filter((s) => !/^(album|single|ep|playlist)$/i.test(s)).join(" — ") ||
      (type === "album" ? "Album" : "Playlist"),
  );

  const thumbs = item?.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails;
  const rawThumb = Array.isArray(thumbs) && thumbs.length > 0 ? thumbs[thumbs.length - 1]?.url : "";

  return {
    id: browseId,
    title,
    subtitle,
    type,
    artwork: upgradeThumb(rawThumb),
    source: "ytm",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseResponsiveCollection(item: any, defaultType: CollectionSummary["type"] = "album"): CollectionSummary | null {
  if (!item) return null;
  const browseId: string | undefined =
    item?.navigationEndpoint?.browseEndpoint?.browseId;
  if (!browseId) return null;

  const col0 = extractRuns(item?.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text);
  const col1 = extractRuns(item?.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text)
    .map((s) => s.trim())
    .filter((s) => s && s !== "•" && s !== "·");

  const title = stripEmojis(col0.join("") || "Untitled");
  const year = col1.find((t) => /^\d{4}$/.test(t));
  const subtitle = stripEmojis(
    col1.filter((t) => !/^(album|single|ep|playlist)$/i.test(t) && !/^\d{4}$/.test(t)).join(" — ") || "Collection",
  );

  const thumbs = item?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails;
  const rawThumb = Array.isArray(thumbs) && thumbs.length > 0 ? thumbs[thumbs.length - 1]?.url : "";

  return {
    id: browseId,
    title,
    subtitle,
    year,
    type: browseId.startsWith("MPREb_") ? "album" : defaultType,
    artwork: upgradeThumb(rawThumb),
    source: "ytm",
  };
}

export const STUDIO_FEATURED_CHARCOAL = {
  id: "MPREb_mtYHswx845I",
  title: "Charcoal",
  artist: "Brambles",
  subtitle: "Brambles — 2012",
  type: "album" as const,
  year: "2012",
  artwork:
    "https://yt3.googleusercontent.com/eG10CHPK5fXC5iL56qP1i8VfuxyknNeGJvEowGAbmIOuf4UFIkj3nR9OBAo3q_h4Xy-I3TiRuzQb9uWh=w544-h544-l90-rj",
  source: "ytm" as const,
  tagline:
    "Post-classical piano and warm ambient textures. Play any track to see Meld adapt light and dark surfaces to its sleeve tone.",
  sampleTrackId: "HfxutEFLqEw",
};

export const FALLBACK_QUICK_PICKS: Track[] = [
  {
    id: "HfxutEFLqEw",
    videoId: "HfxutEFLqEw",
    title: "Unsayable",
    artist: "Brambles",
    album: "Charcoal",
    albumId: "MPREb_mtYHswx845I",
    durationSec: 173,
    durationText: "2:53",
    artwork:
      "https://yt3.googleusercontent.com/eG10CHPK5fXC5iL56qP1i8VfuxyknNeGJvEowGAbmIOuf4UFIkj3nR9OBAo3q_h4Xy-I3TiRuzQb9uWh=w544-h544-l90-rj",
    source: "ytm",
  },
  {
    id: "TmYhBATXXgg",
    videoId: "TmYhBATXXgg",
    title: "Arête",
    artist: "Brambles",
    album: "Charcoal",
    albumId: "MPREb_mtYHswx845I",
    durationSec: 372,
    durationText: "6:12",
    artwork:
      "https://yt3.googleusercontent.com/eG10CHPK5fXC5iL56qP1i8VfuxyknNeGJvEowGAbmIOuf4UFIkj3nR9OBAo3q_h4Xy-I3TiRuzQb9uWh=w544-h544-l90-rj",
    source: "ytm",
  },
];
