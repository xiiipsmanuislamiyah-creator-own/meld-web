import { useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  ImageSquare,
  Lightning,
  MicrophoneStage,
  Minus,
  Plus,
} from "@phosphor-icons/react";
import type { LyricsPayload, Track } from "../types/music";
import { EqualizerBars } from "./EqualizerBars";

interface NowPlayingLyricsProps {
  currentTrack: Track;
  lyrics: LyricsPayload | null;
  lyricsLoading: boolean;
  currentTime: number;
  playbackState: "playing" | "paused" | "buffering" | "ended" | "idle";
  lyricsFontSize: number;
  lyricsAlign: "left" | "center";
  lyricsAutoScroll: boolean;
  lyricsProgressiveBlur: boolean;
  lyricsOffsetMs: number;
  onShiftOffset: (deltaMs: number) => void;
  onSeek: (seconds: number) => void;
  onOpenShareModal: () => void;
  onCopyLyrics: () => void;
}

export function NowPlayingLyrics({
  currentTrack,
  lyrics,
  lyricsLoading,
  currentTime,
  playbackState,
  lyricsFontSize,
  lyricsAlign,
  lyricsAutoScroll,
  lyricsProgressiveBlur,
  lyricsOffsetMs,
  onShiftOffset,
  onSeek,
  onOpenShareModal,
  onCopyLyrics,
}: NowPlayingLyricsProps) {
  const activeLyricRef = useRef<HTMLButtonElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [scrolledAway, setScrolledAway] = useState(false);

  const offsetSeconds = lyricsOffsetMs / 1000;
  const effectiveTime = currentTime + offsetSeconds;

  const activeLyricIndex = useMemo(() => {
    if (!lyrics?.synced || !lyrics.lines || lyrics.lines.length === 0) return -1;
    return lyrics.lines.reduce((acc, line, idx) => {
      return line.time <= effectiveTime + 0.35 ? idx : acc;
    }, -1);
  }, [lyrics, effectiveTime]);

  // Centering auto-scroll with smooth animation
  useEffect(() => {
    if (lyricsAutoScroll && activeLyricRef.current) {
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      activeLyricRef.current.scrollIntoView({
        block: "center",
        behavior: prefersReduced ? "auto" : "smooth",
      });
      setScrolledAway(false);
    }
  }, [activeLyricIndex, lyricsAutoScroll]);

  // Detect manual scroll by user
  const handleScroll = () => {
    if (!activeLyricRef.current || !scrollContainerRef.current) return;
    const containerRect = scrollContainerRef.current.getBoundingClientRect();
    const activeRect = activeLyricRef.current.getBoundingClientRect();
    const isOutOfCenter =
      activeRect.bottom < containerRect.top + 60 ||
      activeRect.top > containerRect.bottom - 60;
    setScrolledAway(isOutOfCenter);
  };

  if (lyricsLoading) {
    return (
      <div className="np-lyrics-container" style={{ display: "flex", flexDirection: "column", gap: 12, padding: "20px 10px" }}>
        <div className="skeleton-box" style={{ height: 26, width: "80%" }} />
        <div className="skeleton-box" style={{ height: 26, width: "90%" }} />
        <div className="skeleton-box" style={{ height: 26, width: "65%" }} />
        <div className="skeleton-box" style={{ height: 26, width: "75%" }} />
        <div className="skeleton-box" style={{ height: 26, width: "85%" }} />
      </div>
    );
  }

  if (!lyrics?.found) {
    return (
      <div className="np-lyrics-container" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="state-panel" style={{ padding: "36px 20px", maxWidth: 380, textAlign: "center" }}>
          <MicrophoneStage size={36} weight="duotone" style={{ color: "var(--ink-muted)", margin: "0 auto 12px" }} />
          <p style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: 6 }}>Lirik Belum Tersedia</p>
          <p style={{ fontSize: "var(--text-caption)", color: "var(--ink-muted)", lineHeight: 1.5 }}>
            Tidak ditemukan lirik sinkron untuk "{currentTrack.title}". Musik instrumen atau lagu remix.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="np-lyrics-container" style={{ position: "relative", display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>
      {/* Top Utility Bar for Lyrics */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "6px 8px 12px",
          borderBottom: "1px solid var(--border-subtle)",
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: "0.76rem", color: "var(--ink-muted)", fontFamily: "var(--font-mono)" }}>
          {lyrics.synced ? `Sinkron via ${lyrics.source === "ytmusic" ? "YTMusic" : "LRCLIB"}` : "Lirik Polos"}
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* Offset timing buttons */}
          {lyrics.synced && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 2,
                padding: "2px 6px",
                borderRadius: "var(--radius-pill)",
                background: "var(--surface-raised)",
                fontFamily: "var(--font-mono)",
                fontSize: "0.72rem",
              }}
              title="Sinkronisasi offset waktu lirik"
            >
              <button
                type="button"
                onClick={() => onShiftOffset(-100)}
                aria-label="Mundurkan lirik 100ms"
                style={{ padding: "2px 4px", display: "inline-flex" }}
              >
                <Minus size={11} weight="bold" />
              </button>
              <span style={{ minWidth: 44, textAlign: "center" }}>
                {lyricsOffsetMs > 0 ? `+${lyricsOffsetMs}` : lyricsOffsetMs}ms
              </span>
              <button
                type="button"
                onClick={() => onShiftOffset(100)}
                aria-label="Majukan lirik 100ms"
                style={{ padding: "2px 4px", display: "inline-flex" }}
              >
                <Plus size={11} weight="bold" />
              </button>
            </div>
          )}

          <button
            type="button"
            className="icon-btn"
            style={{ width: 32, height: 32 }}
            onClick={onOpenShareModal}
            aria-label="Bagikan kartu lirik"
            title="Bagikan Kartu Lirik"
          >
            <ImageSquare size={16} />
          </button>

          <button
            type="button"
            className="icon-btn"
            style={{ width: 32, height: 32 }}
            onClick={onCopyLyrics}
            aria-label="Salin seluruh lirik"
            title="Salin lirik"
          >
            <Copy size={16} />
          </button>
        </div>
      </div>

      {/* Synced Lyrics Karaoke List */}
      {lyrics.synced ? (
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="lyrics-lines-container"
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            padding: "8px 4px 40px",
          }}
        >
          {lyrics.lines.map((line, i) => {
            const isCurrent = i === activeLyricIndex;
            const distance = activeLyricIndex >= 0 ? Math.abs(i - activeLyricIndex) : 0;
            const blurPx =
              lyricsProgressiveBlur && activeLyricIndex >= 0 && !isCurrent
                ? Math.min(2.4, distance * 0.45)
                : 0;
            const opacity =
              activeLyricIndex >= 0 && !isCurrent
                ? Math.max(0.32, 1 - distance * 0.14)
                : 1;

            // Accurate karaoke rhythm sweep calculation
            let sweepPct = 0;
            if (isCurrent) {
              const lineStart = line.time;
              const lineEnd = lyrics.lines[i + 1]?.time ?? (lineStart + 3.8);
              const dur = Math.max(0.5, lineEnd - lineStart);
              const progress = Math.max(0, Math.min(1, (effectiveTime - lineStart) / dur));
              sweepPct = Math.round(progress * 100);
            }

            return (
              <button
                key={`${line.time}-${i}`}
                ref={isCurrent ? activeLyricRef : null}
                type="button"
                className={`lyric-line${isCurrent ? " is-current" : ""}`}
                style={{
                  fontSize: isCurrent ? `${lyricsFontSize + 3}px` : `${lyricsFontSize}px`,
                  textAlign: lyricsAlign,
                  filter: blurPx > 0 ? `blur(${blurPx.toFixed(2)}px)` : undefined,
                  opacity,
                }}
                onClick={() => onSeek(Math.max(0, line.time - offsetSeconds))}
              >
                <div className="lyric-line-content">
                  {isCurrent && (
                    <div className="lyric-rhythm-badge" title="Irama Vokal Aktif">
                      <EqualizerBars paused={playbackState !== "playing"} />
                    </div>
                  )}
                  <div className="lyric-text-wrapper" style={{ flex: 1, textAlign: lyricsAlign }}>
                    <span className="lyric-text-base">{line.text}</span>
                    {isCurrent && (
                      <span
                        className="lyric-text-fill"
                        style={{ width: `${sweepPct}%` }}
                      >
                        {line.text}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* Plain lyrics fallback */
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 6px" }}>
          <pre
            style={{
              margin: 0,
              whiteSpace: "pre-wrap",
              fontFamily: "var(--font-body)",
              fontSize: `${Math.max(15, lyricsFontSize - 1)}px`,
              textAlign: lyricsAlign,
              lineHeight: 1.75,
              color: "var(--ink-secondary)",
            }}
          >
            {lyrics.plainText}
          </pre>
        </div>
      )}

      {/* Floating Re-Sync Button if User Scrolled Away */}
      {scrolledAway && activeLyricIndex >= 0 && (
        <button
          type="button"
          className="lyric-sync-btn"
          onClick={() => {
            activeLyricRef.current?.scrollIntoView({
              block: "center",
              behavior: "smooth",
            });
            setScrolledAway(false);
          }}
          aria-label="Kembali ke lirik aktif"
        >
          <Lightning size={14} weight="fill" />
          <span>Sinkron Lirik</span>
        </button>
      )}
    </div>
  );
}
