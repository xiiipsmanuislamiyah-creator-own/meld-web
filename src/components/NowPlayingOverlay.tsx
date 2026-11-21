import { useEffect, useRef, useState } from "react";
import {
  ArrowClockwise,
  ArrowCounterClockwise,
  CaretDown,
  CircleNotch,
  Heart,
  Moon,
  Pause,
  PictureInPicture,
  Play,
  Playlist,
  Radio,
  Repeat,
  RepeatOnce,
  ShareNetwork,
  Shuffle,
  SkipBack,
  SkipForward,
  SpeakerHigh,
  SpeakerSlash,
  Sun,
  Timer,
  VideoCamera,
} from "@phosphor-icons/react";
import type { Track } from "../types/music";
import { usePlayer, type DrawerTab } from "../context/PlayerContext";
import { useLibrary } from "../context/LibraryContext";
import { useTheme } from "../context/ThemeContext";
import { useSettings } from "../context/SettingsContext";
import { useToast } from "../context/ToastContext";
import { Artwork } from "./Artwork";
import { WaveformScrubber } from "./WaveformScrubber";
import { StudioDrawer } from "./StudioDrawer";
import { formatTime } from "../lib/waveform";

interface NowPlayingOverlayProps {
  onAddToPlaylist: (track: Track) => void;
}

const SPEED_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function NowPlayingOverlay({ onAddToPlaylist }: NowPlayingOverlayProps) {
  const {
    currentTrack,
    playbackState,
    currentTime,
    duration,
    volume,
    muted,
    shuffle,
    repeat,
    playbackRate,
    sleepTimerSec,
    sleepTimerEndOfTrack,
    nowPlayingOpen,
    videoStageOpen,
    pipMode,
    setNowPlayingOpen,
    setVideoStageOpen,
    togglePictureInPicture,
    togglePlayPause,
    nextTrack,
    prevTrack,
    seekTo,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    setPlaybackRate,
    startRadioFromTrack,
  } = usePlayer();

  const { isLiked, toggleLike } = useLibrary();
  const { resolvedTheme, setThemePref } = useTheme();
  const { settings } = useSettings();
  const { notify } = useToast();

  const [sideTab, setSideTab] = useState<DrawerTab>("lyrics");
  const [mobileView, setMobileView] = useState<"playing" | DrawerTab>("playing");
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (!nowPlayingOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNowPlayingOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nowPlayingOpen, setNowPlayingOpen]);

  if (!nowPlayingOpen || !currentTrack) return null;

  const isPlaying = playbackState === "playing";
  const isBuffering = playbackState === "buffering";
  const liked = isLiked(currentTrack.id);
  const skipSec = settings.skipSeconds || 10;

  const handleShare = () => {
    const shareUrl = currentTrack.videoId
      ? `https://music.youtube.com/watch?v=${currentTrack.videoId}`
      : window.location.href;
    navigator.clipboard?.writeText(shareUrl).then(() => {
      notify("Track link copied to clipboard", "success");
    });
  };

  const handleCycleSpeed = () => {
    const idx = SPEED_STEPS.indexOf(playbackRate);
    const next = SPEED_STEPS[(idx + 1) % SPEED_STEPS.length];
    setPlaybackRate(next);
  };

  const handleSwipeStart = (e: React.TouchEvent) => {
    if (!settings.swipeToChangeTrack) return;
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const handleSwipeEnd = (e: React.TouchEvent) => {
    if (!settings.swipeToChangeTrack || touchStartX.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 60) return;
    if (delta < 0) void nextTrack();
    else void prevTrack();
  };

  const hasTimer = sleepTimerSec !== null || sleepTimerEndOfTrack;

  return (
    <div
      className="now-playing-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`Now Playing: ${currentTrack.title}`}
    >
      <div className="np-topbar">
        <button
          type="button"
          className="icon-btn icon-btn-surface"
          onClick={() => setNowPlayingOpen(false)}
          aria-label="Collapse now playing"
        >
          <CaretDown size={20} weight="bold" />
        </button>

        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "0.96rem",
            color: "var(--ink)",
          }}
        >
          Now Playing
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            type="button"
            className={`icon-btn icon-btn-surface${hasTimer ? " is-active" : ""}`}
            onClick={() => {
              setSideTab("studio");
              setMobileView("studio");
            }}
            aria-label="Open sleep timer and palette"
            title={
              sleepTimerSec !== null
                ? `Sleep timer: ${formatTime(sleepTimerSec)}`
                : sleepTimerEndOfTrack
                  ? "Sleep at end of track"
                  : "Sleep timer & Theme"
            }
          >
            <Timer size={18} weight={hasTimer ? "fill" : "regular"} />
          </button>

          <button
            type="button"
            className={`icon-btn icon-btn-surface${pipMode !== "off" ? " is-active" : ""}`}
            onClick={() => void togglePictureInPicture()}
            aria-label="Toggle Background Picture in Picture"
            title="Background Picture-in-Picture"
          >
            <PictureInPicture size={18} weight={pipMode !== "off" ? "fill" : "regular"} />
          </button>

          <button
            type="button"
            className={`icon-btn icon-btn-surface${videoStageOpen ? " is-active" : ""}`}
            onClick={() => {
              setVideoStageOpen(!videoStageOpen);
              if (!videoStageOpen) setMobileView("playing");
            }}
            aria-label={videoStageOpen ? "Switch to album cover" : "Show video stage"}
            title={videoStageOpen ? "Show Album Cover" : "Watch Music Video"}
          >
            <VideoCamera size={18} weight={videoStageOpen ? "fill" : "regular"} />
          </button>

          <button
            type="button"
            className="icon-btn icon-btn-surface"
            onClick={() => setThemePref(resolvedTheme === "light" ? "dark" : "light")}
            aria-label={resolvedTheme === "light" ? "Switch to adaptive dark mode" : "Switch to light paper mode"}
          >
            {resolvedTheme === "light" ? <Moon size={18} weight="fill" /> : <Sun size={18} weight="fill" />}
          </button>

          <button
            type="button"
            className="icon-btn icon-btn-surface np-hide-xs"
            onClick={handleShare}
            aria-label="Share track link"
          >
            <ShareNetwork size={18} />
          </button>
        </div>
      </div>

      {/* Mobile Segmented Switcher (Playing | Lyrics | Queue | Palette) */}
      <div className="np-mobile-tabs" role="tablist" aria-label="Now Playing views">
        {(
          [
            { id: "playing", label: "Playing" },
            { id: "lyrics", label: "Lyrics" },
            { id: "queue", label: "Queue" },
            { id: "studio", label: "Palette" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={mobileView === tab.id}
            className={`drawer-tab${mobileView === tab.id ? " is-active" : ""}`}
            onClick={() => {
              setMobileView(tab.id);
              if (tab.id !== "playing") setSideTab(tab.id);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={`np-stage${mobileView !== "playing" ? " np-mobile-show-side" : ""}`}>
        {/* Left: Tactile Player Deck */}
        <div className="np-deck">
          {videoStageOpen ? (
            <div className="np-video-spacer">
              <span style={{ fontSize: "var(--text-caption)", color: "var(--ink-muted)" }}>
                Video Stage Active
              </span>
            </div>
          ) : (
            <div
              className="np-cover"
              onTouchStart={handleSwipeStart}
              onTouchEnd={handleSwipeEnd}
            >
              <Artwork
                src={currentTrack.artwork}
                alt={`${currentTrack.title} album art`}
                priority
                size={544}
              />
            </div>
          )}

          <div className="np-info-row">
            <button
              type="button"
              className={`icon-btn${liked ? " is-active" : ""}`}
              onClick={() => {
                const added = toggleLike(currentTrack);
                notify(
                  added ? `Saved "${currentTrack.title}" to Liked Songs` : `Removed from Liked Songs`,
                  "info",
                );
              }}
              aria-label={liked ? "Unlike track" : "Like track"}
            >
              <Heart size={22} weight={liked ? "fill" : "regular"} />
            </button>

            <div className="np-info-center">
              <h2 className="np-track-title">{currentTrack.title}</h2>
              <p className="np-track-artist">{currentTrack.artist}</p>
            </div>

            <button
              type="button"
              className="icon-btn"
              onClick={() => onAddToPlaylist(currentTrack)}
              aria-label="Add track to playlist"
            >
              <Playlist size={22} />
            </button>
          </div>

          <WaveformScrubber
            trackId={currentTrack.id}
            currentTime={currentTime}
            duration={duration || currentTrack.durationSec}
            onSeek={seekTo}
            variant="hero"
            barCount={56}
          />

          <div className="np-transport">
            <button
              type="button"
              className={`icon-btn${shuffle ? " is-active" : ""}`}
              onClick={toggleShuffle}
              aria-label="Toggle shuffle"
              aria-pressed={shuffle}
            >
              <Shuffle size={21} weight={shuffle ? "bold" : "regular"} />
            </button>

            <button
              type="button"
              className="icon-btn"
              onClick={() => seekTo(Math.max(0, currentTime - skipSec))}
              aria-label={`Rewind ${skipSec} seconds`}
              title={`-${skipSec}s`}
            >
              <ArrowCounterClockwise size={20} />
            </button>

            <button
              type="button"
              className="icon-btn"
              onClick={() => void prevTrack()}
              aria-label="Previous track"
            >
              <SkipBack size={25} weight="fill" />
            </button>

            <button
              type="button"
              className="np-play-hero"
              onClick={togglePlayPause}
              aria-label={isPlaying ? "Pause playback" : "Resume playback"}
            >
              {isBuffering ? (
                <CircleNotch size={28} weight="bold" style={{ animation: "spin 0.8s linear infinite" }} />
              ) : isPlaying ? (
                <Pause size={28} weight="fill" />
              ) : (
                <Play size={28} weight="fill" style={{ marginLeft: 3 }} />
              )}
            </button>

            <button
              type="button"
              className="icon-btn"
              onClick={() => void nextTrack()}
              aria-label="Next track"
            >
              <SkipForward size={25} weight="fill" />
            </button>

            <button
              type="button"
              className="icon-btn"
              onClick={() => seekTo(currentTime + skipSec)}
              aria-label={`Forward ${skipSec} seconds`}
              title={`+${skipSec}s`}
            >
              <ArrowClockwise size={20} />
            </button>

            <button
              type="button"
              className={`icon-btn${repeat !== "off" ? " is-active" : ""}`}
              onClick={cycleRepeat}
              aria-label={`Repeat mode ${repeat}`}
            >
              {repeat === "one" ? (
                <RepeatOnce size={21} weight="bold" />
              ) : (
                <Repeat size={21} weight={repeat === "all" ? "bold" : "regular"} />
              )}
            </button>
          </div>

          {/* Volume + Quick Utility Strip */}
          <div className="np-utility-bar">
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 130 }}>
              <button
                type="button"
                className="icon-btn"
                style={{ width: 34, height: 34 }}
                onClick={toggleMute}
                aria-label={muted || volume === 0 ? "Unmute" : "Mute"}
              >
                {muted || volume === 0 ? <SpeakerSlash size={17} /> : <SpeakerHigh size={17} />}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={muted ? 0 : volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label="Volume"
                style={{ flex: 1, accentColor: "var(--accent)", cursor: "pointer" }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ minHeight: 36, padding: "0 12px", fontSize: "0.78rem" }}
                onClick={() => void startRadioFromTrack(currentTrack)}
              >
                <Radio size={15} /> Radio
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ minHeight: 36, padding: "0 12px", fontSize: "0.78rem", fontFamily: "var(--font-mono)" }}
                onClick={handleCycleSpeed}
                aria-label="Cycle playback speed"
              >
                {playbackRate}x
              </button>
            </div>
          </div>
        </div>

        {/* Right: Embedded Synced Lyrics / Queue / Palette Inspector */}
        <StudioDrawer
          embedded
          activeTabOverride={sideTab}
          onTabChangeOverride={(t) => {
            setSideTab(t);
            setMobileView(t);
          }}
        />
      </div>
    </div>
  );
}
