import { useEffect, useState } from "react";
import {
  ArrowCounterClockwise,
  Equalizer,
  Gauge,
  LinkSimple,
  Minus,
  MusicNotes,
  Plus,
  X,
} from "@phosphor-icons/react";
import { usePlayer } from "../context/PlayerContext";
import { semitonesToRatio } from "../lib/audioDsp";
import { AudioEqualizerPanel } from "./AudioEqualizerPanel";

interface SpeedPitchModalProps {
  open: boolean;
  onClose: () => void;
  initialTab?: "tempo" | "eq";
}

const SPEED_PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
const VIBE_PRESETS = [
  { label: "Slowed", speed: 0.85, pitch: -2, linked: true },
  { label: "Normal", speed: 1.0, pitch: 0, linked: true },
  { label: "Nightcore", speed: 1.15, pitch: 2, linked: true },
  { label: "Podcast", speed: 1.25, pitch: 0, linked: false },
];

export function SpeedPitchModal({
  open,
  onClose,
  initialTab = "tempo",
}: SpeedPitchModalProps) {
  const {
    playbackRate,
    pitchSemitones,
    pitchSpeedLinked,
    effectivePlaybackRate,
    eq,
    setPlaybackRate,
    setPitchSemitones,
    setPitchSpeedLinked,
    resetSpeedPitch,
  } = usePlayer();

  const [tab, setTab] = useState<"tempo" | "eq">(initialTab);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const pitchPct = Math.round(semitonesToRatio(pitchSemitones) * 100);
  const formattedSpeed = `${playbackRate.toFixed(2)}x`;
  const formattedPitch = `${pitchSemitones > 0 ? `+${pitchSemitones}` : pitchSemitones} st`;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Kecepatan, Nada, dan Equalizer"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card speed-pitch-dialog" style={{ maxWidth: 460, padding: 20, gap: 16 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Gauge size={20} weight="bold" style={{ color: "var(--accent)" }} />
            <div>
              <h2 style={{ fontSize: "1.08rem", lineHeight: 1.2 }}>Kecepatan &amp; Nada</h2>
              <p style={{ fontSize: "0.76rem", color: "var(--ink-muted)" }}>
                Output aktif: {effectivePlaybackRate.toFixed(2)}x · EQ {eq.enabled ? "Aktif" : "Flat"}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="icon-btn"
            style={{ width: 34, height: 34 }}
            onClick={onClose}
            aria-label="Tutup dialog kecepatan dan nada"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Switcher */}
        <div
          className="drawer-tabs"
          style={{ gridTemplateColumns: "repeat(2, 1fr)", marginBottom: 0 }}
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "tempo"}
            className={`drawer-tab${tab === "tempo" ? " is-active" : ""}`}
            onClick={() => setTab("tempo")}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            <Gauge size={15} weight="bold" />
            <span>Tempo &amp; Nada</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "eq"}
            className={`drawer-tab${tab === "eq" ? " is-active" : ""}`}
            onClick={() => setTab("eq")}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            <Equalizer size={15} weight="bold" />
            <span>Equalizer {eq.enabled ? "· On" : ""}</span>
          </button>
        </div>

        {tab === "tempo" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Compact Speed Stepper Card */}
            <div className="stepper-card">
              <div className="stepper-card-head">
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <Gauge size={16} weight="bold" style={{ color: "var(--accent)" }} />
                  <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>Kecepatan (Speed)</span>
                </div>
                <span className="stepper-readout">{formattedSpeed}</span>
              </div>

              <div className="stepper-controls-row">
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => setPlaybackRate(playbackRate - 0.05)}
                  disabled={playbackRate <= 0.25}
                  aria-label="Turunkan kecepatan 0.05x"
                >
                  <Minus size={17} weight="bold" />
                </button>
                <input
                  type="range"
                  min={0.25}
                  max={2.0}
                  step={0.05}
                  value={playbackRate}
                  onChange={(e) => setPlaybackRate(Number(e.target.value))}
                  aria-label="Slider kecepatan pemutaran"
                  className="stepper-range"
                />
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => setPlaybackRate(playbackRate + 0.05)}
                  disabled={playbackRate >= 2.0}
                  aria-label="Naikkan kecepatan 0.05x"
                >
                  <Plus size={17} weight="bold" />
                </button>
              </div>

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
            </div>

            {/* Compact Pitch Stepper Card */}
            <div className="stepper-card">
              <div className="stepper-card-head">
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <MusicNotes size={16} weight="bold" style={{ color: "var(--accent)" }} />
                  <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>Nada (Pitch)</span>
                </div>
                <span className="stepper-readout">
                  {formattedPitch} <small style={{ opacity: 0.72 }}>({pitchPct}%)</small>
                </span>
              </div>

              <div className="stepper-controls-row">
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => setPitchSemitones(pitchSemitones - 1)}
                  disabled={pitchSemitones <= -12}
                  aria-label="Turunkan nada 1 semitone"
                >
                  <Minus size={17} weight="bold" />
                </button>
                <input
                  type="range"
                  min={-12}
                  max={12}
                  step={0.5}
                  value={pitchSemitones}
                  onChange={(e) => setPitchSemitones(Number(e.target.value))}
                  aria-label="Slider nada semitone"
                  className="stepper-range"
                />
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => setPitchSemitones(pitchSemitones + 1)}
                  disabled={pitchSemitones >= 12}
                  aria-label="Naikkan nada 1 semitone"
                >
                  <Plus size={17} weight="bold" />
                </button>
              </div>

              {/* Link Pitch & Tempo Toggle */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: "1px solid var(--border-subtle)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <LinkSimple size={15} style={{ color: "var(--accent)" }} />
                  <div>
                    <div style={{ fontSize: "0.82rem", fontWeight: 600 }}>Tautkan Nada ke Tempo</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--ink-muted)" }}>
                      Aktifkan efek Slowed / Nightcore langsung pada stream
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={pitchSpeedLinked}
                  aria-label="Tautkan nada ke tempo"
                  className={`toggle-pill${pitchSpeedLinked ? " is-on" : ""}`}
                  onClick={() => setPitchSpeedLinked(!pitchSpeedLinked)}
                >
                  <span className="toggle-thumb" />
                </button>
              </div>
            </div>

            {/* Quick Vibe Presets */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 6 }}>
              {VIBE_PRESETS.map((v) => {
                const active =
                  Math.abs(playbackRate - v.speed) < 0.02 &&
                  Math.abs(pitchSemitones - v.pitch) < 0.1;
                return (
                  <button
                    key={v.label}
                    type="button"
                    className={`btn${active ? " btn-accent" : " btn-secondary"}`}
                    style={{ minHeight: 36, padding: "0 8px", fontSize: "0.78rem" }}
                    onClick={() => {
                      setPlaybackRate(v.speed);
                      setPitchSemitones(v.pitch);
                      setPitchSpeedLinked(v.linked);
                    }}
                  >
                    {v.label}
                  </button>
                );
              })}
            </div>

            {/* Reset Footer */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ minHeight: 38, fontSize: "0.82rem" }}
                onClick={resetSpeedPitch}
                disabled={playbackRate === 1 && pitchSemitones === 0}
              >
                <ArrowCounterClockwise size={15} weight="bold" />
                <span>Reset Normal</span>
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ minHeight: 38, padding: "0 18px", fontSize: "0.84rem" }}
                onClick={onClose}
              >
                Selesai
              </button>
            </div>
          </div>
        ) : (
          <AudioEqualizerPanel />
        )}
      </div>
    </div>
  );
}
