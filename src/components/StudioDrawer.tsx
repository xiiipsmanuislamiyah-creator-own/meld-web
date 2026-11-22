import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CircleNotch,
  Copy,
  ImageSquare,
  Lightning,
  ListPlus,
  MagnifyingGlass,
  MicrophoneStage,
  Minus,
  Moon,
  Palette,
  Play,
  Plus,
  Queue,
  Shuffle,
  Sparkle,
  Sun,
  Timer,
  Trash,
  X,
} from "@phosphor-icons/react";
import { usePlayer, type DrawerTab } from "../context/PlayerContext";
import { useTheme } from "../context/ThemeContext";
import { useSettings } from "../context/SettingsContext";
import { useToast } from "../context/ToastContext";
import { Artwork } from "./Artwork";
import { EqualizerBars } from "./EqualizerBars";
import { LyricsShareModal } from "./LyricsShareModal";
import { formatTime } from "../lib/waveform";
import { fetchUpNextRadio, searchCatalog } from "../lib/api";
import type { Track } from "../types/music";

interface StudioDrawerProps {
  embedded?: boolean;
  activeTabOverride?: DrawerTab;
  onTabChangeOverride?: (tab: DrawerTab) => void;
}

export function StudioDrawer({
  embedded = false,
  activeTabOverride,
  onTabChangeOverride,
}: StudioDrawerProps) {
  const {
    currentTrack,
    queue,
    queueIndex,
    playbackState,
    currentTime,
    lyrics,
    lyricsLoading,
    sleepTimerSec,
    sleepTimerEndOfTrack,
    drawerTab,
    setDrawerTab,
    setDrawerOpen,
    playTrack,
    seekTo,
    removeFromQueue,
    moveQueueItem,
    clearUpNextQueue,
    shuffleUpNextQueue,
    addToQueue,
    setSleepTimerMinutes,
    setSleepTimerEndOfTrack,
  } = usePlayer();

  const { resolvedTheme, setThemePref, dynamicColor, setDynamicColor, palette } = useTheme();
  const { settings, updateSettings } = useSettings();
  const { notify } = useToast();

  const [queueFilter, setQueueFilter] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [candidateTracks, setCandidateTracks] = useState<Track[]>([]);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [catalogResults, setCatalogResults] = useState<Track[]>([]);
  const [catalogSearching, setCatalogSearching] = useState(false);
  const [scrolledAway, setScrolledAway] = useState(false);

  const activeTab = activeTabOverride ?? drawerTab;
  const setTab = onTabChangeOverride ?? setDrawerTab;

  const activeLyricRef = useRef<HTMLButtonElement | null>(null);
  const lyricsScrollContainerRef = useRef<HTMLDivElement | null>(null);

  const offsetSeconds = settings.lyricsOffsetMs / 1000;
  const effectiveTime = currentTime + offsetSeconds;

  const activeLyricIndex =
    lyrics?.synced && lyrics.lines.length > 0
      ? lyrics.lines.reduce((acc, line, idx) => (line.time <= effectiveTime + 0.35 ? idx : acc), -1)
      : -1;

  // Auto-fetch Candidate Tracks (Rekomendasi Kandidat Selanjutnya)
  useEffect(() => {
    if (!currentTrack) {
      setCandidateTracks([]);
      return;
    }
    let cancelled = false;
    setCandidateLoading(true);

    const loadCandidates = async () => {
      try {
        let recs: Track[] = [];
        if (currentTrack.videoId) {
          const res = await fetchUpNextRadio(currentTrack.videoId);
          recs = res.tracks || [];
        }
        if (recs.length === 0) {
          const searchRes = await searchCatalog(`${currentTrack.artist} ${currentTrack.title}`, "songs");
          recs = searchRes.tracks || [];
        }
        if (!cancelled) {
          const queueIds = new Set(queue.map((t) => t.id));
          const filtered = recs.filter((t) => t.id !== currentTrack.id && !queueIds.has(t.id));
          setCandidateTracks(filtered.slice(0, 6));
        }
      } catch {
        if (!cancelled) setCandidateTracks([]);
      } finally {
        if (!cancelled) setCandidateLoading(false);
      }
    };

    void loadCandidates();
    return () => {
      cancelled = true;
    };
  }, [currentTrack?.id, currentTrack?.videoId, currentTrack?.artist, currentTrack?.title, queue.length]);

  // Online Catalog Search for Queue when user types in search box
  useEffect(() => {
    const q = queueFilter.trim();
    if (activeTab !== "queue" || q.length < 1) {
      setCatalogResults([]);
      setCatalogSearching(false);
      return;
    }

    setCatalogSearching(true);
    const timer = window.setTimeout(() => {
      searchCatalog(q, "songs")
        .then((res) => {
          setCatalogResults(res.tracks.slice(0, 8));
        })
        .catch(() => setCatalogResults([]))
        .finally(() => setCatalogSearching(false));
    }, 160);

    return () => clearTimeout(timer);
  }, [queueFilter, activeTab]);

  useEffect(() => {
    if (activeTab === "lyrics" && settings.lyricsAutoScroll && activeLyricRef.current) {
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      activeLyricRef.current.scrollIntoView({
        block: "center",
        behavior: prefersReduced ? "auto" : "smooth",
      });
      setScrolledAway(false);
    }
  }, [activeLyricIndex, activeTab, settings.lyricsAutoScroll]);

  // Detect manual user scrolling on lyrics container
  const handleLyricsScroll = () => {
    if (!activeLyricRef.current || !lyricsScrollContainerRef.current) return;
    const container = lyricsScrollContainerRef.current;
    const activeEl = activeLyricRef.current;
    const containerRect = container.getBoundingClientRect();
    const activeRect = activeEl.getBoundingClientRect();
    const isOutOfCenter =
      activeRect.bottom < containerRect.top + 50 ||
      activeRect.top > containerRect.bottom - 50;
    setScrolledAway(isOutOfCenter);
  };

  const filteredQueueEntries = useMemo(() => {
    const q = queueFilter.trim().toLowerCase();
    return queue
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => {
        if (!q) return true;
        return (
          item.title.toLowerCase().includes(q) ||
          item.artist.toLowerCase().includes(q)
        );
      });
  }, [queue, queueFilter]);

  const lyricLinesForShare = useMemo(() => {
    if (!lyrics?.found) return [];
    if (lyrics.synced && lyrics.lines.length > 0) {
      return lyrics.lines.map((l) => l.text);
    }
    if (lyrics.plainText) {
      return lyrics.plainText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
    }
    return [];
  }, [lyrics]);

  const handleCopyLyrics = () => {
    const text = lyrics?.plainText || lyrics?.lines.map((l) => l.text).join("\n");
    if (!text) return;
    navigator.clipboard?.writeText(text).then(() => {
      notify("Lyrics copied to clipboard", "success");
    });
  };

  const shiftLyricsOffset = (deltaMs: number) => {
    const next = Math.max(-2000, Math.min(2000, settings.lyricsOffsetMs + deltaMs));
    updateSettings({ lyricsOffsetMs: next });
  };

  const inner = (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem" }}>
          Studio Inspector
        </span>
        {!embedded && (
          <button
            type="button"
            className="icon-btn"
            style={{ width: 34, height: 34 }}
            onClick={() => setDrawerOpen(false)}
            aria-label="Close studio drawer"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="drawer-tabs" role="tablist" aria-label="Studio panel tabs">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "lyrics"}
          className={`drawer-tab${activeTab === "lyrics" ? " is-active" : ""}`}
          onClick={() => setTab("lyrics")}
        >
          Lyrics
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "queue"}
          className={`drawer-tab${activeTab === "queue" ? " is-active" : ""}`}
          onClick={() => setTab("queue")}
        >
          Queue ({queue.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "studio"}
          className={`drawer-tab${activeTab === "studio" ? " is-active" : ""}`}
          onClick={() => setTab("studio")}
        >
          Palette
        </button>
      </div>

      <div className="drawer-body">
        {activeTab === "lyrics" && (
          <>
            {!currentTrack ? (
              <div className="state-panel" style={{ padding: "28px 16px" }}>
                <MicrophoneStage size={28} weight="duotone" style={{ color: "var(--ink-muted)" }} />
                <p style={{ fontWeight: 600 }}>No track playing yet</p>
                <p style={{ fontSize: "var(--text-caption)", color: "var(--ink-muted)" }}>
                  Pick any song to load line-synced karaoke lyrics automatically.
                </p>
              </div>
            ) : lyricsLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 6 }}>
                <div className="skeleton-box" style={{ height: 22, width: "86%" }} />
                <div className="skeleton-box" style={{ height: 22, width: "70%" }} />
                <div className="skeleton-box" style={{ height: 22, width: "92%" }} />
                <div className="skeleton-box" style={{ height: 22, width: "64%" }} />
              </div>
            ) : lyrics?.found && lyrics.synced ? (
              <div style={{ position: "relative", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 6, padding: "0 4px 8px" }}>
                  <span style={{ fontSize: "var(--text-caption)", color: "var(--ink-muted)" }}>
                    Synced via {lyrics.source === "ytmusic" ? "YTMusic" : "LRCLIB"}
                  </span>

                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {/* Sync Offset Control */}
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
                      }}
                      title="Lyrics timing sync offset"
                    >
                      <button
                        type="button"
                        onClick={() => shiftLyricsOffset(-100)}
                        aria-label="Delay lyrics by 100ms"
                        style={{ padding: "2px 4px", display: "inline-flex" }}
                      >
                        <Minus size={11} weight="bold" />
                      </button>
                      <span style={{ minWidth: 42, textAlign: "center" }}>
                        {settings.lyricsOffsetMs > 0 ? `+${settings.lyricsOffsetMs}` : settings.lyricsOffsetMs}ms
                      </span>
                      <button
                        type="button"
                        onClick={() => shiftLyricsOffset(100)}
                        aria-label="Advance lyrics by 100ms"
                        style={{ padding: "2px 4px", display: "inline-flex" }}
                      >
                        <Plus size={11} weight="bold" />
                      </button>
                    </div>

                    <button
                      type="button"
                      className="icon-btn"
                      style={{ width: 32, height: 32 }}
                      onClick={() => setShareOpen(true)}
                      aria-label="Create lyrics share card"
                      title="Share Lyrics Card"
                    >
                      <ImageSquare size={16} />
                    </button>

                    <button
                      type="button"
                      className="icon-btn"
                      style={{ width: 32, height: 32 }}
                      onClick={handleCopyLyrics}
                      aria-label="Copy all lyrics"
                      title="Copy lyrics"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>

                {/* Lyrics Lines with Rhythm Synchronization & Karaoke Sweep */}
                <div
                  ref={lyricsScrollContainerRef}
                  onScroll={handleLyricsScroll}
                  className="lyrics-lines-container"
                  style={{
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    padding: "4px 2px 24px",
                  }}
                >
                  {lyrics.lines.map((line, i) => {
                    const isCurrent = i === activeLyricIndex;
                    const distance = activeLyricIndex >= 0 ? Math.abs(i - activeLyricIndex) : 0;
                    const blurPx =
                      settings.lyricsProgressiveBlur && activeLyricIndex >= 0 && !isCurrent
                        ? Math.min(2.4, distance * 0.45)
                        : 0;
                    const opacity =
                      activeLyricIndex >= 0 && !isCurrent
                        ? Math.max(0.34, 1 - distance * 0.14)
                        : 1;

                    // Modern rhythm sweep percent calculation
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
                          fontSize: isCurrent
                            ? `${settings.lyricsFontSize + 3}px`
                            : `${settings.lyricsFontSize}px`,
                          textAlign: settings.lyricsAlign,
                          filter: blurPx > 0 ? `blur(${blurPx.toFixed(2)}px)` : undefined,
                          opacity,
                        }}
                        onClick={() => seekTo(Math.max(0, line.time - offsetSeconds))}
                      >
                        <div className="lyric-line-content">
                          {isCurrent && (
                            <div className="lyric-rhythm-badge" title="Rhythm Active">
                              <EqualizerBars paused={playbackState !== "playing"} />
                            </div>
                          )}
                          <div className="lyric-text-wrapper">
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
            ) : lyrics?.found && lyrics.plainText ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                  <span style={{ fontSize: "var(--text-caption)", color: "var(--ink-muted)" }}>
                    Plain lyrics ({lyrics.source === "ytmusic" ? "YTMusic" : "LRCLIB"})
                  </span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ minHeight: 32, padding: "0 10px", fontSize: "0.78rem" }}
                      onClick={() => setShareOpen(true)}
                    >
                      <ImageSquare size={15} /> Card
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ minHeight: 32, padding: "0 10px", fontSize: "0.78rem" }}
                      onClick={handleCopyLyrics}
                    >
                      <Copy size={15} /> Copy
                    </button>
                  </div>
                </div>
                <pre
                  style={{
                    margin: 0,
                    whiteSpace: "pre-wrap",
                    fontFamily: "var(--font-body)",
                    fontSize: `${Math.max(15, settings.lyricsFontSize - 2)}px`,
                    textAlign: settings.lyricsAlign,
                    lineHeight: 1.7,
                    color: "var(--ink-secondary)",
                  }}
                >
                  {lyrics.plainText}
                </pre>
              </div>
            ) : (
              <div className="state-panel" style={{ padding: "28px 16px" }}>
                <MicrophoneStage size={28} weight="duotone" style={{ color: "var(--ink-muted)" }} />
                <p style={{ fontWeight: 600 }}>Instrumental or lyrics unavailable</p>
                <p style={{ fontSize: "var(--text-caption)", color: "var(--ink-muted)" }}>
                  No synced lyrics entry found for "{currentTrack.title}".
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === "queue" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Search Input for Queue: Instant Filter + Catalog Search */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <MagnifyingGlass
                  size={14}
                  style={{
                    position: "absolute",
                    left: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--ink-muted)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  type="search"
                  className="field-input"
                  style={{ minHeight: 36, paddingLeft: 30, paddingRight: 28, fontSize: "0.82rem", borderRadius: "var(--radius-pill)" }}
                  value={queueFilter}
                  onChange={(e) => setQueueFilter(e.target.value)}
                  placeholder="Cari lagu untuk antrean / filter..."
                  aria-label="Cari dan filter lagu antrean"
                />
                {queueFilter && (
                  <button
                    type="button"
                    onClick={() => setQueueFilter("")}
                    style={{
                      position: "absolute",
                      right: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "transparent",
                      border: "none",
                      color: "var(--ink-muted)",
                      cursor: "pointer",
                      padding: 2,
                    }}
                    aria-label="Clear filter"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              <button
                type="button"
                className="icon-btn"
                style={{ width: 34, height: 34 }}
                onClick={shuffleUpNextQueue}
                title="Shuffle Up Next"
                aria-label="Shuffle upcoming queue"
                disabled={queue.length <= 2}
              >
                <Shuffle size={15} />
              </button>
              <button
                type="button"
                className="icon-btn"
                style={{ width: 34, height: 34 }}
                onClick={clearUpNextQueue}
                title="Clear Up Next"
                aria-label="Clear upcoming queue"
                disabled={queue.length <= 1}
              >
                <Trash size={15} />
              </button>
            </div>

            {/* If searching: Show Catalog Results to Add Next / Add to Queue */}
            {queueFilter.trim().length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {/* 1. Matches from existing queue */}
                {filteredQueueEntries.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Dalam Antrean Saat Ini ({filteredQueueEntries.length})
                    </span>
                    {filteredQueueEntries.map(({ item, idx }) => {
                      const isCurrent = idx === queueIndex;
                      return (
                        <div
                          key={`match-${item.id}-${idx}`}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "36px minmax(0, 1fr) auto",
                            alignItems: "center",
                            gap: 8,
                            padding: "6px 8px",
                            borderRadius: "var(--radius-sm)",
                            background: isCurrent ? "var(--surface-active)" : "var(--surface-raised)",
                          }}
                        >
                          <Artwork src={item.artwork} alt="" className="track-thumb-img" size={72} />
                          <div style={{ minWidth: 0 }}>
                            <div className="track-title" style={{ fontSize: "0.82rem", color: isCurrent ? "var(--accent)" : "var(--ink)" }}>{item.title}</div>
                            <div className="track-artist" style={{ fontSize: "0.72rem" }}>{item.artist}</div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ height: 28, fontSize: "0.72rem", padding: "0 8px" }}
                            onClick={() => void playTrack(item, queue, idx)}
                          >
                            Putar
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 2. Online Catalog Search Results to Add Next / Queue */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Katalog Musik (Pilih untuk Lanjutkan)
                    </span>
                    {catalogSearching && (
                      <CircleNotch size={14} weight="bold" style={{ animation: "spin 0.8s linear infinite", color: "var(--accent)" }} />
                    )}
                  </div>

                  {catalogResults.length === 0 && !catalogSearching ? (
                    <p style={{ fontSize: "0.78rem", color: "var(--ink-muted)", margin: "4px 0" }}>
                      Ketik judul lagu atau artis untuk mencari musik dan menambahkannya ke antrean.
                    </p>
                  ) : (
                    catalogResults.map((item) => (
                      <div
                        key={`cat-${item.id}`}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "38px minmax(0, 1fr) auto",
                          alignItems: "center",
                          gap: 8,
                          padding: "6px 8px",
                          borderRadius: "var(--radius-sm)",
                          background: "var(--surface)",
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        <Artwork src={item.artwork} alt="" className="track-thumb-img" size={76} />
                        <div style={{ minWidth: 0 }}>
                          <div className="track-title" style={{ fontSize: "0.82rem" }}>{item.title}</div>
                          <div className="track-artist" style={{ fontSize: "0.72rem" }}>{item.artist}</div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ height: 28, fontSize: "0.72rem", padding: "0 8px", gap: 3 }}
                            onClick={() => addToQueue(item, true)}
                            title="Mainkan lagu ini tepat setelah lagu aktif"
                          >
                            <ArrowRight size={12} weight="bold" />
                            <span>Berikutnya</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ height: 28, fontSize: "0.72rem", padding: "0 8px", gap: 3 }}
                            onClick={() => addToQueue(item, false)}
                            title="Tambahkan ke akhir antrean"
                          >
                            <ListPlus size={13} />
                            <span>Antrean</span>
                          </button>
                          <button
                            type="button"
                            className="icon-btn"
                            style={{ width: 28, height: 28 }}
                            onClick={() => void playTrack(item)}
                            title="Putar sekarang"
                          >
                            <Play size={12} weight="fill" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* When not searching: Normal Queue list + Smart Next Candidates */}
            {!queueFilter.trim() && (
              <>
                {queue.length === 0 ? (
                  <div className="state-panel" style={{ padding: "28px 16px" }}>
                    <Queue size={28} weight="duotone" style={{ color: "var(--ink-muted)" }} />
                    <p style={{ fontWeight: 600 }}>Queue is empty</p>
                    <p style={{ fontSize: "var(--text-caption)", color: "var(--ink-muted)" }}>
                      Playing any track builds a continuous Up Next radio queue automatically.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>
                      Antrean Berjalan ({queue.length})
                    </span>
                    {filteredQueueEntries.map(({ item, idx }) => {
                      const isCurrent = idx === queueIndex;
                      return (
                        <div
                          key={`${item.id}-${idx}`}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "38px minmax(0, 1fr) auto",
                            alignItems: "center",
                            gap: 10,
                            padding: "7px 8px",
                            borderRadius: "var(--radius-sm)",
                            background: isCurrent ? "var(--surface-active)" : "transparent",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => void playTrack(item, queue, idx)}
                            style={{ position: "relative", width: 38, height: 38, borderRadius: 8, overflow: "hidden" }}
                            aria-label={`Play ${item.title}`}
                          >
                            <Artwork src={item.artwork} alt="" className="track-thumb-img" size={76} />
                          </button>

                          <button
                            type="button"
                            onClick={() => void playTrack(item, queue, idx)}
                            style={{ minWidth: 0, textAlign: "left" }}
                          >
                            <div
                              className="track-title"
                              style={{ fontSize: "0.86rem", color: isCurrent ? "var(--accent)" : "var(--ink)" }}
                            >
                              {item.title}
                            </div>
                            <div className="track-artist" style={{ fontSize: "0.76rem" }}>
                              {item.artist}
                            </div>
                          </button>

                          {isCurrent ? (
                            <EqualizerBars paused={playbackState !== "playing"} />
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                              <button
                                type="button"
                                className="icon-btn"
                                style={{ width: 28, height: 28 }}
                                disabled={idx === 0}
                                onClick={() => moveQueueItem(idx, idx - 1)}
                                aria-label="Move track up"
                              >
                                <ArrowUp size={13} />
                              </button>
                              <button
                                type="button"
                                className="icon-btn"
                                style={{ width: 28, height: 28 }}
                                disabled={idx === queue.length - 1}
                                onClick={() => moveQueueItem(idx, idx + 1)}
                                aria-label="Move track down"
                              >
                                <ArrowDown size={13} />
                              </button>
                              <button
                                type="button"
                                className="icon-btn"
                                style={{ width: 28, height: 28 }}
                                onClick={() => removeFromQueue(idx)}
                                aria-label="Remove track from queue"
                              >
                                <Trash size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Candidate Tracks (Pilihan Musik Sebagai Kandidat Selanjutnya) */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-subtle)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Sparkle size={16} weight="fill" style={{ color: "var(--accent)" }} />
                      <span style={{ fontWeight: 700, fontSize: "0.86rem", color: "var(--ink)" }}>
                        Kandidat Selanjutnya
                      </span>
                    </div>
                    {candidateLoading && (
                      <CircleNotch size={14} weight="bold" style={{ animation: "spin 0.8s linear infinite", color: "var(--accent)" }} />
                    )}
                  </div>
                  <p style={{ fontSize: "0.74rem", color: "var(--ink-muted)", margin: 0 }}>
                    Rekomendasi musik pilihan yang selaras dengan lagu saat ini:
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {candidateTracks.map((cand) => (
                      <div
                        key={`candidate-${cand.id}`}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "36px minmax(0, 1fr) auto",
                          alignItems: "center",
                          gap: 8,
                          padding: "6px 8px",
                          borderRadius: "var(--radius-sm)",
                          background: "var(--surface)",
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        <Artwork src={cand.artwork} alt="" className="track-thumb-img" size={72} />
                        <div style={{ minWidth: 0 }}>
                          <div className="track-title" style={{ fontSize: "0.82rem" }}>{cand.title}</div>
                          <div className="track-artist" style={{ fontSize: "0.72rem" }}>{cand.artist}</div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ height: 28, fontSize: "0.72rem", padding: "0 8px", gap: 3 }}
                            onClick={() => addToQueue(cand, true)}
                            title="Jadikan musik pemutar berikutnya"
                          >
                            <ArrowRight size={12} weight="bold" />
                            <span>+ Berikutnya</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ height: 28, fontSize: "0.72rem", padding: "0 8px" }}
                            onClick={() => addToQueue(cand, false)}
                            title="Tambahkan ke antrean"
                          >
                            + Antrean
                          </button>
                          <button
                            type="button"
                            className="icon-btn"
                            style={{ width: 28, height: 28 }}
                            onClick={() => void playTrack(cand)}
                            title="Putar langsung sekarang"
                          >
                            <Play size={12} weight="fill" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "studio" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: "0.9rem" }}>
                <Palette size={17} style={{ color: "var(--accent)" }} />
                <span>Live Extracted Cover Palette</span>
              </div>
              <p style={{ fontSize: "var(--text-caption)", color: "var(--ink-muted)" }}>
                Canvas quantization extracts the active artwork hue and clamps contrast to WCAG AA across both Light Paper and Adaptive Dark modes.
              </p>
              <div className="swatch-row">
                <div className="swatch-chip">
                  <div className="swatch-color" style={{ background: palette.swatches.vibrant }} />
                  <span className="swatch-label">Accent</span>
                </div>
                <div className="swatch-chip">
                  <div className="swatch-color" style={{ background: palette.swatches.light }} />
                  <span className="swatch-label">Tint</span>
                </div>
                <div className="swatch-chip">
                  <div className="swatch-color" style={{ background: palette.swatches.dominant }} />
                  <span className="swatch-label">Mid</span>
                </div>
                <div className="swatch-chip">
                  <div className="swatch-color" style={{ background: palette.swatches.dark }} />
                  <span className="swatch-label">Dock</span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Surface Mode</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button
                  type="button"
                  className={resolvedTheme === "light" ? "btn btn-primary" : "btn btn-secondary"}
                  onClick={() => setThemePref("light")}
                >
                  <Sun size={16} weight="fill" /> Light
                </button>
                <button
                  type="button"
                  className={resolvedTheme === "dark" ? "btn btn-primary" : "btn btn-secondary"}
                  onClick={() => setThemePref("dark")}
                >
                  <Moon size={16} weight="fill" /> Dark
                </button>
              </div>
              {resolvedTheme === "dark" && (
                <button
                  type="button"
                  className={settings.pureBlack ? "btn btn-accent" : "btn btn-secondary"}
                  onClick={() => updateSettings({ pureBlack: !settings.pureBlack })}
                >
                  Pure Black AMOLED: {settings.pureBlack ? "On" : "Off"}
                </button>
              )}
              <button
                type="button"
                className={dynamicColor ? "btn btn-accent" : "btn btn-secondary"}
                onClick={() => setDynamicColor(!dynamicColor)}
              >
                <Palette size={16} weight="fill" />
                {dynamicColor ? "Dynamic Cover Chroma: On" : "Dynamic Cover Chroma: Off"}
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: "0.9rem" }}>
                  <Timer size={17} /> Sleep Timer
                </span>
                {sleepTimerSec !== null ? (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-caption)", color: "var(--accent)" }}>
                    {formatTime(sleepTimerSec)}
                  </span>
                ) : sleepTimerEndOfTrack ? (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-caption)", color: "var(--accent)" }}>
                    End of track
                  </span>
                ) : null}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                {[15, 30, 45, 60].map((m) => (
                  <button
                    key={m}
                    type="button"
                    className="btn btn-secondary"
                    style={{ minHeight: 38, padding: 0, fontSize: "0.82rem" }}
                    onClick={() => setSleepTimerMinutes(m)}
                  >
                    {m}m
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={sleepTimerEndOfTrack ? "btn btn-accent" : "btn btn-secondary"}
                style={{ minHeight: 38, fontSize: "0.82rem" }}
                onClick={() => setSleepTimerEndOfTrack(!sleepTimerEndOfTrack)}
              >
                End of Current Track
              </button>
              {(sleepTimerSec !== null || sleepTimerEndOfTrack) && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ minHeight: 36 }}
                  onClick={() => {
                    setSleepTimerMinutes(null);
                    setSleepTimerEndOfTrack(false);
                  }}
                >
                  Cancel sleep timer
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {currentTrack && (
        <LyricsShareModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          track={currentTrack}
          lines={lyricLinesForShare}
          initialIndex={Math.max(0, activeLyricIndex)}
        />
      )}
    </>
  );

  if (embedded) {
    return <aside className="studio-embedded-panel">{inner}</aside>;
  }

  return <aside className="studio-drawer">{inner}</aside>;
}
