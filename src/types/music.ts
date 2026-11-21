export interface Track {
  id: string; // videoId when resolved, or sp:<id> before lazy resolve
  videoId?: string;
  title: string;
  artist: string;
  album?: string;
  albumId?: string;
  durationSec: number;
  durationText: string;
  artwork: string;
  source: "ytm" | "spotify";
  plays?: string;
}

export interface CollectionSummary {
  id: string; // browseId (MPREb_... or VL... or local:...)
  title: string;
  subtitle: string;
  type: "album" | "playlist" | "single" | "chart";
  artwork: string;
  year?: string;
  trackCount?: number;
  source: "ytm" | "spotify" | "local";
}

export interface CollectionDetail extends CollectionSummary {
  artist: string;
  description?: string;
  tracks: Track[];
  spotifyUrl?: string;
  createdAt?: number;
}

export interface HomeShelf {
  id: string;
  title: string;
  kind: "tracks" | "collections";
  tracks?: Track[];
  collections?: CollectionSummary[];
}

export interface HomePayload {
  featured: CollectionSummary & {
    artist: string;
    tagline: string;
    sampleTrackId?: string;
  };
  quickPicks: Track[];
  shelves: HomeShelf[];
  mood: string;
  generatedAt: number;
}

export interface LyricLine {
  time: number; // seconds
  text: string;
}

export interface LyricsPayload {
  found: boolean;
  synced: boolean;
  trackName?: string;
  artistName?: string;
  lines: LyricLine[];
  plainText?: string;
  source: "lrclib" | "none";
}

export interface DynamicPalette {
  hue: number;
  chroma: number;
  accentLight: string;
  accentDark: string;
  accentSoftLight: string;
  accentSoftDark: string;
  dockBg: string;
  dockSurface: string;
  ambientLight: string;
  ambientDark: string;
  swatches: {
    dominant: string;
    vibrant: string;
    light: string;
    dark: string;
  };
}

export type ThemePreference = "light" | "dark" | "system";
export type RepeatMode = "off" | "all" | "one";
export type NavTab = "home" | "search" | "library";

export interface ListeningStatEntry {
  trackId: string;
  title: string;
  artist: string;
  artwork: string;
  playCount: number;
  secondsListened: number;
  lastPlayedAt: number;
}
