import { useEffect, useState } from "react";
import {
  CaretDown,
  CircleNotch,
  Heart,
  Moon,
  Pause,
  Play,
  Playlist,
  Repeat,
  RepeatOnce,
  ShareNetwork,
  Shuffle,
  SkipBack,
  SkipForward,
  Sun,
} from "@phosphor-icons/react";
import type { Track } from "../types/music";
import { usePlayer, type DrawerTab } from "../context/PlayerContext";
import { useLibrary } from "../context/LibraryContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { Artwork } from "./Artwork";
import { WaveformScrubber } from "./WaveformScrubber";
import { StudioDrawer } from "./StudioDrawer";

interface NowPlayingOverlayProps {
  onAddToPlaylist: (track: Track) => void;
}

export function NowPlayingOverlay({ onAddToPlaylist }: NowPlayingOverlayProps) {
  const {
    currentTrack,
    playbackState,
    currentTime,
    duration,
    shuffle,
    repeat,
    nowPlayingOpen,
    setNowPlayingOpen,
    togglePlayPause,
    nextTrack,
    prevTrack,
    seekTo,
    toggleShuffle,
    cycleRepeat,
  } = usePlayer();

  const { isLiked, toggleLike } = useLibrary();
  const { resolvedTheme, setThemePref } = useTheme();
  const { notify } = useToast();
  const [sideTab, setSideTab] = useState<DrawerTab>("lyrics");

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

  const handleShare = () => {
    const shareUrl = currentTrack.videoId
      ? `https://music.youtube.com/watch?v=${currentTrack.videoId}`
      : window.location.href;
    navigator.clipboard?.writeText(shareUrl).then(() => {
      notify("Track link copied to clipboard", "success");
    });
  };

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
            className="icon-btn icon-btn-surface"
            onClick={() => setThemePref(resolvedTheme === "light" ? "dark" : "light")}
            aria-label={resolvedTheme === "light" ? "Switch to adaptive dark mode" : "Switch to light paper mode"}
          >
            {resolvedTheme === "light" ? <Moon size={18} weight="fill" /> : <Sun size={18} weight="fill" />}
          </button>
          <button
            type="button"
            className="icon-btn icon-btn-surface"
            onClick={handleShare}
            aria-label="Share track link"
          >
            <ShareNetwork size={18} />
          </button>
        </div>
      </div>

      <div className="np-stage">
        {/* Left: Tactile Light/Dark Player Deck (Inspired directly by Brambles/Charcoal reference) */}
        <div className="np-deck">
          <div className="np-cover">
            <Artwork
              src={currentTrack.artwork}
              alt={`${currentTrack.title} album art`}
              priority
              size={544}
            />
          </div>

          <div className="np-info-row">
            <button
              type="button"
              className={`icon-btn${liked ? " is-active" : ""}`}
              onClick={() => {
                const added = toggleLike(currentTrack);
                notify(added ? `Saved "${currentTrack.title}" to Liked Songs` : `Removed from Liked Songs`, "info");
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
              <Shuffle size={22} weight={shuffle ? "bold" : "regular"} />
            </button>

            <button
              type="button"
              className="icon-btn"
              onClick={() => void prevTrack()}
              aria-label="Previous track"
            >
              <SkipBack size={26} weight="fill" />
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
              <SkipForward size={26} weight="fill" />
            </button>

            <button
              type="button"
              className={`icon-btn${repeat !== "off" ? " is-active" : ""}`}
              onClick={cycleRepeat}
              aria-label={`Repeat mode ${repeat}`}
            >
              {repeat === "one" ? (
                <RepeatOnce size={22} weight="bold" />
              ) : (
                <Repeat size={22} weight={repeat === "all" ? "bold" : "regular"} />
              )}
            </button>
          </div>
        </div>

        {/* Right: Embedded Synced Lyrics / Queue / Palette Inspector */}
        <StudioDrawer
          embedded
          activeTabOverride={sideTab}
          onTabChangeOverride={setSideTab}
        />
      </div>
    </div>
  );
}
