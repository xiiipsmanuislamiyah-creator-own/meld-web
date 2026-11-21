import React, { createContext, useCallback, useContext, useState } from "react";
import type {
  CollectionDetail,
  CollectionSummary,
  ContentRegion,
  ListeningStatEntry,
  Track,
} from "../types/music";
import { fetchCollectionDetail } from "../lib/api";
import { type MeldBackupPayload, storage } from "../lib/storage";

interface LibraryContextValue {
  likedTracks: Track[];
  savedCollections: CollectionSummary[];
  customPlaylists: CollectionDetail[];
  recentTracks: Track[];
  recentSearches: string[];
  stats: Record<string, ListeningStatEntry>;
  hourlyStats: number[];
  isLiked: (trackId: string) => boolean;
  toggleLike: (track: Track) => boolean;
  isCollectionSaved: (id: string) => boolean;
  toggleSaveCollection: (col: CollectionSummary) => boolean;
  saveImportedOrCustomPlaylist: (detail: CollectionDetail) => void;
  createPlaylist: (name: string, initialTrack?: Track) => CollectionDetail;
  addTrackToPlaylist: (playlistId: string, track: Track) => boolean;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  updatePlaylistTags: (playlistId: string, tags: string[]) => void;
  deletePlaylist: (playlistId: string) => void;
  getLocalPlaylistById: (id: string) => CollectionDetail | undefined;
  importYtmPlaylist: (urlOrId: string, region?: ContentRegion) => Promise<CollectionDetail>;
  recordPlay: (track: Track) => void;
  addListeningSeconds: (track: Track, deltaSec: number) => void;
  addRecentSearch: (query: string) => void;
  removeRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  clearListeningHistory: () => void;
  importBackupJson: (rawText: string) => { ok: boolean; error?: string };
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [likedTracks, setLikedTracks] = useState<Track[]>(() => storage.getLikedTracks());
  const [savedCollections, setSavedCollections] = useState<CollectionSummary[]>(() =>
    storage.getSavedCollections(),
  );
  const [customPlaylists, setCustomPlaylists] = useState<CollectionDetail[]>(() =>
    storage.getCustomPlaylists(),
  );
  const [recentTracks, setRecentTracks] = useState<Track[]>(() => storage.getRecentTracks());
  const [recentSearches, setRecentSearches] = useState<string[]>(() => storage.getRecentSearches());
  const [stats, setStats] = useState<Record<string, ListeningStatEntry>>(() => storage.getStats());
  const [hourlyStats, setHourlyStats] = useState<number[]>(() => storage.getHourlyStats());

  const isLiked = useCallback(
    (trackId: string) => likedTracks.some((t) => t.id === trackId || t.videoId === trackId),
    [likedTracks],
  );

  const toggleLike = useCallback((track: Track): boolean => {
    let added = false;
    setLikedTracks((prev) => {
      const exists = prev.some(
        (t) => t.id === track.id || (track.videoId && t.videoId === track.videoId),
      );
      const next = exists
        ? prev.filter((t) => t.id !== track.id && t.videoId !== track.videoId)
        : [track, ...prev];
      added = !exists;
      storage.saveLikedTracks(next);
      return next;
    });
    return added;
  }, []);

  const isCollectionSaved = useCallback(
    (id: string) =>
      savedCollections.some((c) => c.id === id) || customPlaylists.some((p) => p.id === id),
    [savedCollections, customPlaylists],
  );

  const toggleSaveCollection = useCallback((col: CollectionSummary): boolean => {
    let added = false;
    setSavedCollections((prev) => {
      const exists = prev.some((c) => c.id === col.id);
      const next = exists ? prev.filter((c) => c.id !== col.id) : [col, ...prev];
      added = !exists;
      storage.saveSavedCollections(next);
      return next;
    });
    return added;
  }, []);

  const saveImportedOrCustomPlaylist = useCallback((detail: CollectionDetail) => {
    setCustomPlaylists((prev) => {
      const filtered = prev.filter((p) => p.id !== detail.id);
      const next = [detail, ...filtered];
      storage.saveCustomPlaylists(next);
      return next;
    });
  }, []);

  const createPlaylist = useCallback((name: string, initialTrack?: Track): CollectionDetail => {
    const clean = name.trim() || "Untitled Playlist";
    const id = `local:${Date.now().toString(36)}`;
    const tracks = initialTrack ? [initialTrack] : [];
    const created: CollectionDetail = {
      id,
      title: clean,
      artist: "Your Library",
      subtitle: `Local Playlist — ${tracks.length} ${tracks.length === 1 ? "song" : "songs"}`,
      type: "playlist",
      artwork: initialTrack?.artwork || "",
      trackCount: tracks.length,
      tracks,
      source: "local",
      createdAt: Date.now(),
      tags: [],
    };
    setCustomPlaylists((prev) => {
      const next = [created, ...prev];
      storage.saveCustomPlaylists(next);
      return next;
    });
    return created;
  }, []);

  const addTrackToPlaylist = useCallback((playlistId: string, track: Track): boolean => {
    let added = false;
    setCustomPlaylists((prev) => {
      const next = prev.map((pl) => {
        if (pl.id !== playlistId) return pl;
        if (pl.tracks.some((t) => t.id === track.id)) return pl;
        added = true;
        const tracks = [...pl.tracks, track];
        return {
          ...pl,
          tracks,
          trackCount: tracks.length,
          artwork: pl.artwork || track.artwork,
          subtitle: `${pl.source === "spotify" ? "Imported from Spotify" : pl.source === "ytm" ? "Imported from YouTube Music" : "Local Playlist"} — ${tracks.length} songs`,
        };
      });
      storage.saveCustomPlaylists(next);
      return next;
    });
    return added;
  }, []);

  const removeTrackFromPlaylist = useCallback((playlistId: string, trackId: string) => {
    setCustomPlaylists((prev) => {
      const next = prev.map((pl) => {
        if (pl.id !== playlistId) return pl;
        const tracks = pl.tracks.filter((t) => t.id !== trackId);
        return {
          ...pl,
          tracks,
          trackCount: tracks.length,
          subtitle: `${pl.source === "spotify" ? "Imported from Spotify" : pl.source === "ytm" ? "Imported from YouTube Music" : "Local Playlist"} — ${tracks.length} songs`,
        };
      });
      storage.saveCustomPlaylists(next);
      return next;
    });
  }, []);

  const updatePlaylistTags = useCallback((playlistId: string, tags: string[]) => {
    const cleaned = [...new Set(tags.map((t) => t.trim()).filter(Boolean))].slice(0, 6);
    setCustomPlaylists((prev) => {
      const next = prev.map((pl) => (pl.id === playlistId ? { ...pl, tags: cleaned } : pl));
      storage.saveCustomPlaylists(next);
      return next;
    });
  }, []);

  const deletePlaylist = useCallback((playlistId: string) => {
    setCustomPlaylists((prev) => {
      const next = prev.filter((p) => p.id !== playlistId);
      storage.saveCustomPlaylists(next);
      return next;
    });
  }, []);

  const getLocalPlaylistById = useCallback(
    (id: string) => customPlaylists.find((p) => p.id === id),
    [customPlaylists],
  );

  const importYtmPlaylist = useCallback(
    async (urlOrId: string, region: ContentRegion = "ID"): Promise<CollectionDetail> => {
      const detail = await fetchCollectionDetail(urlOrId, region);
      const localCopy: CollectionDetail = {
        ...detail,
        id: `ytm-pl:${detail.id}`,
        subtitle: `Imported from YouTube Music — ${detail.tracks.length} songs`,
        createdAt: Date.now(),
        tags: ["YTM Import"],
      };
      saveImportedOrCustomPlaylist(localCopy);
      return localCopy;
    },
    [saveImportedOrCustomPlaylist],
  );

  const recordPlay = useCallback((track: Track) => {
    setRecentTracks((prev) => {
      const next = [track, ...prev.filter((t) => t.id !== track.id)].slice(0, 60);
      storage.saveRecentTracks(next);
      return next;
    });
    setStats((prev) => {
      const existing = prev[track.id];
      const updated: ListeningStatEntry = {
        trackId: track.id,
        title: track.title,
        artist: track.artist,
        artwork: track.artwork,
        playCount: (existing?.playCount || 0) + 1,
        secondsListened: existing?.secondsListened || 0,
        lastPlayedAt: Date.now(),
      };
      const next = { ...prev, [track.id]: updated };
      storage.saveStats(next);
      return next;
    });
  }, []);

  const addListeningSeconds = useCallback((track: Track, deltaSec: number) => {
    if (deltaSec <= 0) return;
    setStats((prev) => {
      const existing = prev[track.id];
      const updated: ListeningStatEntry = {
        trackId: track.id,
        title: track.title,
        artist: track.artist,
        artwork: track.artwork,
        playCount: existing?.playCount || 1,
        secondsListened: (existing?.secondsListened || 0) + deltaSec,
        lastPlayedAt: Date.now(),
      };
      const next = { ...prev, [track.id]: updated };
      storage.saveStats(next);
      return next;
    });
    const hour = new Date().getHours();
    setHourlyStats((prev) => {
      const next = [...prev];
      next[hour] = (next[hour] || 0) + deltaSec;
      storage.saveHourlyStats(next);
      return next;
    });
  }, []);

  const addRecentSearch = useCallback((query: string) => {
    const clean = query.trim();
    if (!clean) return;
    setRecentSearches((prev) => {
      const next = [clean, ...prev.filter((q) => q.toLowerCase() !== clean.toLowerCase())].slice(0, 10);
      storage.saveRecentSearches(next);
      return next;
    });
  }, []);

  const removeRecentSearch = useCallback((query: string) => {
    setRecentSearches((prev) => {
      const next = prev.filter((q) => q !== query);
      storage.saveRecentSearches(next);
      return next;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    storage.saveRecentSearches([]);
  }, []);

  const clearListeningHistory = useCallback(() => {
    setRecentTracks([]);
    setStats({});
    const zeros = new Array<number>(24).fill(0);
    setHourlyStats(zeros);
    storage.saveRecentTracks([]);
    storage.saveStats({});
    storage.saveHourlyStats(zeros);
  }, []);

  const importBackupJson = useCallback((rawText: string): { ok: boolean; error?: string } => {
    try {
      const parsed = JSON.parse(rawText) as Partial<MeldBackupPayload>;
      if (!parsed || typeof parsed !== "object") {
        return { ok: false, error: "Invalid JSON backup structure." };
      }
      if (Array.isArray(parsed.likedTracks)) {
        setLikedTracks(parsed.likedTracks);
        storage.saveLikedTracks(parsed.likedTracks);
      }
      if (Array.isArray(parsed.savedCollections)) {
        setSavedCollections(parsed.savedCollections);
        storage.saveSavedCollections(parsed.savedCollections);
      }
      if (Array.isArray(parsed.customPlaylists)) {
        setCustomPlaylists(parsed.customPlaylists);
        storage.saveCustomPlaylists(parsed.customPlaylists);
      }
      if (Array.isArray(parsed.recentTracks)) {
        setRecentTracks(parsed.recentTracks);
        storage.saveRecentTracks(parsed.recentTracks);
      }
      if (Array.isArray(parsed.recentSearches)) {
        setRecentSearches(parsed.recentSearches);
        storage.saveRecentSearches(parsed.recentSearches);
      }
      if (parsed.stats && typeof parsed.stats === "object") {
        setStats(parsed.stats);
        storage.saveStats(parsed.stats);
      }
      if (Array.isArray(parsed.hourlyStats) && parsed.hourlyStats.length === 24) {
        setHourlyStats(parsed.hourlyStats);
        storage.saveHourlyStats(parsed.hourlyStats);
      }
      return { ok: true };
    } catch {
      return { ok: false, error: "Could not parse backup JSON file." };
    }
  }, []);

  return (
    <LibraryContext.Provider
      value={{
        likedTracks,
        savedCollections,
        customPlaylists,
        recentTracks,
        recentSearches,
        stats,
        hourlyStats,
        isLiked,
        toggleLike,
        isCollectionSaved,
        toggleSaveCollection,
        saveImportedOrCustomPlaylist,
        createPlaylist,
        addTrackToPlaylist,
        removeTrackFromPlaylist,
        updatePlaylistTags,
        deletePlaylist,
        getLocalPlaylistById,
        importYtmPlaylist,
        recordPlay,
        addListeningSeconds,
        addRecentSearch,
        removeRecentSearch,
        clearRecentSearches,
        clearListeningHistory,
        importBackupJson,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used inside LibraryProvider");
  return ctx;
}
