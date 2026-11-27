import { useEffect, useMemo, useRef, useState } from "react";
import {
  CircleNotch,
  Copy,
  FilmStrip,
  Lightning,
  MicrophoneStage,
  Minus,
  Plus,
  Translate,
} from "@phosphor-icons/react";
import type { LyricsPayload, Track } from "../types/music";
import { translateLyricsLines } from "../lib/api";
import { useSettings } from "../context/SettingsContext";
import { useToast } from "../context/ToastContext";

interface TimedWord {
  text: string;
  startFrac: number;
  endFrac: number;
}

const TRANSLATE_LANGS = [
  { code: "id", label: "ID" },
  { code: "en", label: "EN" },
  { code: "ms", label: "MS" },
  { code: "ja", label: "JP" },
  { code: "ko", label: "KR" },
] as const;

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
  playbackRate?: number;
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
  playbackRate = 1,
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
  const { settings, updateSettings } = useSettings();
  const { notify } = useToast();

  const activeLyricRef = useRef<HTMLButtonElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [scrolledAway, setScrolledAway] = useState(false);

  // AI / Neural Lyrics Translation State
  const [showTranslation, setShowTranslation] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translatedLines, setTranslatedLines] = useState<string[] | null>(null);
  const [translationEngine, setTranslationEngine] = useState<string | null>(null);
  const targetLang = settings.lyricsTranslateLang || "id";

  // Reset translation cleanly whenever track changes
  useEffect(() => {
    setShowTranslation(false);
    setTranslatedLines(null);
    setTranslationEngine(null);
    setTranslating(false);
  }, [currentTrack.id]);

  // Extract raw lines for translation (works for synced & plain lyrics)
  const rawLines = useMemo(() => {
    if (!lyrics?.found) return [];
    if (lyrics.synced && lyrics.lines.length > 0) {
      return lyrics.lines.map((l) => l.text);
    }
    if (lyrics.plainText) {
      return lyrics.plainText.split(/\r?\n/);
    }
    return [];
  }, [lyrics]);

  const runTranslation = async (lang: string) => {
    if (rawLines.length === 0) return;
    setTranslating(true);
    try {
      const res = await translateLyricsLines(
        rawLines,
        lang,
        currentTrack.id,
        currentTrack.title,
        currentTrack.artist,
      );
      setTranslatedLines(res.translations);
      setTranslationEngine(res.engine);
      setShowTranslation(true);
    } catch (err) {
      notify(
        err instanceof Error ? err.message : "Gagal menerjemahkan lirik.",
        "error",
      );
    } finally {
      setTranslating(false);
    }
  };

  const handleToggleTranslate = () => {
    if (showTranslation) {
      setShowTranslation(false);
      return;
    }
    if (translatedLines && translatedLines.length === rawLines.length) {
      setShowTranslation(true);
      return;
    }
    void runTranslation(targetLang);
  };

  const handleChangeLang = (lang: string) => {
    updateSettings({ lyricsTranslateLang: lang });
    setTranslatedLines(null);
    if (showTranslation) {
      void runTranslation(lang);
    }
  };

  // 60 FPS interpolated clock scaled accurately by active playbackRate
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
      const elapsed = ((performance.now() - syncRef.current.stamp) / 1000) * playbackRate;
      setSmoothTime(syncRef.current.time + Math.min(0.45 * playbackRate, elapsed));
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [playbackState, playbackRate]);

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
          <p style={{ fontSize: "var(--text-caption)", color: "var(--ink-muted)", lineHeight: 1.5, marginBottom: 12 }}>
            Tidak ditemukan lirik sinkron untuk "{currentTrack.title}". Anda tetap bisa membuat Video Visualizer di Studio.
          </p>
          <button type="button" className="btn btn-secondary" style={{ minHeight: 38, fontSize: "0.82rem" }} onClick={onOpenShareModal}>
            <FilmStrip size={16} weight="bold" />
            <span>Buka Studio Video</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="np-lyrics-container" style={{ position: "relative", width: "100%" }}>
      {/* Top Utility Bar for Lyrics */}
      <div className="lyrics-toolbar">
        <span style={{ fontSize: "0.74rem", color: "var(--ink-muted)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
          {lyrics.synced ? (lyrics.source === "ytmusic" ? "YTMusic" : "LRCLIB") : "Polos"}
          {showTranslation && translationEngine ? ` · AI ${targetLang.toUpperCase()}` : ""}
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {/* AI Translate Toggle + Language Selector */}
          <div className="lyrics-translate-group">
            <button
              type="button"
              className={`lyrics-tool-pill${showTranslation ? " is-active" : ""}`}
              onClick={handleToggleTranslate}
              disabled={translating}
              aria-label="Terjemahkan lirik baris per baris"
              title="Terjemahkan Lirik AI"
            >
              {translating ? (
                <CircleNotch size={13} weight="bold" style={{ animation: "spin 0.8s linear infinite" }} />
              ) : (
                <Translate size={14} weight="bold" />
              )}
              <span>{translating ? "Menerjemah..." : showTranslation ? "Terjemahan" : "Terjemahkan"}</span>
            </button>

            <select
              value={targetLang}
              onChange={(e) => handleChangeLang(e.target.value)}
              aria-label="Bahasa target terjemahan lirik"
              className="lyrics-lang-select"
            >
              {TRANSLATE_LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

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
                fontSize: "0.7rem",
                height: 30,
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
              <span style={{ minWidth: 42, textAlign: "center" }}>
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
            style={{ width: 30, height: 30 }}
            onClick={onOpenShareModal}
            aria-label="Buka Studio Video & Kartu Lirik"
            title="Studio Video & Kartu Lirik"
          >
            <FilmStrip size={16} weight="bold" />
          </button>

          <button
            type="button"
            className="icon-btn"
            style={{ width: 30, height: 30 }}
            onClick={onCopyLyrics}
            aria-label="Salin seluruh lirik"
            title="Salin lirik"
          >
            <Copy size={15} />
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
            const translated = showTranslation ? translatedLines?.[i] : undefined;

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
                  <div className="lyric-text-wrapper" style={{ flex: 1, textAlign: lyricsAlign }}>
                    <div className="karaoke-line-words" style={{ textAlign: lyricsAlign }}>
                      {words.map((w, wIdx) => {
                        let wordStatus: "sung" | "singing" | "upcoming" = "upcoming";

                        if (!isCurrent) {
                          wordStatus = isPast ? "sung" : "upcoming";
                        } else {
                          if (lineProgress >= w.endFrac) {
                            wordStatus = "sung";
                          } else if (lineProgress <= w.startFrac) {
                            wordStatus = "upcoming";
                          } else {
                            wordStatus = "singing";
                          }
                        }

                        return (
                          <span key={wIdx} className="karaoke-word-container">
                            <span className={`karaoke-word is-${wordStatus}`}>
                              {w.text}
                            </span>
                            {wIdx < words.length - 1 ? " " : ""}
                          </span>
                        );
                      })}
                    </div>

                    {translated && translated.toLowerCase() !== line.text.trim().toLowerCase() && (
                      <div className="lyric-translation-sub" style={{ textAlign: lyricsAlign }}>
                        {translated}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* Plain lyrics fallback (with optional line-by-line AI translation) */
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 6px", display: "flex", flexDirection: "column", gap: 10 }}>
          {rawLines.map((line, i) => {
            const trimmed = line.trim();
            if (!trimmed) return <div key={i} style={{ height: 8 }} />;
            const translated = showTranslation ? translatedLines?.[i] : undefined;
            return (
              <div key={i} style={{ textAlign: lyricsAlign }}>
                <div
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: `${Math.max(15, lyricsFontSize - 1)}px`,
                    lineHeight: 1.55,
                    color: "var(--ink)",
                    fontWeight: 500,
                  }}
                >
                  {trimmed}
                </div>
                {translated && translated.toLowerCase() !== trimmed.toLowerCase() && (
                  <div className="lyric-translation-sub" style={{ textAlign: lyricsAlign }}>
                    {translated}
                  </div>
                )}
              </div>
            );
          })}
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
