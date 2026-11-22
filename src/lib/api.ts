import type {
  CollectionDetail,
  ContentRegion,
  HomePayload,
  LyricsPayload,
  LyricsTranslationPayload,
  SearchFilter,
  SearchPayload,
  Track,
} from "../types/music";

const cache = new Map<string, { expires: number; data: unknown }>();

async function fetchJson<T>(url: string, ttlMs = 120_000): Promise<T> {
  const now = Date.now();
  const hit = cache.get(url);
  if (hit && hit.expires > now) {
    return hit.data as T;
  }

  const res = await fetch(url);
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const errBody = await res.json();
      if (errBody?.error) msg = errBody.error;
    } catch {
      // ignore json parse error
    }
    throw new Error(msg);
  }
  const data = (await res.json()) as T;
  if (ttlMs > 0) {
    cache.set(url, { expires: now + ttlMs, data });
  }
  return data;
}

export function fetchHomeFeed(mood = "all", region: ContentRegion = "ID"): Promise<HomePayload> {
  return fetchJson<HomePayload>(
    `/api/home?mood=${encodeURIComponent(mood)}&gl=${encodeURIComponent(region)}`,
    180_000,
  );
}

export function searchCatalog(
  query: string,
  filter: SearchFilter = "all",
  region: ContentRegion = "ID",
): Promise<SearchPayload> {
  return fetchJson<SearchPayload>(
    `/api/search?q=${encodeURIComponent(query)}&filter=${encodeURIComponent(filter)}&gl=${encodeURIComponent(region)}`,
    90_000,
  );
}

export function fetchSearchSuggestions(
  query: string,
  region: ContentRegion = "ID",
): Promise<{ query: string; suggestions: string[] }> {
  return fetchJson(
    `/api/search?q=${encodeURIComponent(query)}&suggest=1&gl=${encodeURIComponent(region)}`,
    60_000,
  );
}

export function fetchCollectionDetail(
  id: string,
  region: ContentRegion = "ID",
): Promise<CollectionDetail> {
  return fetchJson<CollectionDetail>(
    `/api/browse?id=${encodeURIComponent(id)}&gl=${encodeURIComponent(region)}`,
    300_000,
  );
}

export function fetchUpNextRadio(videoId: string): Promise<{ videoId: string; tracks: Track[] }> {
  return fetchJson(`/api/upnext?videoId=${encodeURIComponent(videoId)}`, 180_000);
}

export function fetchTrackLyrics(
  title: string,
  artist: string,
  durationSec?: number,
): Promise<LyricsPayload> {
  const params = new URLSearchParams({ title, artist });
  if (durationSec && durationSec > 0) {
    params.set("duration", String(Math.round(durationSec)));
  }
  return fetchJson<LyricsPayload>(`/api/lyrics?${params.toString()}`, 600_000);
}

const translationCache = new Map<string, LyricsTranslationPayload>();

export async function translateLyricsLines(
  lines: string[],
  targetLang: string,
  trackId: string,
  trackTitle?: string,
  artist?: string,
): Promise<LyricsTranslationPayload> {
  const cacheKey = `${trackId}::${targetLang}::${lines.length}`;
  const hit = translationCache.get(cacheKey);
  if (hit) return hit;

  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lines, targetLang, trackTitle, artist }),
  });

  if (!res.ok) {
    let msg = `Terjemahan gagal (${res.status})`;
    try {
      const errBody = await res.json();
      if (errBody?.error) msg = errBody.error;
    } catch {
      // ignore json parse error
    }
    throw new Error(msg);
  }

  const data = (await res.json()) as LyricsTranslationPayload;
  translationCache.set(cacheKey, data);
  return data;
}

export function importSpotifyCollection(url: string): Promise<CollectionDetail> {
  return fetchJson<CollectionDetail>(
    `/api/spotify-import?url=${encodeURIComponent(url)}`,
    0,
  );
}

export async function resolveTrackToVideoId(track: Track): Promise<Track> {
  if (track.videoId) return track;
  const res = await searchCatalog(`${track.title} ${track.artist}`, "songs");
  const match = res.tracks[0];
  if (!match?.videoId) {
    throw new Error(`Could not locate stream for "${track.title}"`);
  }
  return {
    ...track,
    id: match.videoId,
    videoId: match.videoId,
    artwork: track.artwork || match.artwork,
    durationSec: track.durationSec || match.durationSec,
    durationText: track.durationText || match.durationText,
    source: "ytm",
  };
}
