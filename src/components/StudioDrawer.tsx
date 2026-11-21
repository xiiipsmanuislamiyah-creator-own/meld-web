import { useEffect, useRef } from "react";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  MicrophoneStage,
  Moon,
  Palette,
  Queue,
  Sun,
  Timer,
  Trash,
  X,
} from "@phosphor-icons/react";
import { usePlayer, type DrawerTab } from "../context/PlayerContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { Artwork } from "./Artwork";
import { EqualizerBars } from "./EqualizerBars";
import { formatTime } from "../lib/waveform";

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
    drawerTab,
    setDrawerTab,
    setDrawerOpen,
    playTrack,
    seekTo,
    removeFromQueue,
    moveQueueItem,
    setSleepTimerMinutes,
  } = usePlayer();

  const { resolvedTheme, setThemePref, dynamicColor, setDynamicColor, palette } = useTheme();
  const { notify } = useToast();

  const activeTab = activeTabOverride ?? drawerTab;
  const setTab = onTabChangeOverride ?? setDrawerTab;

  const activeLyricRef = useRef<HTMLButtonElement | null>(null);

  const activeLyricIndex =
    lyrics?.synced && lyrics.lines.length > 0
      ? lyrics.lines.reduce((acc, line, idx) => (line.time <= currentTime + 0.35 ? idx : acc), -1)
      : -1;

  useEffect(() => {
    if (activeTab === "lyrics" && activeLyricRef.current) {
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      activeLyricRef.current.scrollIntoView({
        block: "center",
        behavior: prefersReduced ? "auto" : "smooth",
      });
    }
  }, [activeLyricIndex, activeTab]);

  const handleCopyLyrics = () => {
    const text = lyrics?.plainText || lyrics?.lines.map((l) => l.text).join("\n");
    if (!text) return;
    navigator.clipboard?.writeText(text).then(() => {
      notify("Lyrics copied to clipboard", "success");
    });
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
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 6px 4px" }}>
                  <span style={{ fontSize: "var(--text-caption)", color: "var(--ink-muted)" }}>
                    Synced via LRCLIB — tap any line to seek
                  </span>
                  <button
                    type="button"
                    className="icon-btn"
                    style={{ width: 34, height: 34 }}
                    onClick={handleCopyLyrics}
                    aria-label="Copy all lyrics"
                    title="Copy lyrics"
                  >
                    <Copy size={16} />
                  </button>
                </div>
                {lyrics.lines.map((line, i) => {
                  const isCurrent = i === activeLyricIndex;
                  return (
                    <button
                      key={`${line.time}-${i}`}
                      ref={isCurrent ? activeLyricRef : null}
                      type="button"
                      className={`lyric-line${isCurrent ? " is-current" : ""}`}
                      onClick={() => seekTo(line.time)}
                    >
                      {line.text}
                    </button>
                  );
                })}
              </>
            ) : lyrics?.found && lyrics.plainText ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "var(--text-caption)", color: "var(--ink-muted)" }}>
                    Plain lyrics
                  </span>
                  <button type="button" className="btn btn-ghost" style={{ minHeight: 34 }} onClick={handleCopyLyrics}>
                    <Copy size={15} /> Copy
                  </button>
                </div>
                <pre
                  style={{
                    margin: 0,
                    whiteSpace: "pre-wrap",
                    fontFamily: "var(--font-body)",
                    fontSize: "0.94rem",
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
                {queue.map((item, idx) => {
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
          </>
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
                {sleepTimerSec !== null && (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-caption)", color: "var(--accent)" }}>
                    {formatTime(sleepTimerSec)}
                  </span>
                )}
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
              {sleepTimerSec !== null && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ minHeight: 36 }}
                  onClick={() => setSleepTimerMinutes(null)}
                >
                  Cancel sleep timer
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );

  if (embedded) {
    return <div className="np-side-panel">{inner}</div>;
  }

  return <aside className="studio-drawer" aria-label="Studio lyrics and queue panel">{inner}</aside>;
}
