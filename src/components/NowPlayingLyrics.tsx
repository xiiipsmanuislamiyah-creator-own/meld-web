import React, { useEffect, useMemo, useRef, useState } from "react";
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

interface TimedWord {
  text: string;
  startFrac: number;
  endFrac: number;
}

function parseLineWords(text: string): TimedWord[] {
  const rawWords = text.trim().split(/\s+/).filter(Boolean);
  if (rawWords.length === 0) return [];
  const weights = rawWords.map((w) => Math.max(2, w.length));
  const total = weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  return rawWords.map((w, idx) => {
    const startFrac = acc / total;
    acc += weights[idx];
    const endFrac = acc / total;
    return { text: w, startFrac, endFrac };
  });
}

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

  // 60 FPS interpolated clock for fluid karaoke text sweep following music rhythm
  const [smoothTime, setSmoothTime] = useState(currentTime);
  const syncRef = useRef({ time: currentTime, stamp: performance.now() });

  useEffect(() => {
    syncRef.current = { time: currentTime, stamp: performance.now() };
    setSmoothTime(currentTime);
  }, [currentTime]);

  useEffect(() => {
    if (playbackState !== "playing") return;
    let rafId: number;
    const loop = () => {
      const elapsed = (performance.now() - syncRef.current.stamp) / 1000;
      setSmoothTime(syncRef.current.time + Math.min(0.4, elapsed));
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [playbackState]);

  const offsetSeconds = lyricsOffsetMs / 1000;
  const effectiveTime = smoothTime + offsetSeconds;

  const activeLyricIndex = useMemo(() => {
    if (!lyrics?.synced || !lyrics.lines || lyrics.lines.length === 0) return -1;
    let activeIdx = -1;
    for (let i = 0; i < lyrics.lines.length; i++) {
      if (lyrics.lines[i].time <= effectiveTime + 0.12) {
        activeIdx = i;
      } else {
        break;
      }
    }
    return activeIdx;
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
    <div className="np-lyrics-container" style={{ position: "relative", width: "100%" }}>
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
            gap: 8,
            padding: "8px 4px 40px",
          }}
        >
          {lyrics.lines.map((line, i) => {
            const isCurrent = i === activeLyricIndex;
            const isPast = activeLyricIndex >= 0 && i < activeLyricIndex;
            const isFuture = activeLyricIndex >= 0 && i > activeLyricIndex;
            const distance = activeLyricIndex >= 0 ? Math.abs(i - activeLyricIndex) : 0;
            const blurPx =
              lyricsProgressiveBlur && activeLyricIndex >= 0 && !isCurrent
                ? Math.min(2.4, distance * 0.45)
                : 0;
            const opacity =
              activeLyricIndex >= 0 && !isCurrent
                ? Math.max(0.35, 1 - distance * 0.15)
                : 1;

            const words = parseLineWords(line.text);

            // Accurate karaoke rhythm sweep calculation across line duration
            let lineProgress = 0;
            if (isCurrent) {
              const lineStart = line.time;
              const nextStart = lyrics.lines[i + 1]?.time;
              const lineEnd = nextStart ? nextStart : lineStart + Math.max(3.0, line.text.length * 0.14);
              const dur = Math.max(0.6, lineEnd - lineStart);
              lineProgress = Math.max(0, Math.min(1, (effectiveTime - lineStart) / dur));
            }

            const stateClass = isCurrent ? " is-current" : isPast ? " is-past" : isFuture ? " is-future" : "";

            return (
              <button
                key={`${line.time}-${i}`}
                ref={isCurrent ? activeLyricRef : null}
                type="button"
                className={`lyric-line${stateClass}`}
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
                    <div className="karaoke-line-words" style={{ textAlign: lyricsAlign }}>
                      {words.map((w, wIdx) => {
                        let wordStatus: "sung" | "singing" | "upcoming" = "upcoming";
                        let wordSweepPct = 0;

                        if (!isCurrent) {
                          wordStatus = isPast ? "sung" : "upcoming";
                        } else {
                          if (lineProgress >= w.endFrac) {
                            wordStatus = "sung";
                          } else if (lineProgress <= w.startFrac) {
                            wordStatus = "upcoming";
                          } else {
                            wordStatus = "singing";
                            const span = Math.max(0.001, w.endFrac - w.startFrac);
                            wordSweepPct = Math.max(
                              0,
                              Math.min(100, ((lineProgress - w.startFrac) / span) * 100),
                            );
                          }
                        }

                        const singingStyle: React.CSSProperties =
                          wordStatus === "singing"
                            ? {
                                background: `linear-gradient(90deg, var(--accent) 0%, var(--accent) ${wordSweepPct.toFixed(1)}%, color-mix(in srgb, var(--ink) 45%, transparent) ${wordSweepPct.toFixed(1)}%, color-mix(in srgb, var(--ink) 45%, transparent) 100%)`,
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                textShadow: "0 0 10px var(--accent-soft)",
                              }
                            : {};

                        return (
                          <span key={wIdx} className="karaoke-word-container">
                            <span
                              className={`karaoke-word is-${wordStatus}`}
                              style={singingStyle}
                            >
                              {w.text}
                            </span>
                            {wIdx < words.length - 1 ? " " : ""}
                          </span>
                        );
                      })}
                    </div>
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
