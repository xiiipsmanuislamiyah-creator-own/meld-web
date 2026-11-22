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
import { BackgroundPipController, type PipMode } from "../lib/pip";
import { storage } from "../lib/storage";
import { YouTubeAudioEngine } from "../lib/ytEngine";
import { useTheme } from "./ThemeContext";
import { useLibrary } from "./LibraryContext";
import { useToast } from "./ToastContext";
import { useSettings } from "./SettingsContext";

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
  playbackRate: number;
  sleepTimerSec: number | null;
  sleepTimerEndOfTrack: boolean;
  nowPlayingOpen: boolean;
  videoStageOpen: boolean;
  pipMode: PipMode;
  drawerOpen: boolean;
  drawerTab: DrawerTab;
  lyrics: LyricsPayload | null;
  lyricsLoading: boolean;
  playTrack: (track: Track, list?: Track[], startIndex?: number) => Promise<void>;
  playCollectionTracks: (tracks: Track[], startShuffle?: boolean) => Promise<void>;
  startRadioFromTrack: (track: Track) => Promise<void>;
  togglePlayPause: () => void;
  nextTrack: () => Promise<void>;
  prevTrack: () => Promise<void>;
  seekTo: (seconds: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setPlaybackRate: (rate: number) => void;
  addToQueue: (track: Track, playNext?: boolean) => void;
  removeFromQueue: (index: number) => void;
  moveQueueItem: (from: number, to: number) => void;
  clearUpNextQueue: () => void;
  shuffleUpNextQueue: () => void;
  setSleepTimerMinutes: (minutes: number | null) => void;
  setSleepTimerEndOfTrack: (enabled: boolean) => void;
  setNowPlayingOpen: (open: boolean) => void;
  setVideoStageOpen: (open: boolean) => void;
  togglePictureInPicture: () => Promise<void>;
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
  const { settings, updateSettings } = useSettings();

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
  const [sleepTimerEndOfTrack, setSleepTimerEndOfTrackState] = useState(false);
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);
  const [videoStageOpen, setVideoStageOpen] = useState(false);
  const [pipMode, setPipMode] = useState<PipMode>("off");
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("lyrics");
  const [lyrics, setLyrics] = useState<LyricsPayload | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);

  const currentTrack = queueIndex >= 0 && queueIndex < queue.length ? queue[queueIndex] : null;

  const engineRef = useRef<YouTubeAudioEngine | null>(null);
  const pipRef = useRef<BackgroundPipController | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);

  const stateRef = useRef({
    queue,
    queueIndex,
    repeat,
    shuffle,
    playbackState,
    currentTime,
    duration,
    currentTrack,
    sleepTimerEndOfTrack,
    settings,
  });
  stateRef.current = {
    queue,
    queueIndex,
    repeat,
    shuffle,
    playbackState,
    currentTime,
    duration,
    currentTrack,
    sleepTimerEndOfTrack,
    settings,
  };

  const statTickAccumulator = useRef(0);
  const lastRecordedTrackId = useRef<string | null>(null);

  const loadAndStartTrack = useCallback(
    async (rawTrack: Track, idxInQueue: number) => {
      const keepPaused = stateRef.current.settings.keepPausedOnChange;
      setPlaybackState(keepPaused ? "paused" : "buffering");
      setCurrentTime(0);
      setDuration(rawTrack.durationSec || 0);

      let playable = rawTrack;
      if (!playable.videoId) {
        try {
          playable = await resolveTrackToVideoId(rawTrack);
          setQueue((prev) => prev.map((item, i) => (i === idxInQueue ? playable : item)));
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

      if (!keepPaused) {
        silentAudioRef.current?.play().catch(() => {});
      }
      engineRef.current?.load(playable.videoId!, !keepPaused);
    },
    [notify, recordPlay, syncArtworkPalette],
  );

  const nextTrack = useCallback(async () => {
    const { queue: q, queueIndex: idx, repeat: rep, shuffle: shuf, settings: cfg } =
      stateRef.current;
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
      } else if (cfg.autoContinueRadio && q[idx]?.videoId) {
        try {
          const radio = await fetchUpNextRadio(q[idx].videoId!);
          const fresh = radio.tracks.filter((r) => !q.some((existing) => existing.id === r.id));
          if (fresh.length > 0) {
            setQueue([...q, ...fresh]);
            setQueueIndex(nextIdx);
            await loadAndStartTrack(fresh[0], nextIdx);
            return;
          }
        } catch {
          // ignore radio error and pause
        }
        setPlaybackState("paused");
        return;
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

  const togglePlayPause = useCallback(() => {
    const st = stateRef.current.playbackState;
    if (!stateRef.current.currentTrack) return;
    if (st === "playing") {
      engineRef.current?.pause();
      silentAudioRef.current?.pause();
      setPlaybackState("paused");
    } else {
      silentAudioRef.current?.play().catch(() => {});
      engineRef.current?.play();
      setPlaybackState("playing");
    }
  }, []);

  // Mount YouTube IFrame Audio/Video Engine once
  useEffect(() => {
    if (!hostRef.current) return;
    const engine = new YouTubeAudioEngine({
      onStateChange: (st) => {
        if (st === "ended") {
          if (stateRef.current.sleepTimerEndOfTrack) {
            setSleepTimerEndOfTrackState(false);
            setPlaybackState("paused");
            notify("Track ended — sleep timer paused playback", "info");
            return;
          }
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
        if (stateRef.current.settings.autoSkipOnError) {
          notify("Track unavailable in region — skipping to next.", "error");
          void nextTrack();
        } else {
          setPlaybackState("paused");
          notify("Track unavailable in this region.", "error");
        }
      },
    });
    engine.setVolume(volume);
    engine.setPlaybackRate(settings.playbackRate);
    engineRef.current = engine;
    void engine.mount(hostRef.current);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        engineRef.current?.syncOnVisibility();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync playbackRate setting to engine
  useEffect(() => {
    engineRef.current?.setPlaybackRate(settings.playbackRate);
  }, [settings.playbackRate]);

  // Silent background audio keep-alive (prevents browser/mobile sleeping or stopping audio on tab exit)
  useEffect(() => {
    let createdUrl: string | null = null;
    try {
      // Build a genuine, valid 1.5s silent PCM WAV audio element so mobile Chrome & Safari
      // treat the tab as an active foreground audio playback session and never pause on tab exit/lockscreen
      const sampleRate = 8000;
      const numChannels = 1;
      const bitsPerSample = 16;
      const durationSec = 1.5;
      const numSamples = Math.floor(sampleRate * durationSec);
      const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
      const blockAlign = numChannels * (bitsPerSample / 8);
      const dataSize = numSamples * (bitsPerSample / 8);
      const buffer = new ArrayBuffer(44 + dataSize);
      const view = new DataView(buffer);

      const writeStr = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
      };

      writeStr(0, "RIFF");
      view.setUint32(4, 36 + dataSize, true);
      writeStr(8, "WAVE");
      writeStr(12, "fmt ");
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true); // PCM
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, byteRate, true);
      view.setUint16(32, blockAlign, true);
      view.setUint16(34, bitsPerSample, true);
      writeStr(36, "data");
      view.setUint32(40, dataSize, true);

      const blob = new Blob([buffer], { type: "audio/wav" });
      createdUrl = URL.createObjectURL(blob);
      const audio = new Audio(createdUrl);
      audio.loop = true;
      audio.volume = 0.0001;
      silentAudioRef.current = audio;
    } catch (_) {}

    return () => {
      silentAudioRef.current?.pause();
      silentAudioRef.current = null;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, []);

  // Sync silent audio loop and WakeLock with playbackState + Background tab visibility resilience
  useEffect(() => {
    const handleVisibility = () => {
      if (stateRef.current.playbackState === "playing") {
        silentAudioRef.current?.play().catch(() => {});
        engineRef.current?.play();
        if (document.visibilityState === "visible" && "wakeLock" in navigator && !wakeLockRef.current) {
          (navigator as any).wakeLock?.request("screen").then((wl: any) => {
            wakeLockRef.current = wl;
          }).catch(() => {});
        }
      }
    };

    const handleFocus = () => {
      if (stateRef.current.playbackState === "playing") {
        engineRef.current?.play();
        silentAudioRef.current?.play().catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handleVisibility);
    window.addEventListener("focus", handleFocus);

    if (playbackState === "playing") {
      silentAudioRef.current?.play().catch(() => {});
      if ("wakeLock" in navigator && !wakeLockRef.current) {
        (navigator as any).wakeLock?.request("screen").then((wl: any) => {
          wakeLockRef.current = wl;
        }).catch(() => {});
      }
    } else {
      silentAudioRef.current?.pause();
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handleVisibility);
      window.removeEventListener("focus", handleFocus);
    };
  }, [playbackState]);

  // PiP controller lifecycle & live updates
  useEffect(() => {
    pipRef.current = new BackgroundPipController({
      onTogglePlay: () => togglePlayPause(),
      onPrev: () => void prevTrack(),
      onNext: () => void nextTrack(),
      onClose: () => setPipMode("off"),
    });
    return () => {
      pipRef.current?.close(false);
      pipRef.current = null;
    };
  }, [nextTrack, prevTrack, togglePlayPause]);

  useEffect(() => {
    if (pipMode !== "off" && currentTrack && pipRef.current) {
      pipRef.current.update(
        currentTrack,
        playbackState === "playing",
        currentTime,
        duration || currentTrack.durationSec,
      );
    }
  }, [pipMode, currentTrack, playbackState, currentTime, duration]);

  // Fetch synced lyrics whenever current track changes
  useEffect(() => {
    if (!currentTrack) {
      setLyrics(null);
      return;
    }
    let cancelled = false;
    setLyricsLoading(true);
    const params = new URLSearchParams({
      title: currentTrack.title,
      artist: currentTrack.artist,
    });
    if (currentTrack.durationSec > 0) params.set("duration", String(Math.round(currentTrack.durationSec)));
    if (currentTrack.videoId) params.set("videoId", currentTrack.videoId);

    fetch(`/api/lyrics?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : fetchTrackLyrics(currentTrack.title, currentTrack.artist, currentTrack.durationSec)))
      .then((res: LyricsPayload) => {
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
  }, [currentTrack?.id, currentTrack?.title, currentTrack?.artist, currentTrack?.durationSec, currentTrack?.videoId]);

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
      navigator.mediaSession.playbackState =
        playbackState === "playing" ? "playing" : playbackState === "paused" ? "paused" : "none";
      navigator.mediaSession.setActionHandler("play", () => {
        engineRef.current?.play();
        setPlaybackState("playing");
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        engineRef.current?.pause();
        setPlaybackState("paused");
      });
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
  }, [currentTrack, playbackState, nextTrack, prevTrack]);

  // Sleep Timer countdown
  useEffect(() => {
    if (sleepTimerSec === null) return;
    if (sleepTimerSec <= 0) {
      engineRef.current?.pause();
      setPlaybackState("paused");
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

      if (stateRef.current.settings.autoContinueRadio && (!list || list.length <= 1) && track.videoId) {
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

  const startRadioFromTrack = useCallback(
    async (track: Track) => {
      let playable = track;
      if (!playable.videoId) {
        try {
          playable = await resolveTrackToVideoId(track);
        } catch (err) {
          notify(err instanceof Error ? err.message : "Could not start radio for this track.", "error");
          return;
        }
      }
      setQueue([playable]);
      setQueueIndex(0);
      await loadAndStartTrack(playable, 0);
      try {
        const radio = await fetchUpNextRadio(playable.videoId!);
        if (radio.tracks.length > 0) {
          setQueue([playable, ...radio.tracks.filter((t) => t.id !== playable.id)]);
          notify(`Started radio mix from "${playable.title}"`, "success");
        }
      } catch {
        notify(`Playing "${playable.title}"`, "info");
      }
    },
    [loadAndStartTrack, notify],
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

  const seekTo = useCallback((seconds: number) => {
    const clamped = Math.max(0, seconds);
    engineRef.current?.seekTo(clamped);
    setCurrentTime(clamped);
  }, []);

  const setVolume = useCallback(
    (vol: number) => {
      const clamped = Math.max(0, Math.min(100, vol));
      setVolumeState(clamped);
      storage.saveVolume(clamped);
      if (clamped > 0 && muted) {
        setMuted(false);
        engineRef.current?.setMuted(false);
      }
      engineRef.current?.setVolume(clamped);
    },
    [muted],
  );

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

  const setPlaybackRate = useCallback(
    (rate: number) => {
      updateSettings({ playbackRate: rate });
      engineRef.current?.setPlaybackRate(rate);
      notify(`Playback speed: ${rate}x`, "info");
    },
    [notify, updateSettings],
  );

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

  const clearUpNextQueue = useCallback(() => {
    setQueue((prev) => {
      const idx = stateRef.current.queueIndex;
      if (idx < 0 || idx >= prev.length) return [];
      return [prev[idx]];
    });
    setQueueIndex(0);
    notify("Cleared upcoming queue", "info");
  }, [notify]);

  const shuffleUpNextQueue = useCallback(() => {
    setQueue((prev) => {
      const idx = stateRef.current.queueIndex;
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const head = prev.slice(0, idx + 1);
      const tail = fisherYatesShuffle(prev.slice(idx + 1));
      return [...head, ...tail];
    });
    notify("Shuffled up-next queue", "info");
  }, [notify]);

  const setSleepTimerMinutes = useCallback(
    (minutes: number | null) => {
      setSleepTimerEndOfTrackState(false);
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

  const setSleepTimerEndOfTrack = useCallback(
    (enabled: boolean) => {
      setSleepTimerSec(null);
      setSleepTimerEndOfTrackState(enabled);
      notify(enabled ? "Playback will pause after this track" : "End-of-track timer cleared", "info");
    },
    [notify],
  );

  const togglePictureInPicture = useCallback(async () => {
    if (!currentTrack || !pipRef.current) return;
    if (pipMode !== "off") {
      pipRef.current.close(false);
      setPipMode("off");
      return;
    }
    const mode = await pipRef.current.open(
      currentTrack,
      playbackState === "playing",
      currentTime,
      duration || currentTrack.durationSec,
    );
    setPipMode(mode);
  }, [currentTrack, pipMode, playbackState, currentTime, duration]);

  // Global keyboard shortcuts (ignores inputs/textareas)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
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
        seekTo(stateRef.current.currentTime + stateRef.current.settings.skipSeconds);
      } else if (e.key === "ArrowLeft" && stateRef.current.currentTrack) {
        e.preventDefault();
        seekTo(Math.max(0, stateRef.current.currentTime - stateRef.current.settings.skipSeconds));
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
        playbackRate: settings.playbackRate,
        sleepTimerSec,
        sleepTimerEndOfTrack,
        nowPlayingOpen,
        videoStageOpen,
        pipMode,
        drawerOpen,
        drawerTab,
        lyrics,
        lyricsLoading,
        playTrack,
        playCollectionTracks,
        startRadioFromTrack,
        togglePlayPause,
        nextTrack,
        prevTrack,
        seekTo,
        setVolume,
        toggleMute,
        toggleShuffle,
        cycleRepeat,
        setPlaybackRate,
        addToQueue,
        removeFromQueue,
        moveQueueItem,
        clearUpNextQueue,
        shuffleUpNextQueue,
        setSleepTimerMinutes,
        setSleepTimerEndOfTrack,
        setNowPlayingOpen,
        setVideoStageOpen,
        togglePictureInPicture,
        setDrawerOpen,
        setDrawerTab,
      }}
    >
      {children}
      {/* Non-occluded in-viewport host (prevents mobile Chrome suspending background iframe audio, and docks visibly when Video Stage is active) */}
      <div
        className={`yt-audio-host${videoStageOpen && nowPlayingOpen ? " is-video-stage" : ""}`}
        aria-hidden={!videoStageOpen || !nowPlayingOpen}
      >
        <div ref={hostRef} style={{ width: "100%", height: "100%" }} />
      </div>
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside PlayerProvider");
  return ctx;
}
