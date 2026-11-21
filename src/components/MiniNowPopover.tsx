import { useState } from "react";
import {
  ArrowsOutSimple,
  Heart,
  MicrophoneStage,
  Pause,
  PictureInPicture,
  Play,
  SkipBack,
  SkipForward,
  X,
} from "@phosphor-icons/react";
import { usePlayer } from "../context/PlayerContext";
import { useLibrary } from "../context/LibraryContext";
import { useToast } from "../context/ToastContext";
import { Artwork } from "./Artwork";
import { EqualizerBars } from "./EqualizerBars";
import { formatTime } from "../lib/waveform";

export function MiniNowPill() {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const {
    currentTrack,
    playbackState,
    currentTime,
    duration,
    pipMode,
    togglePlayPause,
    prevTrack,
    nextTrack,
    seekTo,
    setNowPlayingOpen,
    setDrawerOpen,
    setDrawerTab,
    togglePictureInPicture,
  } = usePlayer();
  const { isLiked, toggleLike } = useLibrary();
  const { notify } = useToast();

  if (!currentTrack) return null;

  const isPlaying = playbackState === "playing";
  const liked = isLiked(currentTrack.id);
  const dur = duration || currentTrack.durationSec || 1;
  const pct = Math.min(100, Math.max(0, (currentTime / dur) * 100));

  const showPopover = popoverOpen || pipMode === "floating";

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        className="topbar-now-pill"
        onClick={() => setPopoverOpen((v) => !v)}
        aria-label={`Quick controls for ${currentTrack.title}`}
        aria-expanded={showPopover}
      >
        <Artwork src={currentTrack.artwork} alt="" className="topbar-now-thumb" size={64} />
        <span className="topbar-now-title">{currentTrack.title}</span>
        <EqualizerBars paused={!isPlaying} />
      </button>

      {showPopover && (
        <div
          className="mini-now-popover"
          role="dialog"
          aria-label="Quick playback controller"
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Artwork
              src={currentTrack.artwork}
              alt=""
              style={{ width: 46, height: 46, borderRadius: 10, objectFit: "cover", flexShrink: 0 }}
              size={96}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: "0.9rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {currentTrack.title}
              </div>
              <div style={{ fontSize: "0.76rem", color: "var(--dock-ink-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {currentTrack.artist}
              </div>
            </div>
            <button
              type="button"
              className="dock-btn"
              style={{ width: 32, height: 32 }}
              onClick={() => void togglePictureInPicture()}
              aria-label="Picture in Picture"
              title="Background PiP"
            >
              <PictureInPicture size={16} />
            </button>
            <button
              type="button"
              className={`dock-btn${liked ? " is-active" : ""}`}
              style={{ width: 32, height: 32 }}
              onClick={() => {
                const added = toggleLike(currentTrack);
                notify(added ? "Saved to Liked Songs" : "Removed from Liked Songs", "info");
              }}
              aria-label={liked ? "Unlike" : "Like"}
            >
              <Heart size={16} weight={liked ? "fill" : "regular"} />
            </button>
            <button
              type="button"
              className="dock-btn"
              style={{ width: 32, height: 32 }}
              onClick={() => {
                setPopoverOpen(false);
                if (pipMode === "floating") void togglePictureInPicture();
              }}
              aria-label="Close quick controls"
            >
              <X size={16} />
            </button>
          </div>

          {/* Seek Bar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <input
              type="range"
              min={0}
              max={dur}
              value={Math.min(dur, currentTime)}
              onChange={(e) => seekTo(Number(e.target.value))}
              aria-label="Seek track position"
              style={{ width: "100%", accentColor: "var(--dock-accent)", cursor: "pointer" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--dock-ink-muted)" }}>
              <span>{formatTime(currentTime)}</span>
              <span>-{formatTime(Math.max(0, dur - currentTime))}</span>
            </div>
            <div style={{ height: 2, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden", display: "none" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: "var(--dock-accent)" }} />
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button
              type="button"
              className="dock-btn"
              onClick={() => {
                setPopoverOpen(false);
                setDrawerTab("lyrics");
                setDrawerOpen(true);
                setNowPlayingOpen(true);
              }}
              aria-label="Open synced lyrics"
            >
              <MicrophoneStage size={18} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button type="button" className="dock-btn" onClick={() => void prevTrack()} aria-label="Previous track">
                <SkipBack size={18} weight="fill" />
              </button>
              <button
                type="button"
                className="dock-play-btn"
                style={{ width: 40, height: 40 }}
                onClick={togglePlayPause}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" style={{ marginLeft: 2 }} />}
              </button>
              <button type="button" className="dock-btn" onClick={() => void nextTrack()} aria-label="Next track">
                <SkipForward size={18} weight="fill" />
              </button>
            </div>

            <button
              type="button"
              className="dock-btn"
              onClick={() => {
                setPopoverOpen(false);
                setNowPlayingOpen(true);
              }}
              aria-label="Expand full player"
            >
              <ArrowsOutSimple size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
