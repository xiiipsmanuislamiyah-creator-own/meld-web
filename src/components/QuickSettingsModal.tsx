import { useEffect, useState } from "react";
import {
  ArrowCounterClockwise,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CircleNotch,
  Equalizer,
  Gauge,
  Info,
  LinkSimple,
  MagnifyingGlass,
  Minus,
  Moon,
  MusicNotes,
  Palette,
  PictureInPicture,
  Play,
  Plus,
  Queue,
  Shuffle,
  SlidersHorizontal,
  Sparkle,
  SpeakerHigh,
  SpeakerSlash,
  Sun,
  Timer,
  Trash,
  X,
} from "@phosphor-icons/react";
import { usePlayer } from "../context/PlayerContext";
import { useTheme } from "../context/ThemeContext";
import { useSettings } from "../context/SettingsContext";
import { Artwork } from "./Artwork";
import { EqualizerBars } from "./EqualizerBars";
import { AudioEqualizerPanel } from "./AudioEqualizerPanel";
import { DeveloperProfileCard } from "./DeveloperProfileCard";
import { OfficialNativeAppCard } from "./OfficialNativeAppCard";
import { formatTime } from "../lib/waveform";
import { fetchUpNextRadio, searchCatalog } from "../lib/api";
import { semitonesToRatio } from "../lib/audioDsp";
import type { Track } from "../types/music";

type QuickSettingsTab = "controls" | "eq" | "queue" | "info";

interface QuickSettingsModalProps {
  open: boolean;
  onClose: () => void;
  initialTab?: QuickSettingsTab;
  onOpenFullSettings?: () => void;
}

const SPEED_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const TIMER_PRESETS = [15, 30, 45, 60];

export function QuickSettingsModal({
  open,
  onClose,
  initialTab = "controls",
  onOpenFullSettings,
}: QuickSettingsModalProps) {
  const {
    currentTrack,
    playbackState,
    volume,
    muted,
    playbackRate,
    pitchSemitones,
    pitchSpeedLinked,
    effectivePlaybackRate,
    eq,
    sleepTimerSec,
    sleepTimerEndOfTrack,
    pipMode,
    queue,
    queueIndex,
    setVolume,
    toggleMute,
    setPlaybackRate,
    setPitchSemitones,
    setPitchSpeedLinked,
    resetSpeedPitch,
    setSleepTimerMinutes,
    setSleepTimerEndOfTrack,
    togglePictureInPicture,
    playTrack,
    addToQueue,
    removeFromQueue,
    moveQueueItem,
    shuffleUpNextQueue,
    clearUpNextQueue,
  } = usePlayer();

  const { palette, resolvedTheme, setThemePref, dynamicColor, setDynamicColor } = useTheme();
  const { settings, updateSettings } = useSettings();

  const [activeTab, setActiveTab] = useState<QuickSettingsTab>(initialTab);
  const [queueSearchQuery, setQueueSearchQuery] = useState("");
  const [catalogResults, setCatalogResults] = useState<Track[]>([]);
  const [catalogSearching, setCatalogSearching] = useState(false);
  const [candidateTracks, setCandidateTracks] = useState<Track[]>([]);
  const [candidateLoading, setCandidateLoading] = useState(false);

  useEffect(() => {
    if (open && initialTab) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Online catalog search in queue tab (with cancellation guard)
  useEffect(() => {
    const q = queueSearchQuery.trim();
    if (!open || activeTab !== "queue" || q.length < 1) {
      setCatalogResults([]);
      setCatalogSearching(false);
      return;
    }

    let cancelled = false;
    setCatalogSearching(true);
    const timer = window.setTimeout(() => {
      searchCatalog(q, "songs")
        .then((res) => {
          if (!cancelled) setCatalogResults(res.tracks.slice(0, 8));
        })
        .catch(() => {
          if (!cancelled) setCatalogResults([]);
        })
        .finally(() => {
          if (!cancelled) setCatalogSearching(false);
        });
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [queueSearchQuery, activeTab, open]);

  // Candidate tracks fetch when viewing queue tab
  useEffect(() => {
    if (!open || activeTab !== "queue" || !currentTrack) return;
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
  }, [open, activeTab, currentTrack?.id, currentTrack?.videoId, currentTrack?.artist, currentTrack?.title, queue.length]);

  if (!open) return null;

  const hasTimer = sleepTimerSec !== null || sleepTimerEndOfTrack;
  const pitchPct = Math.round(semitonesToRatio(pitchSemitones) * 100);

  return (
    <div
      className="modal-overlay"
      style={{ padding: 14 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Pengaturan Playback, EQ, Antrean dan Info"
    >
      <div
        className="quick-settings-panel"
        style={{
          width: "min(520px, 100%)",
          maxHeight: "90svh",
          overflow: "hidden",
          background: "var(--surface)",
          color: "var(--ink)",
          borderRadius: "var(--radius-xl)",
          border: "1px solid var(--border-control)",
          boxShadow: "var(--shadow-modal)",
          display: "flex",
          flexDirection: "column",
          padding: 0,
          animation: "modalPop 0.22s var(--ease-out-snappy)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px 12px",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <SlidersHorizontal size={20} weight="bold" style={{ color: "var(--accent)" }} />
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.05rem" }}>
              Pengaturan &amp; Kontrol
            </span>
          </div>
          <button
            type="button"
            className="icon-btn"
            style={{ width: 34, height: 34 }}
            onClick={onClose}
            aria-label="Tutup pengaturan"
          >
            <X size={18} />
          </button>
        </div>

        {/* 4-Tab Unified Switcher: Kontrol | EQ & Nada | Antrean | Info */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 4,
            padding: "8px 12px",
            background: "var(--surface-raised)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "controls"}
            className={`drawer-tab${activeTab === "controls" ? " is-active" : ""}`}
            onClick={() => setActiveTab("controls")}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, fontSize: "0.78rem", minHeight: 36, padding: "0 6px" }}
          >
            <SlidersHorizontal size={14} weight="bold" />
            <span>Kontrol</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "eq"}
            className={`drawer-tab${activeTab === "eq" ? " is-active" : ""}`}
            onClick={() => setActiveTab("eq")}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, fontSize: "0.78rem", minHeight: 36, padding: "0 6px" }}
          >
            <Equalizer size={14} weight="bold" />
            <span>{eq.enabled ? "EQ · On" : "EQ"}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "queue"}
            className={`drawer-tab${activeTab === "queue" ? " is-active" : ""}`}
            onClick={() => setActiveTab("queue")}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, fontSize: "0.78rem", minHeight: 36, padding: "0 6px" }}
          >
            <Queue size={14} weight="bold" />
            <span>Antrean</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "info"}
            className={`drawer-tab${activeTab === "info" ? " is-active" : ""}`}
            onClick={() => setActiveTab("info")}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, fontSize: "0.78rem", minHeight: 36, padding: "0 6px" }}
          >
            <Info size={14} weight="bold" />
            <span>Info</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* TAB 1: KONTROL */}
          {activeTab === "controls" && (
            <div className="view-enter" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* 1. Kecepatan & Nada Stepper Terpadu */}
              <section className="stepper-card">
                <div className="stepper-card-head">
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <Gauge size={17} weight="bold" style={{ color: "var(--accent)" }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>Kecepatan &amp; Nada</div>
                      <div style={{ fontSize: "0.73rem", color: "var(--ink-muted)" }}>
                        Output aktif: {effectivePlaybackRate.toFixed(2)}x
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ minHeight: 30, padding: "0 8px", fontSize: "0.74rem" }}
                    onClick={resetSpeedPitch}
                    disabled={playbackRate === 1 && pitchSemitones === 0}
                  >
                    <ArrowCounterClockwise size={13} weight="bold" /> Reset
                  </button>
                </div>

                {/* Speed row */}
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: 4 }}>
                    <span style={{ color: "var(--ink-secondary)", fontWeight: 600 }}>Kecepatan (Tempo)</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--accent)" }}>
                      {playbackRate.toFixed(2)}x
                    </span>
                  </div>
                  <div className="stepper-controls-row">
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => setPlaybackRate(playbackRate - 0.1)}
                      disabled={playbackRate <= 0.25}
                      aria-label="Perlambat suara"
                    >
                      <Minus size={15} weight="bold" />
                    </button>
                    <input
                      type="range"
                      min={0.25}
                      max={2.0}
                      step={0.05}
                      value={playbackRate}
                      onChange={(e) => setPlaybackRate(Number(e.target.value))}
                      aria-label="Kecepatan audio"
                      className="stepper-range"
                    />
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => setPlaybackRate(playbackRate + 0.1)}
                      disabled={playbackRate >= 2.0}
                      aria-label="Percepat suara"
                    >
                      <Plus size={15} weight="bold" />
                    </button>
                  </div>
                </div>

                {/* Pitch row */}
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: 4 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--ink-secondary)", fontWeight: 600 }}>
                      <MusicNotes size={13} style={{ color: "var(--accent)" }} />
                      Nada (Pitch)
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--accent)" }}>
                      {pitchSemitones > 0 ? `+${pitchSemitones}` : pitchSemitones} st ({pitchPct}%)
                    </span>
                  </div>
                  <div className="stepper-controls-row">
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => setPitchSemitones(pitchSemitones - 1)}
                      disabled={pitchSemitones <= -12}
                      aria-label="Turunkan nada"
                    >
                      <Minus size={15} weight="bold" />
                    </button>
                    <input
                      type="range"
                      min={-12}
                      max={12}
                      step={0.5}
                      value={pitchSemitones}
                      onChange={(e) => setPitchSemitones(Number(e.target.value))}
                      aria-label="Nada audio"
                      className="stepper-range"
                    />
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => setPitchSemitones(pitchSemitones + 1)}
                      disabled={pitchSemitones >= 12}
                      aria-label="Naikkan nada"
                    >
                      <Plus size={15} weight="bold" />
                    </button>
                  </div>
                </div>

                {/* Preset Speed Chips */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                  {SPEED_PRESETS.map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      className={`chip${Math.abs(playbackRate - rate) < 0.02 ? " is-active" : ""}`}
                      onClick={() => setPlaybackRate(rate)}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>

                {/* Pitch-Tempo Link */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border-subtle)" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.78rem", fontWeight: 600, color: "var(--ink-secondary)" }}>
                    <LinkSimple size={14} style={{ color: "var(--accent)" }} />
                    Tautkan Nada &amp; Tempo (Slowed / Nightcore)
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={pitchSpeedLinked}
                    className={`toggle-pill${pitchSpeedLinked ? " is-on" : ""}`}
                    onClick={() => setPitchSpeedLinked(!pitchSpeedLinked)}
                  >
                    <span className="toggle-thumb" />
                  </button>
                </div>
              </section>

              {/* 2. Picture-in-Picture (PiP) */}
              <section className="settings-group" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <PictureInPicture size={19} style={{ color: "var(--accent)" }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>Picture-in-Picture (PiP)</div>
                      <div style={{ fontSize: "0.74rem", color: "var(--ink-muted)" }}>
                        Pemutar melayang di luar jendela
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`btn${pipMode !== "off" ? " btn-primary" : " btn-secondary"}`}
                    style={{ minHeight: 34, padding: "0 12px", fontSize: "0.78rem" }}
                    onClick={() => void togglePictureInPicture()}
                  >
                    {pipMode !== "off" ? "PiP Aktif" : "Buka PiP"}
                  </button>
                </div>
              </section>

              {/* 3. Sleep Timer */}
              <section className="settings-group">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Timer size={19} style={{ color: "var(--accent)" }} />
                    <span style={{ fontWeight: 700, fontSize: "0.88rem" }}>Pengatur Waktu Tidur</span>
                  </div>
                  {sleepTimerSec !== null ? (
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", color: "var(--accent)", fontWeight: 700 }}>
                      {formatTime(sleepTimerSec)}
                    </span>
                  ) : sleepTimerEndOfTrack ? (
                    <span style={{ fontSize: "0.75rem", color: "var(--accent)", fontWeight: 700 }}>
                      Selesai Lagu Ini
                    </span>
                  ) : (
                    <span style={{ fontSize: "0.75rem", color: "var(--ink-muted)" }}>Mati</span>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                  {TIMER_PRESETS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`btn${sleepTimerSec === m * 60 ? " btn-primary" : " btn-secondary"}`}
                      style={{ minHeight: 36, padding: 0, fontSize: "0.8rem" }}
                      onClick={() => setSleepTimerMinutes(m)}
                    >
                      {m}m
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button
                    type="button"
                    className={`btn${sleepTimerEndOfTrack ? " btn-primary" : " btn-secondary"}`}
                    style={{ flex: 1, minHeight: 36, fontSize: "0.78rem" }}
                    onClick={() => setSleepTimerEndOfTrack(!sleepTimerEndOfTrack)}
                  >
                    Hingga Akhir Lagu Ini
                  </button>
                  {hasTimer && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ minHeight: 36, fontSize: "0.78rem" }}
                      onClick={() => {
                        setSleepTimerMinutes(null);
                        setSleepTimerEndOfTrack(false);
                      }}
                    >
                      Batal
                    </button>
                  )}
                </div>
              </section>

              {/* 4. Tema & Live Cover Palette */}
              <section className="settings-group">
                <div style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: 8 }}>
                  Tema Tampilan &amp; Palet Cover Aktif
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  <button
                    type="button"
                    className={`btn${resolvedTheme === "light" ? " btn-primary" : " btn-secondary"}`}
                    style={{ minHeight: 38, justifyContent: "center", gap: 6, fontSize: "0.8rem" }}
                    onClick={() => {
                      setThemePref("light");
                      updateSettings({ pureBlack: false });
                    }}
                  >
                    <Sun size={15} weight="fill" /> Light
                  </button>
                  <button
                    type="button"
                    className={`btn${resolvedTheme === "dark" && !settings.pureBlack ? " btn-primary" : " btn-secondary"}`}
                    style={{ minHeight: 38, justifyContent: "center", gap: 6, fontSize: "0.8rem" }}
                    onClick={() => {
                      setThemePref("dark");
                      updateSettings({ pureBlack: false });
                    }}
                  >
                    <Moon size={15} weight="fill" /> Dark
                  </button>
                  <button
                    type="button"
                    className={`btn${resolvedTheme === "dark" && settings.pureBlack ? " btn-primary" : " btn-secondary"}`}
                    style={{ minHeight: 38, justifyContent: "center", gap: 6, fontSize: "0.8rem" }}
                    onClick={() => {
                      setThemePref("dark");
                      updateSettings({ pureBlack: true });
                    }}
                  >
                    <span style={{ fontSize: "0.76rem", fontWeight: 700 }}>OLED</span>
                  </button>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Palette size={17} style={{ color: "var(--accent)" }} />
                    <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>Warna Cover Dinamis (Chroma)</span>
                  </div>
                  <button
                    type="button"
                    className={`chip${dynamicColor ? " is-active" : ""}`}
                    onClick={() => setDynamicColor(!dynamicColor)}
                  >
                    {dynamicColor ? "Aktif" : "Nonaktif"}
                  </button>
                </div>

                <div className="swatch-row" style={{ marginTop: 10 }}>
                  <div className="swatch-chip">
                    <div className="swatch-color" style={{ background: palette.swatches.vibrant, height: 24 }} />
                    <span className="swatch-label">Aksen</span>
                  </div>
                  <div className="swatch-chip">
                    <div className="swatch-color" style={{ background: palette.swatches.light, height: 24 }} />
                    <span className="swatch-label">Tint</span>
                  </div>
                  <div className="swatch-chip">
                    <div className="swatch-color" style={{ background: palette.swatches.dominant, height: 24 }} />
                    <span className="swatch-label">Mid</span>
                  </div>
                  <div className="swatch-chip">
                    <div className="swatch-color" style={{ background: palette.swatches.dark, height: 24 }} />
                    <span className="swatch-label">Dock</span>
                  </div>
                </div>
              </section>

              {/* Rekomendasi APK Native Resmi untuk Background Play */}
              <OfficialNativeAppCard variant="compact" />
            </div>
          )}

          {/* TAB 2: EQUALIZER & DSP */}
          {activeTab === "eq" && (
            <div className="view-enter">
              <AudioEqualizerPanel />
            </div>
          )}

          {/* TAB 3: ANTREAN LAGU (QUEUE) */}
          {activeTab === "queue" && (
            <div className="view-enter" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--ink-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Cari Lagu Untuk Antrean
                </span>
                <div style={{ position: "relative" }}>
                  <MagnifyingGlass size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ink-muted)" }} />
                  <input
                    type="search"
                    className="field-input"
                    style={{ minHeight: 38, paddingLeft: 34, paddingRight: 30, fontSize: "0.84rem", borderRadius: "var(--radius-pill)" }}
                    value={queueSearchQuery}
                    onChange={(e) => setQueueSearchQuery(e.target.value)}
                    placeholder="Ketik lagu atau artis untuk ditambahkan..."
                  />
                  {queueSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setQueueSearchQuery("")}
                      style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--ink-muted)", cursor: "pointer" }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {queueSearchQuery.trim() && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "0.72rem", color: "var(--accent)", fontWeight: 700 }}>Hasil Katalog Online:</span>
                      {catalogSearching && <CircleNotch size={14} weight="bold" style={{ animation: "spin 0.8s linear infinite", color: "var(--accent)" }} />}
                    </div>

                    {catalogResults.map((item) => (
                      <div
                        key={`cat-res-${item.id}`}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "36px minmax(0, 1fr) auto",
                          alignItems: "center",
                          gap: 8,
                          padding: "6px 8px",
                          borderRadius: "var(--radius-sm)",
                          background: "var(--surface-raised)",
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        <Artwork src={item.artwork} alt="" className="track-thumb-img" size={72} />
                        <div style={{ minWidth: 0 }}>
                          <div className="track-title" style={{ fontSize: "0.82rem" }}>{item.title}</div>
                          <div className="track-artist" style={{ fontSize: "0.72rem" }}>{item.artist}</div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ height: 28, minHeight: 28, fontSize: "0.72rem", padding: "0 8px", gap: 3 }}
                            onClick={() => addToQueue(item, true)}
                            title="Mainkan tepat setelah lagu ini"
                          >
                            <ArrowRight size={12} weight="bold" />
                            <span>Berikutnya</span>
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
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--ink-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Daftar Antrean ({queue.length})
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <button
                      type="button"
                      className="icon-btn"
                      style={{ width: 28, height: 28 }}
                      onClick={shuffleUpNextQueue}
                      title="Acak sisa antrean"
                      disabled={queue.length <= 2}
                    >
                      <Shuffle size={14} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      style={{ width: 28, height: 28 }}
                      onClick={clearUpNextQueue}
                      title="Bersihkan sisa antrean"
                      disabled={queue.length <= 1}
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                </div>

                {queue.length === 0 ? (
                  <p style={{ fontSize: "0.82rem", color: "var(--ink-muted)", margin: "8px 0" }}>Antrean kosong.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {queue.map((item, idx) => {
                      const isCurrent = idx === queueIndex;
                      return (
                        <div
                          key={`q-${item.id}-${idx}`}
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

                          {isCurrent ? (
                            <EqualizerBars paused={playbackState !== "playing"} />
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                              <button
                                type="button"
                                className="icon-btn"
                                style={{ width: 26, height: 26 }}
                                disabled={idx === 0}
                                onClick={() => moveQueueItem(idx, idx - 1)}
                                title="Pindah ke atas"
                              >
                                <ArrowUp size={12} />
                              </button>
                              <button
                                type="button"
                                className="icon-btn"
                                style={{ width: 26, height: 26 }}
                                disabled={idx === queue.length - 1}
                                onClick={() => moveQueueItem(idx, idx + 1)}
                                title="Pindah ke bawah"
                              >
                                <ArrowDown size={12} />
                              </button>
                              <button
                                type="button"
                                className="icon-btn"
                                style={{ width: 26, height: 26 }}
                                onClick={() => removeFromQueue(idx)}
                                title="Hapus dari antrean"
                              >
                                <Trash size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 10, borderTop: "1px solid var(--border-subtle)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Sparkle size={16} weight="fill" style={{ color: "var(--accent)" }} />
                    <span style={{ fontWeight: 700, fontSize: "0.86rem" }}>Kandidat Selanjutnya</span>
                  </div>
                  {candidateLoading && <CircleNotch size={14} weight="bold" style={{ animation: "spin 0.8s linear infinite", color: "var(--accent)" }} />}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {candidateTracks.map((cand) => (
                    <div
                      key={`cand-${cand.id}`}
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
                          style={{ height: 28, minHeight: 28, fontSize: "0.72rem", padding: "0 8px", gap: 3 }}
                          onClick={() => addToQueue(cand, true)}
                        >
                          <ArrowRight size={12} weight="bold" />
                          <span>+ Next</span>
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          style={{ width: 28, height: 28 }}
                          onClick={() => void playTrack(cand)}
                        >
                          <Play size={12} weight="fill" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: INFO & PROFIL PENGEMBANG (RHMT OFC) */}
          {activeTab === "info" && (
            <div className="view-enter" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <OfficialNativeAppCard variant="compact" />
              <DeveloperProfileCard
                compact
                onOpenFullSettings={
                  onOpenFullSettings
                    ? () => {
                        onClose();
                        onOpenFullSettings();
                      }
                    : undefined
                }
              />
            </div>
          )}
        </div>

        {/* Pinned Volume Slider at Bottom */}
        <div
          style={{
            marginTop: "auto",
            padding: "12px 20px 14px",
            background: "var(--surface-raised)",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--ink-secondary)" }}>
              Volume Suara
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.76rem", color: "var(--accent)", fontWeight: 700 }}>
              {muted ? "Bisu (Muted)" : `${volume}%`}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              className="icon-btn"
              style={{ width: 34, height: 34 }}
              onClick={toggleMute}
              aria-label={muted || volume === 0 ? "Buka bisu" : "Bisukan suara"}
            >
              {muted || volume === 0 ? <SpeakerSlash size={18} /> : <SpeakerHigh size={18} />}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={muted ? 0 : volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label="Volume audio"
              style={{ flex: 1, accentColor: "var(--accent)", cursor: "pointer", height: 6 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
