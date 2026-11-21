import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { LyricsPayload, RepeatMode, Track } from "../types/music";
import {
  fetchTrackLyrics,
  fetchUpNextRadio,
  resolveTrackToVideoId,
} from "../lib/api";
import { storage } from "../lib/storage";
import { YouTubeAudioEngine } from "../lib/ytEngine";
import { useTheme } from "./ThemeContext";
import { useLibrary } from "./LibraryContext";
import { useToast } from "./ToastContext";

type PlaybackState = "idle" | "buffering" | "playing" | "paused";
export type DrawerTab = "lyrics" | "queue" | "studio";

interface PlayerContextValue {
  currentTrack: Track | null;
  queue: Track[];
  queueIndex: number;
  playbackState: PlaybackState;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  sleepTimerSec: number | null;
  nowPlayingOpen: boolean;
  drawerOpen: boolean;
  drawerTab: DrawerTab;
  lyrics: LyricsPayload | null;
  lyricsLoading: boolean;
  playTrack: (track: Track, list?: Track[], startIndex?: number) => Promise<void>;
  playCollectionTracks: (tracks: Track[], startShuffle?: boolean) => Promise<void>;
  togglePlayPause: () => void;
  nextTrack: () => Promise<void>;
  prevTrack: () => Promise<void>;
  seekTo: (seconds: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  addToQueue: (track: Track, playNext?: boolean) => void;
  removeFromQueue: (index: number) => void;
  moveQueueItem: (from: number, to: number) => void;
  setSleepTimerMinutes: (minutes: number | null) => void;
  setNowPlayingOpen: (open: boolean) => void;
  setDrawerOpen: (open: boolean) => void;
  setDrawerTab: (tab: DrawerTab) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

function fisherYatesShuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { syncArtworkPalette } = useTheme();
  const { recordPlay, addListeningSeconds } = useLibrary();
  const { notify } = useToast();

  const [queue, setQueue] = useState<Track[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(-1);
  const [playbackState, setPlaybackState] = useState<PlaybackState>("idle");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState<number>(() => storage.getVolume());
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [sleepTimerSec, setSleepTimerSec] = useState<number | null>(null);
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("lyrics");
  const [lyrics, setLyrics] = useState<LyricsPayload | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);

  const currentTrack = queueIndex >= 0 && queueIndex < queue.length ? queue[queueIndex] : null;

  const engineRef = useRef<YouTubeAudioEngine | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef({
    queue,
    queueIndex,
    repeat,
    shuffle,
    playbackState,
    currentTime,
    currentTrack,
  });
  stateRef.current = {
    queue,
    queueIndex,
    repeat,
    shuffle,
    playbackState,
    currentTime,
    currentTrack,
  };

  const statTickAccumulator = useRef(0);
  const lastRecordedTrackId = useRef<string | null>(null);

  const loadAndStartTrack = useCallback(
    async (rawTrack: Track, idxInQueue: number) => {
      setPlaybackState("buffering");
      setCurrentTime(0);
      setDuration(rawTrack.durationSec || 0);

      let playable = rawTrack;
      if (!playable.videoId) {
        try {
          playable = await resolveTrackToVideoId(rawTrack);
          setQueue((prev) =>
            prev.map((item, i) => (i === idxInQueue ? playable : item)),
          );
        } catch (err) {
          setPlaybackState("paused");
          notify(
            err instanceof Error ? err.message : "Could not match track on YouTube Music.",
            "error",
          );
          return;
        }
      }

      if (playable.artwork) {
        syncArtworkPalette(playable.artwork);
      }

      if (lastRecordedTrackId.current !== playable.id) {
        lastRecordedTrackId.current = playable.id;
        recordPlay(playable);
      }

      engineRef.current?.load(playable.videoId!);
    },
    [notify, recordPlay, syncArtworkPalette],
  );

  const nextTrack = useCallback(async () => {
    const { queue: q, queueIndex: idx, repeat: rep, shuffle: shuf } = stateRef.current;
    if (q.length === 0) return;

    if (rep === "one") {
      engineRef.current?.seekTo(0);
      engineRef.current?.play();
      return;
    }

    let nextIdx = idx + 1;
    if (shuf && q.length > 2) {
      const candidates = q.map((_, i) => i).filter((i) => i !== idx);
      nextIdx = candidates[Math.floor(Math.random() * candidates.length)];
    } else if (nextIdx >= q.length) {
      if (rep === "all") {
        nextIdx = 0;
      } else {
        setPlaybackState("paused");
        return;
      }
    }

    setQueueIndex(nextIdx);
    await loadAndStartTrack(q[nextIdx], nextIdx);
  }, [loadAndStartTrack]);

  const prevTrack = useCallback(async () => {
    const { queue: q, queueIndex: idx, currentTime: cur } = stateRef.current;
    if (q.length === 0) return;
    if (cur > 3) {
      engineRef.current?.seekTo(0);
      setCurrentTime(0);
      return;
    }
    const prevIdx = idx > 0 ? idx - 1 : q.length - 1;
    setQueueIndex(prevIdx);
    await loadAndStartTrack(q[prevIdx], prevIdx);
  }, [loadAndStartTrack]);

  // Mount hidden YouTube IFrame Audio Engine once
  useEffect(() => {
    if (!hostRef.current) return;
    const engine = new YouTubeAudioEngine({
      onStateChange: (st) => {
        if (st === "ended") {
          void nextTrack();
        } else {
          setPlaybackState(st);
        }
      },
      onProgress: (cur, dur) => {
        setCurrentTime(cur);
        if (dur > 0) setDuration(dur);
        if (stateRef.current.playbackState === "playing" && stateRef.current.currentTrack) {
          statTickAccumulator.current += 0.35;
          if (statTickAccumulator.current >= 5) {
            const chunk = Math.floor(statTickAccumulator.current);
            statTickAccumulator.current -= chunk;
            addListeningSeconds(stateRef.current.currentTrack, chunk);
          }
        }
      },
      onError: () => {
        notify("Track unavailable in region — skipping to next.", "error");
        void nextTrack();
      },
    });
    engine.setVolume(volume);
    engineRef.current = engine;
    void engine.mount(hostRef.current);

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch synced lyrics whenever current track changes
  useEffect(() => {
    if (!currentTrack) {
      setLyrics(null);
      return;
    }
    let cancelled = false;
    setLyricsLoading(true);
    fetchTrackLyrics(currentTrack.title, currentTrack.artist, currentTrack.durationSec)
      .then((res) => {
        if (!cancelled) setLyrics(res);
      })
      .catch(() => {
        if (!cancelled) setLyrics({ found: false, synced: false, lines: [], source: "none" });
      })
      .finally(() => {
        if (!cancelled) setLyricsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentTrack?.id, currentTrack?.title, currentTrack?.artist, currentTrack?.durationSec]);

  // OS Media Session integration (Lock screen & media keys)
  useEffect(() => {
    if (!currentTrack || !("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album || "Meld Web",
        artwork: currentTrack.artwork
          ? [{ src: currentTrack.artwork, sizes: "544x544", type: "image/jpeg" }]
          : [],
      });
      navigator.mediaSession.setActionHandler("play", () => engineRef.current?.play());
      navigator.mediaSession.setActionHandler("pause", () => engineRef.current?.pause());
      navigator.mediaSession.setActionHandler("nexttrack", () => void nextTrack());
      navigator.mediaSession.setActionHandler("previoustrack", () => void prevTrack());
      navigator.mediaSession.setActionHandler("seekto", (d) => {
        if (typeof d.seekTime === "number") {
          engineRef.current?.seekTo(d.seekTime);
          setCurrentTime(d.seekTime);
        }
      });
    } catch {
      // ignore unsupported browser mediaSession handlers
    }
  }, [currentTrack, nextTrack, prevTrack]);

  // Sleep Timer countdown
  useEffect(() => {
    if (sleepTimerSec === null) return;
    if (sleepTimerSec <= 0) {
      engineRef.current?.pause();
      setSleepTimerSec(null);
      notify("Sleep timer ended — playback paused.", "info");
      return;
    }
    const t = window.setTimeout(() => {
      setSleepTimerSec((s) => (s === null ? null : s - 1));
    }, 1000);
    return () => clearTimeout(t);
  }, [sleepTimerSec, notify]);

  const playTrack = useCallback(
    async (track: Track, list?: Track[], startIndex?: number) => {
      let nextQueue: Track[];
      let idx: number;

      if (list && list.length > 0) {
        nextQueue = list;
        idx =
          typeof startIndex === "number"
            ? startIndex
            : Math.max(
                0,
                list.findIndex((t) => t.id === track.id),
              );
      } else {
        nextQueue = [track];
        idx = 0;
      }

      setQueue(nextQueue);
      setQueueIndex(idx);
      await loadAndStartTrack(nextQueue[idx], idx);

      // Auto-populate Up Next Radio if playing a single standalone track
      if ((!list || list.length <= 1) && track.videoId) {
        fetchUpNextRadio(track.videoId)
          .then((radio) => {
            if (radio.tracks.length > 0) {
              setQueue((prev) => {
                if (prev.length > 1) return prev;
                return [prev[0] || track, ...radio.tracks.filter((r) => r.id !== track.id)];
              });
            }
          })
          .catch(() => {});
      }
    },
    [loadAndStartTrack],
  );

  const playCollectionTracks = useCallback(
    async (tracks: Track[], startShuffle = false) => {
      if (tracks.length === 0) return;
      setShuffle(startShuffle);
      const ordered = startShuffle ? fisherYatesShuffle(tracks) : tracks;
      setQueue(ordered);
      setQueueIndex(0);
      await loadAndStartTrack(ordered[0], 0);
    },
    [loadAndStartTrack],
  );

  const togglePlayPause = useCallback(() => {
    const st = stateRef.current.playbackState;
    if (!stateRef.current.currentTrack) return;
    if (st === "playing") {
      engineRef.current?.pause();
      setPlaybackState("paused");
    } else {
      engineRef.current?.play();
      setPlaybackState("playing");
    }
  }, []);

  const seekTo = useCallback((seconds: number) => {
    engineRef.current?.seekTo(seconds);
    setCurrentTime(seconds);
  }, []);

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(100, vol));
    setVolumeState(clamped);
    storage.saveVolume(clamped);
    if (clamped > 0 && muted) {
      setMuted(false);
      engineRef.current?.setMuted(false);
    }
    engineRef.current?.setVolume(clamped);
  }, [muted]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      engineRef.current?.setMuted(next);
      return next;
    });
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle((prev) => !prev);
  }, []);

  const cycleRepeat = useCallback(() => {
    setRepeat((prev) => (prev === "off" ? "all" : prev === "all" ? "one" : "off"));
  }, []);

  const addToQueue = useCallback(
    (track: Track, playNext = false) => {
      setQueue((prev) => {
        if (prev.length === 0) return [track];
        const insertAt = playNext ? Math.max(0, stateRef.current.queueIndex + 1) : prev.length;
        const copy = [...prev];
        copy.splice(insertAt, 0, track);
        return copy;
      });
      notify(playNext ? `Playing "${track.title}" next` : `Added "${track.title}" to queue`, "success");
    },
    [notify],
  );

  const removeFromQueue = useCallback((index: number) => {
    setQueue((prev) => {
      if (index < 0 || index >= prev.length || index === stateRef.current.queueIndex) return prev;
      const copy = [...prev];
      copy.splice(index, 1);
      if (index < stateRef.current.queueIndex) {
        setQueueIndex((i) => Math.max(0, i - 1));
      }
      return copy;
    });
  }, []);

  const moveQueueItem = useCallback((from: number, to: number) => {
    setQueue((prev) => {
      if (from < 0 || to < 0 || from >= prev.length || to >= prev.length || from === to) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      if (from === stateRef.current.queueIndex) setQueueIndex(to);
      else if (from < stateRef.current.queueIndex && to >= stateRef.current.queueIndex) {
        setQueueIndex((i) => i - 1);
      } else if (from > stateRef.current.queueIndex && to <= stateRef.current.queueIndex) {
        setQueueIndex((i) => i + 1);
      }
      return copy;
    });
  }, []);

  const setSleepTimerMinutes = useCallback(
    (minutes: number | null) => {
      if (minutes === null) {
        setSleepTimerSec(null);
        notify("Sleep timer cleared", "info");
      } else {
        setSleepTimerSec(minutes * 60);
        notify(`Sleep timer set for ${minutes} min`, "success");
      }
    },
    [notify],
  );

  // Global keyboard shortcuts (ignores inputs/textareas)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.code === "Space" && stateRef.current.currentTrack) {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === "ArrowRight" && stateRef.current.currentTrack) {
        e.preventDefault();
        seekTo(stateRef.current.currentTime + 5);
      } else if (e.key === "ArrowLeft" && stateRef.current.currentTrack) {
        e.preventDefault();
        seekTo(Math.max(0, stateRef.current.currentTime - 5));
      } else if (e.key.toLowerCase() === "n" && stateRef.current.currentTrack) {
        void nextTrack();
      } else if (e.key.toLowerCase() === "p" && stateRef.current.currentTrack) {
        void prevTrack();
      } else if (e.key.toLowerCase() === "m") {
        toggleMute();
      } else if (e.key.toLowerCase() === "l") {
        setDrawerOpen(true);
        setDrawerTab("lyrics");
      } else if (e.key.toLowerCase() === "q") {
        setDrawerOpen(true);
        setDrawerTab("queue");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nextTrack, prevTrack, seekTo, toggleMute, togglePlayPause]);

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        queue,
        queueIndex,
        playbackState,
        currentTime,
        duration,
        volume,
        muted,
        shuffle,
        repeat,
        sleepTimerSec,
        nowPlayingOpen,
        drawerOpen,
        drawerTab,
        lyrics,
        lyricsLoading,
        playTrack,
        playCollectionTracks,
        togglePlayPause,
        nextTrack,
        prevTrack,
        seekTo,
        setVolume,
        toggleMute,
        toggleShuffle,
        cycleRepeat,
        addToQueue,
        removeFromQueue,
        moveQueueItem,
        setSleepTimerMinutes,
        setNowPlayingOpen,
        setDrawerOpen,
        setDrawerTab,
      }}
    >
      {children}
      <div className="yt-audio-host" aria-hidden="true">
        <div ref={hostRef} />
      </div>
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside PlayerProvider");
  return ctx;
}
