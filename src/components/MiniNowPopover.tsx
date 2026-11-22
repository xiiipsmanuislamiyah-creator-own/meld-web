import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowsOutSimple,
  DotsSixVertical,
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
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

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

  const isPlaying = playbackState === "playing";
  const liked = currentTrack ? isLiked(currentTrack.id) : false;
  const dur = currentTrack ? (duration || currentTrack.durationSec || 1) : 1;
  void dur;

  const showPopover = popoverOpen || pipMode === "floating";

  // Draggable Mouse & Touch handlers
  const handleStartDrag = (clientX: number, clientY: number) => {
    const rect = popoverRef.current?.getBoundingClientRect();
    const initX = dragPos ? dragPos.x : (rect ? rect.left : Math.max(12, window.innerWidth - 350));
    const initY = dragPos ? dragPos.y : (rect ? rect.top : 70);
    dragStartRef.current = { startX: clientX, startY: clientY, initX, initY };
    setIsDragging(true);
  };

  const onDragMove = useCallback((clientX: number, clientY: number) => {
    if (!dragStartRef.current) return;
    const dx = clientX - dragStartRef.current.startX;
    const dy = clientY - dragStartRef.current.startY;
    const nextX = Math.max(8, Math.min(window.innerWidth - 320, dragStartRef.current.initX + dx));
    const nextY = Math.max(8, Math.min(window.innerHeight - 180, dragStartRef.current.initY + dy));
    setDragPos({ x: nextX, y: nextY });
  }, []);

  const endDrag = useCallback(() => {
    dragStartRef.current = null;
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      onDragMove(e.clientX, e.clientY);
    };
    const handleMouseUp = () => endDrag();
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        onDragMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const handleTouchEnd = () => endDrag();

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, onDragMove, endDrag]);

  if (!currentTrack) return null;

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
          ref={popoverRef}
          className="mini-now-popover"
          role="dialog"
          aria-label="Quick playback controller"
          style={{
            position: "fixed",
            left: dragPos ? `${dragPos.x}px` : undefined,
            top: dragPos ? `${dragPos.y}px` : undefined,
            right: dragPos ? "auto" : "16px",
            transform: isDragging ? "scale(1.02)" : "none",
            boxShadow: isDragging
              ? "0 16px 36px rgba(0, 0, 0, 0.45)"
              : "var(--shadow-modal)",
            transition: isDragging ? "none" : "box-shadow 0.2s ease, transform 0.15s ease",
            userSelect: isDragging ? "none" : "auto",
          }}
        >
          {/* Dedicated Drag Grip Bar */}
          <div
            className="mini-now-drag-handle"
            onMouseDown={(e) => {
              e.preventDefault();
              handleStartDrag(e.clientX, e.clientY);
            }}
            onTouchStart={(e) => {
              if (e.touches.length > 0) {
                handleStartDrag(e.touches[0].clientX, e.touches[0].clientY);
              }
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: isDragging ? "grabbing" : "grab",
              padding: "2px 4px 6px",
              touchAction: "none",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              marginBottom: 4,
            }}
            title="Tahan & geser untuk memindahkan posisi bubble player"
          >
            <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--dock-ink-muted)", fontSize: "0.72rem" }}>
              <DotsSixVertical size={16} weight="bold" />
              <span>Geser Bubble</span>
            </div>
            <div
              style={{
                width: 32,
                height: 4,
                borderRadius: 2,
                background: "rgba(255,255,255,0.22)",
              }}
            />
            <span style={{ fontSize: "0.68rem", color: "var(--dock-ink-muted)", opacity: 0.8 }}>
              {dragPos ? "Kustom" : "Pojok Kanan"}
            </span>
          </div>

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
