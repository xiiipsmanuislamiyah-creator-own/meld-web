import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CircleNotch,
  MagnifyingGlass,
  Minus,
  Moon,
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
  VideoCamera,
  X,
} from "@phosphor-icons/react";
import { usePlayer } from "../context/PlayerContext";
import { useTheme } from "../context/ThemeContext";
import { useSettings } from "../context/SettingsContext";
import { useToast } from "../context/ToastContext";
import { Artwork } from "./Artwork";
import { EqualizerBars } from "./EqualizerBars";
import { formatTime } from "../lib/waveform";
import { fetchUpNextRadio, searchCatalog } from "../lib/api";
import type { Track } from "../types/music";

interface QuickSettingsModalProps {
  open: boolean;
  onClose: () => void;
  initialTab?: "controls" | "queue" | "palette";
}

const SPEED_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const TIMER_PRESETS = [15, 30, 45, 60];

export function QuickSettingsModal({
  open,
  onClose,
  initialTab = "controls",
}: QuickSettingsModalProps) {
  const {
    currentTrack,
    playbackState,
    volume,
    muted,
    playbackRate,
    sleepTimerSec,
    sleepTimerEndOfTrack,
    videoStageOpen,
    pipMode,
    queue,
    queueIndex,
    setVolume,
    toggleMute,
    setPlaybackRate,
    setSleepTimerMinutes,
    setSleepTimerEndOfTrack,
    setVideoStageOpen,
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
  const { notify } = useToast();

  const [activeTab, setActiveTab] = useState<"controls" | "queue" | "palette">(initialTab);
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

  // Online catalog search in queue tab
  useEffect(() => {
    const q = queueSearchQuery.trim();
    if (!open || activeTab !== "queue" || q.length < 1) {
      setCatalogResults([]);
      setCatalogSearching(false);
      return;
    }

    setCatalogSearching(true);
    const timer = window.setTimeout(() => {
      searchCatalog(q, "songs")
        .then((res) => setCatalogResults(res.tracks.slice(0, 8)))
        .catch(() => setCatalogResults([]))
        .finally(() => setCatalogSearching(false));
    }, 150);

    return () => clearTimeout(timer);
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

  const handleSpeedChange = (delta: number) => {
    const current = playbackRate || 1;
    let next = Math.round((current + delta) * 100) / 100;
    if (next < 0.5) next = 0.5;
    if (next > 2.0) next = 2.0;
    setPlaybackRate(next);
  };

  const hasTimer = sleepTimerSec !== null || sleepTimerEndOfTrack;

  return (
    <div
      className="modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 140,
        background: "rgba(10, 12, 16, 0.65)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        animation: "fadeIn 0.2s var(--ease-out-snappy)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Pengaturan Playback & Tampilan"
    >
      <div
        className="quick-settings-panel"
        style={{
          width: "min(500px, 100%)",
          maxHeight: "90vh",
          overflow: "hidden",
          background: "var(--surface)",
          color: "var(--ink)",
          borderRadius: "var(--radius-xl)",
          border: "1px solid var(--border-control)",
          boxShadow: "var(--shadow-modal)",
          display: "flex",
          flexDirection: "column",
          padding: 0,
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
              Pengaturan & Kontrol
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

        {/* Unified Navigation Switcher: Kontrol | Antrean | Palet */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 4,
            padding: "10px 16px 6px",
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
            style={{ justifyContent: "center", gap: 6, fontSize: "0.82rem", minHeight: 36 }}
          >
            <SlidersHorizontal size={15} weight="bold" />
            <span>Kontrol</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "queue"}
            className={`drawer-tab${activeTab === "queue" ? " is-active" : ""}`}
            onClick={() => setActiveTab("queue")}
            style={{ justifyContent: "center", gap: 6, fontSize: "0.82rem", minHeight: 36 }}
          >
            <Queue size={15} weight="bold" />
            <span>Antrean ({queue.length})</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "palette"}
            className={`drawer-tab${activeTab === "palette" ? " is-active" : ""}`}
            onClick={() => setActiveTab("palette")}
            style={{ justifyContent: "center", gap: 6, fontSize: "0.82rem", minHeight: 36 }}
          >
            <Palette size={15} weight="bold" />
            <span>Palet</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
          {/* TAB 1: KONTROL */}
          {activeTab === "controls" && (
            <>
              {/* 1. Fitur Percepat / Perlambat Suara (Speed Control with + -) */}
              <section className="settings-group">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.92rem" }}>Kecepatan Audio (Tempo)</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--ink-muted)" }}>
                      Percepat atau perlambat suara sesuai ritme
                    </div>
                  </div>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      fontSize: "1.1rem",
                      color: "var(--accent)",
                      background: "var(--surface-active)",
                      padding: "4px 10px",
                      borderRadius: "var(--radius-pill)",
                    }}
                  >
                    {playbackRate.toFixed(2).replace(/\.00$/, "")}x
                  </span>
                </div>

                {/* Stepper with - and + */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ flex: 1, minHeight: 44, justifyContent: "center", gap: 6, fontWeight: 700 }}
                    onClick={() => handleSpeedChange(-0.1)}
                    disabled={playbackRate <= 0.5}
                    aria-label="Perlambat suara (-0.1x)"
                    title="Perlambat suara (-0.1x)"
                  >
                    <Minus size={18} weight="bold" />
                    <span>-0.1x</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{
                      minHeight: 44,
                      padding: "0 10px",
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                    onClick={() => setPlaybackRate(1.0)}
                    title="Kembali ke kecepatan normal (1.0x)"
                  >
                    1.0x Normal
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ flex: 1, minHeight: 44, justifyContent: "center", gap: 6, fontWeight: 700 }}
                    onClick={() => handleSpeedChange(0.1)}
                    disabled={playbackRate >= 2.0}
                    aria-label="Percepat suara (+0.1x)"
                    title="Percepat suara (+0.1x)"
                  >
                    <Plus size={18} weight="bold" />
                    <span>+0.1x</span>
                  </button>
                </div>

                {/* Preset Speed Chips */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
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
              </section>

              {/* 2. Panggung Video & Visual Stage */}
              <section className="settings-group">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <VideoCamera size={19} style={{ color: "var(--accent)" }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>Panggung Video (Video Stage)</div>
                      <div style={{ fontSize: "0.76rem", color: "var(--ink-muted)" }}>
                        Tampilkan video klip musik saat pemutar layar penuh
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`btn${videoStageOpen ? " btn-primary" : " btn-secondary"}`}
                    style={{ minHeight: 34, padding: "0 12px", fontSize: "0.78rem" }}
                    onClick={() => {
                      const next = !videoStageOpen;
                      setVideoStageOpen(next);
                      notify(next ? "Panggung video aktif" : "Panggung video dinonaktifkan", "info");
                    }}
                  >
                    {videoStageOpen ? "Aktif" : "Nonaktif"}
                  </button>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <PictureInPicture size={19} style={{ color: "var(--accent)" }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>Picture-in-Picture (PiP)</div>
                      <div style={{ fontSize: "0.76rem", color: "var(--ink-muted)" }}>
                        Jendela pemutar melayang di luar layar
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

              {/* 3. Pengatur Waktu Tidur (Sleep Timer) */}
              <section className="settings-group">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Timer size={19} style={{ color: "var(--accent)" }} />
                    <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>Pengatur Waktu Tidur (Sleep Timer)</span>
                  </div>
                  {sleepTimerSec !== null ? (
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", color: "var(--accent)", fontWeight: 700 }}>
                      {formatTime(sleepTimerSec)}
                    </span>
                  ) : sleepTimerEndOfTrack ? (
                    <span style={{ fontSize: "0.76rem", color: "var(--accent)", fontWeight: 700 }}>
                      Selesai Lagu Ini
                    </span>
                  ) : (
                    <span style={{ fontSize: "0.76rem", color: "var(--ink-muted)" }}>Mati</span>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginTop: 8 }}>
                  {TIMER_PRESETS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`btn${sleepTimerSec === m * 60 ? " btn-primary" : " btn-secondary"}`}
                      style={{ minHeight: 36, padding: 0, fontSize: "0.82rem" }}
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
                    style={{ flex: 1, minHeight: 36, fontSize: "0.8rem" }}
                    onClick={() => setSleepTimerEndOfTrack(!sleepTimerEndOfTrack)}
                  >
                    Hingga Akhir Lagu Ini
                  </button>
                  {hasTimer && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ minHeight: 36, fontSize: "0.8rem" }}
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

              {/* 4. Tema Permukaan & Warna Dinamis */}
              <section className="settings-group">
                <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 8 }}>
                  Tema Tampilan & Cover Dinamis
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
                    <Sun size={16} weight="fill" /> Light
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
                    <Moon size={16} weight="fill" /> Dark
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
                    <span style={{ fontSize: "0.75rem", fontWeight: 700 }}>OLED</span>
                  </button>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Palette size={18} style={{ color: "var(--accent)" }} />
                    <span style={{ fontSize: "0.84rem", fontWeight: 600 }}>Warna Cover Dinamis (Chroma)</span>
                  </div>
                  <button
                    type="button"
                    className={`chip${dynamicColor ? " is-active" : ""}`}
                    onClick={() => setDynamicColor(!dynamicColor)}
                  >
                    {dynamicColor ? "Aktif" : "Nonaktif"}
                  </button>
                </div>
              </section>
            </>
          )}

          {/* TAB 2: ANTREAN LAGU (QUEUE) */}
          {activeTab === "queue" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Search online catalog to add songs directly to queue */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--ink-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
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

                {/* Live Catalog Search Results */}
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
                            style={{ height: 28, fontSize: "0.72rem", padding: "0 8px", gap: 3 }}
                            onClick={() => addToQueue(item, true)}
                            title="Mainkan tepat setelah lagu ini"
                          >
                            <ArrowRight size={12} weight="bold" />
                            <span>Berikutnya</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ height: 28, fontSize: "0.72rem", padding: "0 8px" }}
                            onClick={() => addToQueue(item, false)}
                            title="Tambah ke akhir antrean"
                          >
                            + Antrean
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

              {/* Current Active Track & Queue List */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--ink-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
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

              {/* Kandidat Selanjutnya (Smart Next Candidates) */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 10, borderTop: "1px solid var(--border-subtle)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Sparkle size={16} weight="fill" style={{ color: "var(--accent)" }} />
                    <span style={{ fontWeight: 700, fontSize: "0.86rem" }}>Kandidat Selanjutnya</span>
                  </div>
                  {candidateLoading && <CircleNotch size={14} weight="bold" style={{ animation: "spin 0.8s linear infinite", color: "var(--accent)" }} />}
                </div>
                <p style={{ fontSize: "0.74rem", color: "var(--ink-muted)", margin: 0 }}>
                  Pilihan musik cerdas untuk melanjutkan putaran:
                </p>

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
                          style={{ height: 28, fontSize: "0.72rem", padding: "0 8px", gap: 3 }}
                          onClick={() => addToQueue(cand, true)}
                          title="Jadikan musik berikutnya"
                        >
                          <ArrowRight size={12} weight="bold" />
                          <span>+ Berikutnya</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ height: 28, fontSize: "0.72rem", padding: "0 8px" }}
                          onClick={() => addToQueue(cand, false)}
                          title="Tambah ke antrean"
                        >
                          + Antrean
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          style={{ width: 28, height: 28 }}
                          onClick={() => void playTrack(cand)}
                          title="Putar sekarang"
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

          {/* TAB 3: PALET WARNA (PALETTE) */}
          {activeTab === "palette" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.92rem", marginBottom: 4 }}>Palet Warna Cover Aktif</div>
                <p style={{ fontSize: "0.78rem", color: "var(--ink-muted)", margin: 0, lineHeight: 1.5 }}>
                  Warna diekstrak secara otomatis dari cover album yang sedang diputar untuk adaptasi tema antarmuka.
                </p>
              </div>

              <div className="swatch-row" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                <div className="swatch-chip">
                  <div className="swatch-color" style={{ background: palette.swatches.vibrant, height: 44, borderRadius: 8 }} />
                  <span className="swatch-label" style={{ fontSize: "0.72rem", marginTop: 4, display: "block" }}>Aksen</span>
                </div>
                <div className="swatch-chip">
                  <div className="swatch-color" style={{ background: palette.swatches.light, height: 44, borderRadius: 8 }} />
                  <span className="swatch-label" style={{ fontSize: "0.72rem", marginTop: 4, display: "block" }}>Tint</span>
                </div>
                <div className="swatch-chip">
                  <div className="swatch-color" style={{ background: palette.swatches.dominant, height: 44, borderRadius: 8 }} />
                  <span className="swatch-label" style={{ fontSize: "0.72rem", marginTop: 4, display: "block" }}>Dominan</span>
                </div>
                <div className="swatch-chip">
                  <div className="swatch-color" style={{ background: palette.swatches.dark, height: 44, borderRadius: 8 }} />
                  <span className="swatch-label" style={{ fontSize: "0.72rem", marginTop: 4, display: "block" }}>Dock</span>
                </div>
              </div>

              <div style={{ padding: 12, borderRadius: "var(--radius-md)", background: "var(--surface-raised)", fontSize: "0.78rem" }}>
                <div style={{ fontWeight: 600, color: "var(--accent)", marginBottom: 4 }}>Contrast Guard: WCAG AA</div>
                <p style={{ color: "var(--ink-muted)", margin: 0 }}>
                  Tingkat kontras warna selalu dikunci secara otomatis agar teks tetap tajam dan mudah dibaca pada mode Terang maupun Gelap.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 6. Pinned Volume Slider di Bagian Paling Bawah (Sesuai Instruksi Tuan Rahmat) */}
        <div
          style={{
            marginTop: "auto",
            padding: "14px 20px 16px",
            background: "var(--surface-raised)",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--ink-secondary)" }}>
              Volume Suara
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--accent)", fontWeight: 700 }}>
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
