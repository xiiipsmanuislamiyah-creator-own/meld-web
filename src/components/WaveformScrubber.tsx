import React, { useMemo, useRef, useState } from "react";
import { formatTime, generateTrackWaveform } from "../lib/waveform";

interface WaveformScrubberProps {
  trackId: string;
  currentTime: number;
  duration: number;
  onSeek: (seconds: number) => void;
  variant?: "hero" | "dock";
  barCount?: number;
}

export function WaveformScrubber({
  trackId,
  currentTime,
  duration,
  onSeek,
  variant = "hero",
  barCount = 58,
}: WaveformScrubberProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [hoverRatio, setHoverRatio] = useState<number | null>(null);
  const [draggingRatio, setDraggingRatio] = useState<number | null>(null);

  const peaks = useMemo(() => generateTrackWaveform(trackId || "meld", barCount), [trackId, barCount]);
  const safeDuration = duration > 0 ? duration : 1;
  const activeRatio =
    draggingRatio !== null ? draggingRatio : Math.max(0, Math.min(1, currentTime / safeDuration));

  const computeRatioFromClientX = (clientX: number): number => {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const ratio = computeRatioFromClientX(e.clientX);
    setDraggingRatio(ratio);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const ratio = computeRatioFromClientX(e.clientX);
    setHoverRatio(ratio);
    if (draggingRatio !== null) {
      setDraggingRatio(ratio);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingRatio !== null) {
      const ratio = computeRatioFromClientX(e.clientX);
      setDraggingRatio(null);
      onSeek(ratio * safeDuration);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    const step = Math.max(5, safeDuration * 0.05);
    if (e.key === "ArrowRight") {
      e.preventDefault();
      onSeek(Math.min(safeDuration, currentTime + step));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      onSeek(Math.max(0, currentTime - step));
    } else if (e.key === "Home") {
      e.preventDefault();
      onSeek(0);
    } else if (e.key === "End") {
      e.preventDefault();
      onSeek(safeDuration);
    }
  };

  const isDock = variant === "dock";

  return (
    <div className="waveform-wrap">
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Audio playback position"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(currentTime)}
        aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
        className={`waveform-track${isDock ? " compact" : ""}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          setHoverRatio(null);
          if (draggingRatio !== null) {
            onSeek(draggingRatio * safeDuration);
            setDraggingRatio(null);
          }
        }}
        onKeyDown={handleKeyDown}
      >
        {hoverRatio !== null && duration > 0 && (
          <span
            className="waveform-hover-pill"
            style={{ left: `${Math.max(8, Math.min(92, hoverRatio * 100))}%` }}
          >
            {formatTime(hoverRatio * safeDuration)}
          </span>
        )}
        {peaks.map((amp, i) => {
          const barPos = (i + 0.5) / peaks.length;
          const isPlayed = barPos <= activeRatio;
          const isHoveredAhead = hoverRatio !== null && barPos <= hoverRatio && !isPlayed;
          const heightPct = Math.round(amp * 100);

          let bg: string;
          if (isDock) {
            bg = isPlayed
              ? "var(--dock-accent)"
              : isHoveredAhead
                ? "rgba(255, 255, 255, 0.48)"
                : "rgba(255, 255, 255, 0.22)";
          } else {
            bg = isPlayed
              ? "var(--accent)"
              : isHoveredAhead
                ? "var(--ink-secondary)"
                : "var(--border-control)";
          }

          return (
            <span
              key={i}
              className="waveform-bar"
              style={{
                height: `${heightPct}%`,
                backgroundColor: bg,
              }}
            />
          );
        })}
      </div>

      <div
        className="waveform-times"
        style={isDock ? { color: "var(--dock-ink-muted)", fontSize: "0.72rem" } : undefined}
      >
        <span>{formatTime(draggingRatio !== null ? draggingRatio * safeDuration : currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
