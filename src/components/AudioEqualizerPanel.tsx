import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowCounterClockwise,
  Equalizer,
  FileAudio,
  Pause,
  Play,
  Sliders,
  Waveform,
} from "@phosphor-icons/react";
import type { EqPresetId } from "../types/music";
import {
  DEFAULT_EQ_SETTINGS,
  EQ_BAND_META,
  EQ_PRESETS,
  sharedAudioDsp,
} from "../lib/audioDsp";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";

interface AudioEqualizerPanelProps {
  compact?: boolean;
}

const PRESET_ORDER: Exclude<EqPresetId, "custom">[] = [
  "flat",
  "bass",
  "vocal",
  "acoustic",
  "electronic",
  "latenight",
];

export function AudioEqualizerPanel({ compact = false }: AudioEqualizerPanelProps) {
  const { eq, playbackRate, pitchSemitones, setEqSettings } = usePlayer();
  const { notify } = useToast();

  // Optional local audio file deck powered directly by Web Audio API BiquadFilterNode + AnalyserNode
  const [localFileName, setLocalFileName] = useState<string | null>(null);
  const [localPlaying, setLocalPlaying] = useState(false);
  const localAudioRef = useRef<HTMLAudioElement | null>(null);
  const localUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const spectrumCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (localAudioRef.current) {
      sharedAudioDsp.applyEq(eq);
      sharedAudioDsp.applyPitchAndSpeed(localAudioRef.current, playbackRate, pitchSemitones);
    }
  }, [eq, playbackRate, pitchSemitones]);

  // Real-time FFT spectrum animation when local audio is playing
  useEffect(() => {
    if (!localPlaying) return;
    let raf = 0;
    const draw = () => {
      const canvas = spectrumCanvasRef.current;
      const bins = sharedAudioDsp.getFrequencyData();
      if (canvas && bins) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);
          const count = 24;
          const barW = (w - (count - 1) * 3) / count;
          const accent = getComputedStyle(document.documentElement)
            .getPropertyValue("--accent")
            .trim() || "#264869";
          ctx.fillStyle = accent;
          for (let i = 0; i < count; i++) {
            const val = bins[i] / 255;
            const bh = Math.max(4, val * (h - 4));
            const x = i * (barW + 3);
            ctx.beginPath();
            ctx.roundRect(x, h - bh, barW, bh, 3);
            ctx.fill();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [localPlaying]);

  useEffect(() => {
    return () => {
      localAudioRef.current?.pause();
      if (localUrlRef.current) URL.revokeObjectURL(localUrlRef.current);
    };
  }, []);

  const handleSelectPreset = (presetId: Exclude<EqPresetId, "custom">) => {
    const p = EQ_PRESETS[presetId];
    setEqSettings({
      enabled: true,
      preset: presetId,
      bands: [...p.bands] as [number, number, number, number, number],
      bassBoost: p.bassBoost,
    });
  };

  const handleBandChange = (index: number, dbValue: number) => {
    const next = [...eq.bands] as [number, number, number, number, number];
    next[index] = dbValue;
    setEqSettings({
      enabled: true,
      preset: "custom",
      bands: next,
    });
  };

  const handleReset = () => {
    setEqSettings({ ...DEFAULT_EQ_SETTINGS, enabled: eq.enabled });
    notify("Equalizer direset ke Flat (0 dB)", "info");
  };

  const handleLocalFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (localUrlRef.current) URL.revokeObjectURL(localUrlRef.current);
    const url = URL.createObjectURL(file);
    localUrlRef.current = url;
    setLocalFileName(file.name);

    let el = localAudioRef.current;
    if (!el) {
      el = new Audio();
      el.crossOrigin = "anonymous";
      el.onended = () => setLocalPlaying(false);
      localAudioRef.current = el;
    }
    el.src = url;
    sharedAudioDsp.connectElement(el, eq);
    sharedAudioDsp.applyPitchAndSpeed(el, playbackRate, pitchSemitones);
    void el.play().then(() => {
      setLocalPlaying(true);
      notify(`Memutar audio lokal via Web Audio DSP`, "success");
    });
    e.target.value = "";
  };

  const toggleLocalPlay = () => {
    const el = localAudioRef.current;
    if (!el) return;
    if (localPlaying) {
      el.pause();
      setLocalPlaying(false);
    } else {
      sharedAudioDsp.connectElement(el, eq);
      sharedAudioDsp.applyPitchAndSpeed(el, playbackRate, pitchSemitones);
      void el.play().then(() => setLocalPlaying(true));
    }
  };

  // Smooth SVG spline representing the 5-band frequency response curve
  const curvePath = useMemo(() => {
    const pts = eq.bands.map((db, idx) => {
      const effective = eq.enabled ? db : 0;
      const x = 18 + idx * 56;
      const y = 44 - (effective / 12) * 32;
      return { x, y };
    });
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const cx = (curr.x + next.x) / 2;
      d += ` C ${cx} ${curr.y}, ${cx} ${next.y}, ${next.x} ${next.y}`;
    }
    return {
      line: d,
      area: `${d} L ${pts[pts.length - 1].x} 82 L ${pts[0].x} 82 Z`,
      pts,
    };
  }, [eq.bands, eq.enabled]);

  return (
    <div className="eq-studio-panel">
      {/* Header Row */}
      <div className="eq-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Equalizer size={19} weight="bold" style={{ color: "var(--accent)" }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.94rem" }}>Audio Equalizer 5-Band</div>
            <div style={{ fontSize: "0.75rem", color: "var(--ink-muted)" }}>
              {eq.enabled
                ? `Preset: ${eq.preset === "custom" ? "Kustom" : EQ_PRESETS[eq.preset].label}`
                : "Equalizer nonaktif (Bypass)"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            className="icon-btn"
            style={{ width: 34, height: 34 }}
            onClick={handleReset}
            title="Reset EQ ke Flat"
            aria-label="Reset Equalizer"
          >
            <ArrowCounterClockwise size={16} weight="bold" />
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={eq.enabled}
            aria-label="Aktifkan Audio Equalizer"
            className={`toggle-pill${eq.enabled ? " is-on" : ""}`}
            onClick={() => setEqSettings({ enabled: !eq.enabled })}
          >
            <span className="toggle-thumb" />
          </button>
        </div>
      </div>

      {/* Presets Strip */}
      <div className="eq-preset-strip">
        {PRESET_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            className={`chip${eq.enabled && eq.preset === id ? " is-active" : ""}`}
            onClick={() => handleSelectPreset(id)}
          >
            {EQ_PRESETS[id].label}
          </button>
        ))}
      </div>

      {/* Live Frequency Curve Visualizer */}
      <div className={`eq-curve-box${eq.enabled ? "" : " is-bypassed"}`} aria-hidden="true">
        <svg viewBox="0 0 300 88" className="eq-curve-svg" preserveAspectRatio="none">
          <defs>
            <linearGradient id="eqFillGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.32" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <line x1="12" y1="44" x2="288" y2="44" stroke="var(--border-control)" strokeDasharray="3 4" strokeWidth="1" />
          <path d={curvePath.area} fill="url(#eqFillGrad)" />
          <path
            d={curvePath.line}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {curvePath.pts.map((p, idx) => (
            <circle
              key={idx}
              cx={p.x}
              cy={p.y}
              r="4"
              fill="var(--surface)"
              stroke="var(--accent)"
              strokeWidth="2.2"
            />
          ))}
        </svg>
        <div className="eq-curve-labels">
          <span>+12 dB</span>
          <span>0 dB</span>
          <span>-12 dB</span>
        </div>
      </div>

      {/* 5 Vertical Studio Faders */}
      <div className={`eq-bands-grid${eq.enabled ? "" : " is-bypassed"}`}>
        {EQ_BAND_META.map((band) => {
          const val = eq.bands[band.index] ?? 0;
          return (
            <div key={band.freq} className="eq-band-col">
              <span className="eq-band-val">
                {val > 0 ? `+${val}` : val}
              </span>
              <div className="eq-slider-track">
                <input
                  type="range"
                  min={-12}
                  max={12}
                  step={1}
                  value={val}
                  onChange={(e) => handleBandChange(band.index, Number(e.target.value))}
                  aria-label={`Band ${band.label}`}
                  className="eq-vertical-slider"
                />
              </div>
              <span className="eq-band-freq">{band.shortLabel}</span>
            </div>
          );
        })}
      </div>

      {/* Bass Boost Slider */}
      <div className="eq-bass-row">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.84rem", fontWeight: 600 }}>
            <Sliders size={15} style={{ color: "var(--accent)" }} />
            Sub-Bass Boost (80 Hz)
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--accent)", fontWeight: 700 }}>
            +{eq.bassBoost} dB
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={12}
          step={1}
          value={eq.bassBoost}
          onChange={(e) => setEqSettings({ enabled: true, bassBoost: Number(e.target.value) })}
          aria-label="Sub-Bass Boost"
          style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }}
        />
      </div>

      {/* Web Audio DSP Local Playback Deck (Real BiquadFilterNode + Pitch Shifter) */}
      {!compact && (
        <div className="eq-local-dsp-box">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <Waveform size={18} weight="bold" style={{ color: "var(--accent)", flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: "0.84rem" }}>
                  Web Audio API DSP Deck
                </div>
                <div style={{ fontSize: "0.74rem", color: "var(--ink-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {localFileName
                    ? `Aktif: ${localFileName}`
                    : "Buka audio lokal (MP3/WAV) untuk filter EQ & Pitch DSP murni"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              {localFileName && (
                <button
                  type="button"
                  className="icon-btn icon-btn-surface"
                  style={{ width: 36, height: 36 }}
                  onClick={toggleLocalPlay}
                  aria-label={localPlaying ? "Jeda audio lokal" : "Putar audio lokal"}
                >
                  {localPlaying ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary"
                style={{ minHeight: 36, padding: "0 12px", fontSize: "0.78rem" }}
                onClick={() => fileInputRef.current?.click()}
              >
                <FileAudio size={15} weight="bold" />
                <span>{localFileName ? "Ganti" : "Pilih File"}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                style={{ display: "none" }}
                onChange={handleLocalFile}
              />
            </div>
          </div>

          {localPlaying && (
            <canvas
              ref={spectrumCanvasRef}
              width={280}
              height={40}
              style={{ width: "100%", height: 40, marginTop: 10, display: "block" }}
            />
          )}
        </div>
      )}
    </div>
  );
}
