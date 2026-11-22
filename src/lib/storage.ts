import type {
  AppSettings,
  CollectionDetail,
  CollectionSummary,
  ListeningStatEntry,
  ThemePreference,
  Track,
} from "../types/music";
import { DEFAULT_EQ_SETTINGS } from "./audioDsp";

const KEYS = {
  liked: "meld:liked_tracks:v1",
  savedCollections: "meld:saved_collections:v1",
  customPlaylists: "meld:custom_playlists:v1",
  recentTracks: "meld:recent_tracks:v1",
  recentSearches: "meld:recent_searches:v1",
  stats: "meld:listening_stats:v1",
  hourlyStats: "meld:hourly_stats:v1",
  theme: "meld:theme_pref:v1",
  dynamicColor: "meld:dynamic_color:v1",
  volume: "meld:volume:v1",
  settings: "meld:app_settings:v1",
} as const;

export const DEFAULT_APP_SETTINGS: AppSettings = {
  pureBlack: false,
  cardRadius: "soft",
  lyricsFontSize: 18,
  lyricsAlign: "left",
  lyricsProgressiveBlur: true,
  lyricsAutoScroll: true,
  lyricsOffsetMs: 0,
  lyricsTranslateLang: "id",
  playbackRate: 1,
  pitchSemitones: 0,
  pitchSpeedLinked: true,
  eq: DEFAULT_EQ_SETTINGS,
  skipSeconds: 10,
  autoContinueRadio: true,
  keepPausedOnChange: false,
  autoSkipOnError: true,
  swipeToChangeTrack: true,
  backgroundPipEnabled: true,
  region: "ID",
  hideVideoSongs: false,
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage quota ignored gracefully
  }
}

export const storage = {
  getLikedTracks: (): Track[] => readJson<Track[]>(KEYS.liked, []),
  saveLikedTracks: (tracks: Track[]) => writeJson(KEYS.liked, tracks),

  getSavedCollections: (): CollectionSummary[] => readJson<CollectionSummary[]>(KEYS.savedCollections, []),
  saveSavedCollections: (cols: CollectionSummary[]) => writeJson(KEYS.savedCollections, cols),

  getCustomPlaylists: (): CollectionDetail[] => readJson<CollectionDetail[]>(KEYS.customPlaylists, []),
  saveCustomPlaylists: (pls: CollectionDetail[]) => writeJson(KEYS.customPlaylists, pls),

  getRecentTracks: (): Track[] => readJson<Track[]>(KEYS.recentTracks, []),
  saveRecentTracks: (tracks: Track[]) => writeJson(KEYS.recentTracks, tracks.slice(0, 60)),

  getRecentSearches: (): string[] => readJson<string[]>(KEYS.recentSearches, []),
  saveRecentSearches: (queries: string[]) => writeJson(KEYS.recentSearches, queries.slice(0, 12)),

  getStats: (): Record<string, ListeningStatEntry> =>
    readJson<Record<string, ListeningStatEntry>>(KEYS.stats, {}),
  saveStats: (stats: Record<string, ListeningStatEntry>) => writeJson(KEYS.stats, stats),

  getHourlyStats: (): number[] => {
    const arr = readJson<number[]>(KEYS.hourlyStats, []);
    return Array.isArray(arr) && arr.length === 24 ? arr : new Array<number>(24).fill(0);
  },
  saveHourlyStats: (hours: number[]) => writeJson(KEYS.hourlyStats, hours),

  getThemePref: (): ThemePreference => readJson<ThemePreference>(KEYS.theme, "light"),
  saveThemePref: (pref: ThemePreference) => writeJson(KEYS.theme, pref),

  getDynamicColorEnabled: (): boolean => readJson<boolean>(KEYS.dynamicColor, true),
  saveDynamicColorEnabled: (v: boolean) => writeJson(KEYS.dynamicColor, v),

  getVolume: (): number => readJson<number>(KEYS.volume, 85),
  saveVolume: (v: number) => writeJson(KEYS.volume, v),

  getSettings: (): AppSettings => {
    const saved = readJson<Partial<AppSettings>>(KEYS.settings, {});
    return {
      ...DEFAULT_APP_SETTINGS,
      ...saved,
      eq: {
        ...DEFAULT_EQ_SETTINGS,
        ...(saved.eq || {}),
        bands:
          Array.isArray(saved.eq?.bands) && saved.eq.bands.length === 5
            ? (saved.eq.bands as [number, number, number, number, number])
            : DEFAULT_EQ_SETTINGS.bands,
      },
    };
  },
  saveSettings: (settings: AppSettings) => writeJson(KEYS.settings, settings),
};

export interface MeldBackupPayload {
  version: 1;
  exportedAt: number;
  likedTracks: Track[];
  savedCollections: CollectionSummary[];
  customPlaylists: CollectionDetail[];
  recentTracks: Track[];
  recentSearches: string[];
  stats: Record<string, ListeningStatEntry>;
  hourlyStats: number[];
  settings: AppSettings;
  themePref: ThemePreference;
  dynamicColor: boolean;
}

export function exportLibraryBackupJson(): void {
  const payload: MeldBackupPayload = {
    version: 1,
    exportedAt: Date.now(),
    likedTracks: storage.getLikedTracks(),
    savedCollections: storage.getSavedCollections(),
    customPlaylists: storage.getCustomPlaylists(),
    recentTracks: storage.getRecentTracks(),
    recentSearches: storage.getRecentSearches(),
    stats: storage.getStats(),
    hourlyStats: storage.getHourlyStats(),
    settings: storage.getSettings(),
    themePref: storage.getThemePref(),
    dynamicColor: storage.getDynamicColorEnabled(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const dateStr = new Date().toISOString().slice(0, 10);
  triggerDownload(blob, `meld-library-backup-${dateStr}.json`);
}

export function exportPlaylistAsM3U(title: string, tracks: Track[]): void {
  const lines = ["#EXTM3U", `#PLAYLIST:${title}`];
  for (const t of tracks) {
    lines.push(`#EXTINF:${Math.round(t.durationSec || 0)},${t.artist} - ${t.title}`);
    lines.push(t.videoId ? `https://music.youtube.com/watch?v=${t.videoId}` : `# unresolved:${t.title}`);
  }
  const blob = new Blob([lines.join("\n")], { type: "audio/x-mpegurl;charset=utf-8" });
  triggerDownload(blob, `${slugify(title)}.m3u`);
}

export function exportPlaylistAsCSV(title: string, tracks: Track[]): void {
  const escape = (v: string) => `"${(v || "").replace(/"/g, '""')}"`;
  const rows = [
    ["#", "Title", "Artist", "Album", "Duration", "YouTube Music URL"].join(","),
    ...tracks.map((t, i) =>
      [
        i + 1,
        escape(t.title),
        escape(t.artist),
        escape(t.album || ""),
        escape(t.durationText),
        escape(t.videoId ? `https://music.youtube.com/watch?v=${t.videoId}` : ""),
      ].join(","),
    ),
  ];
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  triggerDownload(blob, `${slugify(title)}.csv`);
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "meld-playlist";
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
