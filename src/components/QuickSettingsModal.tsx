import { useEffect } from "react";
import {
  Minus,
  Moon,
  Palette,
  PictureInPicture,
  Plus,
  Queue,
  SlidersHorizontal,
  SpeakerHigh,
  SpeakerSlash,
  Sun,
  Timer,
  VideoCamera,
  X,
} from "@phosphor-icons/react";
import { usePlayer } from "../context/PlayerContext";
import { useTheme } from "../context/ThemeContext";
import { useSettings } from "../context/SettingsContext";
import { useToast } from "../context/ToastContext";
import { formatTime } from "../lib/waveform";

interface QuickSettingsModalProps {
  open: boolean;
  onClose: () => void;
  onOpenQueue?: () => void;
}

const SPEED_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const TIMER_PRESETS = [15, 30, 45, 60];

export function QuickSettingsModal({
  open,
  onClose,
  onOpenQueue,
}: QuickSettingsModalProps) {
  const {
    volume,
    muted,
    playbackRate,
    sleepTimerSec,
    sleepTimerEndOfTrack,
    videoStageOpen,
    pipMode,
    queue,
    setVolume,
    toggleMute,
    setPlaybackRate,
    setSleepTimerMinutes,
    setSleepTimerEndOfTrack,
    setVideoStageOpen,
    togglePictureInPicture,
  } = usePlayer();

  const { resolvedTheme, setThemePref, dynamicColor, setDynamicColor } = useTheme();
  const { settings, updateSettings } = useSettings();
  const { notify } = useToast();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

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
          width: "min(460px, 100%)",
          maxHeight: "90vh",
          overflowY: "auto",
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
            padding: "18px 20px 14px",
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

        {/* Body Container */}
        <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
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
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1, minHeight: 44, justifyContent: "center", gap: 6, fontWeight: 700 }}
                onClick={() => handleSpeedChange(-0.1)}
                disabled={playbackRate <= 0.5}
                aria-label="Perlambat suara (-0.1x)"
                title="Perlambat suara"
              >
                <Minus size={18} weight="bold" /> Perlambat
              </button>

              <button
                type="button"
                className="btn btn-ghost"
                style={{
                  minHeight: 44,
                  padding: "0 14px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                }}
                onClick={() => setPlaybackRate(1.0)}
                title="Kembali ke kecepatan normal"
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
                title="Percepat suara"
              >
                <Plus size={18} weight="bold" /> Percepat
              </button>
            </div>

            {/* Preset Speed Chips */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {SPEED_PRESETS.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  className={`chip${playbackRate === rate ? " is-active" : ""}`}
                  style={{ fontSize: "0.76rem", padding: "4px 10px", fontFamily: "var(--font-mono)" }}
                  onClick={() => setPlaybackRate(rate)}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </section>

          {/* 2. Mode Video & Picture-in-Picture */}
          <section className="settings-group">
            <div style={{ fontWeight: 700, fontSize: "0.92rem", marginBottom: 8 }}>Mode Video & PiP</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button
                type="button"
                className={`btn${videoStageOpen ? " btn-primary" : " btn-secondary"}`}
                style={{ minHeight: 42, justifyContent: "center", gap: 8, fontSize: "0.82rem" }}
                onClick={() => {
                  setVideoStageOpen(!videoStageOpen);
                  notify(videoStageOpen ? "Beralih ke mode cover album" : "Mode video musik aktif", "info");
                }}
              >
                <VideoCamera size={18} weight={videoStageOpen ? "fill" : "regular"} />
                <span>{videoStageOpen ? "Video Aktif" : "Buka Video"}</span>
              </button>

              <button
                type="button"
                className={`btn${pipMode !== "off" ? " btn-primary" : " btn-secondary"}`}
                style={{ minHeight: 42, justifyContent: "center", gap: 8, fontSize: "0.82rem" }}
                onClick={() => void togglePictureInPicture()}
              >
                <PictureInPicture size={18} weight={pipMode !== "off" ? "fill" : "regular"} />
                <span>{pipMode !== "off" ? "PiP Aktif" : "Mini PiP"}</span>
              </button>
            </div>
          </section>

          {/* 3. Sleep Timer */}
          <section className="settings-group">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Timer size={18} style={{ color: "var(--accent)" }} />
                <span style={{ fontWeight: 700, fontSize: "0.92rem" }}>Timer Tidur (Sleep Timer)</span>
              </div>
              {hasTimer && (
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--accent)", fontWeight: 700 }}>
                  {sleepTimerSec !== null ? formatTime(sleepTimerSec) : "Akhir Lagu"}
                </span>
              )}
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                type="button"
                className={`chip${!hasTimer ? " is-active" : ""}`}
                onClick={() => {
                  setSleepTimerMinutes(null);
                  setSleepTimerEndOfTrack(false);
                }}
              >
                Mati
              </button>
              {TIMER_PRESETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`chip${sleepTimerSec !== null && Math.round(sleepTimerSec / 60) === m ? " is-active" : ""}`}
                  onClick={() => setSleepTimerMinutes(m)}
                >
                  {m}m
                </button>
              ))}
              <button
                type="button"
                className={`chip${sleepTimerEndOfTrack ? " is-active" : ""}`}
                onClick={() => setSleepTimerEndOfTrack(true)}
              >
                Akhir Lagu
              </button>
            </div>
          </section>

          {/* 4. Tema & Warna Cover (Palette) */}
          <section className="settings-group">
            <div style={{ fontWeight: 700, fontSize: "0.92rem", marginBottom: 8 }}>Tampilan & Tema</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <button
                type="button"
                className={`btn${resolvedTheme === "light" ? " btn-primary" : " btn-secondary"}`}
                style={{ minHeight: 38, justifyContent: "center", gap: 6, fontSize: "0.8rem" }}
                onClick={() => setThemePref("light")}
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

          {/* 5. Navigasi Antrean (Queue) */}
          {onOpenQueue && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ minHeight: 42, justifyContent: "center", gap: 8, fontSize: "0.86rem" }}
              onClick={() => {
                onClose();
                onOpenQueue();
              }}
            >
              <Queue size={18} />
              <span>Buka Antrean Lagu ({queue.length} antrean)</span>
            </button>
          )}
        </div>

        {/* 6. Volume Slider di Bagian Bawah (Sesuai Instruksi Tuan Rahmat) */}
        <div
          style={{
            marginTop: "auto",
            padding: "16px 20px 20px",
            background: "var(--surface-raised)",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--ink-secondary)" }}>
              Volume Suara
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--ink-muted)" }}>
              {muted ? "Muted" : `${volume}%`}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              className="icon-btn"
              style={{ width: 36, height: 36 }}
              onClick={toggleMute}
              aria-label={muted || volume === 0 ? "Buka bisu" : "Bisukan suara"}
            >
              {muted || volume === 0 ? <SpeakerSlash size={19} /> : <SpeakerHigh size={19} />}
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
