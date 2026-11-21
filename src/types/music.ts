export interface Track {
  id: string; // videoId when resolved, or sp:<id> before lazy resolve
  videoId?: string;
  title: string;
  artist: string;
  artistId?: string;
  album?: string;
  albumId?: string;
  durationSec: number;
  durationText: string;
  artwork: string;
  source: "ytm" | "spotify";
  plays?: string;
  isVideo?: boolean;
}

export interface ArtistSummary {
  id: string;
  name: string;
  subscribers?: string;
  artwork: string;
}

export interface CollectionSummary {
  id: string; // browseId (MPREb_... or VL... or UC... or local:...)
  title: string;
  subtitle: string;
  type: "album" | "playlist" | "single" | "chart" | "artist";
  artwork: string;
  year?: string;
  trackCount?: number;
  source: "ytm" | "spotify" | "local";
}

export interface CollectionDetail extends CollectionSummary {
  artist: string;
  description?: string;
  tracks: Track[];
  collections?: CollectionSummary[]; // e.g., artist discography albums
  spotifyUrl?: string;
  createdAt?: number;
  tags?: string[];
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
  viralHits?: Track[];
  shelves: HomeShelf[];
  mood: string;
  region?: ContentRegion;
  generatedAt: number;
}

export interface SearchPayload {
  query: string;
  filter: SearchFilter;
  topResult?: Track | null;
  tracks: Track[];
  collections: CollectionSummary[];
  artists: ArtistSummary[];
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
  source: "lrclib" | "ytmusic" | "none";
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
export type NavTab = "home" | "search" | "explore" | "library" | "settings";
export type SearchFilter = "all" | "songs" | "videos" | "albums" | "artists" | "playlists";
export type ContentRegion = "ID" | "US" | "JP" | "KR" | "GB";
export type CardRadiusPreset = "sharp" | "soft" | "round";
export type LyricsAlign = "left" | "center";

export interface AppSettings {
  pureBlack: boolean;
  cardRadius: CardRadiusPreset;
  lyricsFontSize: number; // 16..26
  lyricsAlign: LyricsAlign;
  lyricsProgressiveBlur: boolean;
  lyricsAutoScroll: boolean;
  lyricsOffsetMs: number; // -2000..2000
  playbackRate: number; // 0.5..2
  skipSeconds: number; // 5 | 10 | 15 | 30
  autoContinueRadio: boolean;
  keepPausedOnChange: boolean;
  autoSkipOnError: boolean;
  swipeToChangeTrack: boolean;
  backgroundPipEnabled: boolean;
  region: ContentRegion;
  hideVideoSongs: boolean;
}

export interface ListeningStatEntry {
  trackId: string;
  title: string;
  artist: string;
  artwork: string;
  playCount: number;
  secondsListened: number;
  lastPlayedAt: number;
}
