import React, { createContext, useCallback, useContext, useState } from "react";
import type {
  CollectionDetail,
  CollectionSummary,
  ListeningStatEntry,
  Track,
} from "../types/music";
import { storage } from "../lib/storage";

interface LibraryContextValue {
  likedTracks: Track[];
  savedCollections: CollectionSummary[];
  customPlaylists: CollectionDetail[];
  recentTracks: Track[];
  recentSearches: string[];
  stats: Record<string, ListeningStatEntry>;
  isLiked: (trackId: string) => boolean;
  toggleLike: (track: Track) => boolean;
  isCollectionSaved: (id: string) => boolean;
  toggleSaveCollection: (col: CollectionSummary) => boolean;
  saveImportedOrCustomPlaylist: (detail: CollectionDetail) => void;
  createPlaylist: (name: string, initialTrack?: Track) => CollectionDetail;
  addTrackToPlaylist: (playlistId: string, track: Track) => boolean;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  deletePlaylist: (playlistId: string) => void;
  getLocalPlaylistById: (id: string) => CollectionDetail | undefined;
  recordPlay: (track: Track) => void;
  addListeningSeconds: (track: Track, deltaSec: number) => void;
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
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

  const isLiked = useCallback(
    (trackId: string) => likedTracks.some((t) => t.id === trackId || t.videoId === trackId),
    [likedTracks],
  );

  const toggleLike = useCallback((track: Track): boolean => {
    let added = false;
    setLikedTracks((prev) => {
      const exists = prev.some((t) => t.id === track.id || (track.videoId && t.videoId === track.videoId));
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
          subtitle: `${pl.source === "spotify" ? "Imported from Spotify" : "Local Playlist"} — ${tracks.length} songs`,
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
          subtitle: `${pl.source === "spotify" ? "Imported from Spotify" : "Local Playlist"} — ${tracks.length} songs`,
        };
      });
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

  const recordPlay = useCallback((track: Track) => {
    setRecentTracks((prev) => {
      const next = [track, ...prev.filter((t) => t.id !== track.id)].slice(0, 40);
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
  }, []);

  const addRecentSearch = useCallback((query: string) => {
    const clean = query.trim();
    if (!clean) return;
    setRecentSearches((prev) => {
      const next = [clean, ...prev.filter((q) => q.toLowerCase() !== clean.toLowerCase())].slice(0, 8);
      storage.saveRecentSearches(next);
      return next;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    storage.saveRecentSearches([]);
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
        isLiked,
        toggleLike,
        isCollectionSaved,
        toggleSaveCollection,
        saveImportedOrCustomPlaylist,
        createPlaylist,
        addTrackToPlaylist,
        removeTrackFromPlaylist,
        deletePlaylist,
        getLocalPlaylistById,
        recordPlay,
        addListeningSeconds,
        addRecentSearch,
        clearRecentSearches,
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
