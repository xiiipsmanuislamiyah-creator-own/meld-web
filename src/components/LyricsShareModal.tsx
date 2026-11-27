import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CloudRain,
  Copy,
  Disc,
  DownloadSimple,
  FilmStrip,
  ImageSquare,
  Snowflake,
  Sparkle,
  Stop,
  VideoCamera,
  Waveform,
  X,
} from "@phosphor-icons/react";
import type { Track } from "../types/music";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { Artwork } from "./Artwork";

type StudioMode = "card" | "video";
type CardAspect = "1:1" | "4:5" | "9:16";
type CardStyleTheme = "obsidian" | "chroma" | "paper";
type ParticleStyle = "snow" | "embers" | "rain" | "off";

export interface SyncedLyricLine {
  time: number;
  text: string;
}

interface LyricsShareModalProps {
  open: boolean;
  onClose: () => void;
  track: Track;
  lines: string[];
  syncedLines?: SyncedLyricLine[];
  currentTime?: number;
  initialIndex?: number;
}

interface Particle {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  alpha: number;
  phase: number;
}

const ASPECT_DIMENSIONS: Record<CardAspect, { w: number; h: number }> = {
  "1:1": { w: 1080, h: 1080 },
  "4:5": { w: 1080, h: 1350 },
  "9:16": { w: 1080, h: 1920 },
};

const VIDEO_DIMENSIONS: Record<CardAspect, { w: number; h: number }> = {
  "1:1": { w: 720, h: 720 },
  "4:5": { w: 720, h: 900 },
  "9:16": { w: 720, h: 1280 },
};

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      out.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) out.push(line);
  return out;
}

function getProxiedArtworkUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return `/api/artwork?url=${encodeURIComponent(url)}`;
  }
  return url;
}

function createParticles(count: number, w: number, h: number): Particle[] {
  const arr: Particle[] = [];
  for (let i = 0; i < count; i++) {
    arr.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 1.5 + Math.random() * 3.8,
      vx: (Math.random() - 0.5) * 0.7,
      vy: 0.7 + Math.random() * 2.1,
      alpha: 0.25 + Math.random() * 0.65,
      phase: Math.random() * Math.PI * 2,
    });
  }
  return arr;
}

export function LyricsShareModal({
  open,
  onClose,
  track,
  lines,
  syncedLines,
  currentTime = 0,
  initialIndex = 0,
}: LyricsShareModalProps) {
  const [mode, setMode] = useState<StudioMode>("video");
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [aspect, setAspect] = useState<CardAspect>("9:16");
  const [cardTheme, setCardTheme] = useState<CardStyleTheme>("obsidian");

  // Video Studio Controls
  const [spinDisc, setSpinDisc] = useState(true);
  const [showVisualizer, setShowVisualizer] = useState(true);
  const [particlesMode, setParticlesMode] = useState<ParticleStyle>("snow");
  const [grooveDJ, setGrooveDJ] = useState(true);
  const [durationSec, setDurationSec] = useState<number>(15);

  // Recording / Export state
  const [recording, setRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const [recordElapsed, setRecordElapsed] = useState(0);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const artworkImgRef = useRef<HTMLImageElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordStopTimerRef = useRef<number | null>(null);
  const recordIntervalRef = useRef<number | null>(null);
  const recordStartTimestampRef = useRef<number>(0);

  const { palette } = useTheme();
  const { notify } = useToast();

  // Seed initial lyric selection when opened
  useEffect(() => {
    if (!open) return;
    if (lines.length === 0) {
      setSelectedIndices([]);
      return;
    }
    const start = Math.max(0, Math.min(lines.length - 1, initialIndex));
    const end = Math.min(lines.length, start + 3);
    const seed: number[] = [];
    for (let i = start; i < end; i++) seed.push(i);
    setSelectedIndices(seed);
  }, [open, lines.length, initialIndex]);

  // Load CORS-safe artwork image via /api/artwork proxy
  useEffect(() => {
    if (!open || !track.artwork) {
      artworkImgRef.current = null;
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!cancelled) artworkImgRef.current = img;
    };
    img.onerror = () => {
      if (!cancelled) artworkImgRef.current = null;
    };
    img.src = getProxiedArtworkUrl(track.artwork);
    return () => {
      cancelled = true;
    };
  }, [open, track.artwork]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !recording) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, recording, onClose]);

  const stopRecording = useCallback(() => {
    if (recordStopTimerRef.current !== null) {
      clearTimeout(recordStopTimerRef.current);
      recordStopTimerRef.current = null;
    }
    if (recordIntervalRef.current !== null) {
      clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    setRecording(false);
    setRecordProgress(0);
    setRecordElapsed(0);
  }, []);

  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  const selectedLines = useMemo(() => {
    const picked = selectedIndices.map((i) => lines[i]).filter(Boolean);
    return picked.length > 0 ? picked : [track.title];
  }, [selectedIndices, lines, track.title]);

  const themeColors = useMemo(() => {
    if (cardTheme === "paper") {
      return {
        bg: "#F6F4EF",
        bg2: "#E7E3D9",
        card: "#FCFBF8",
        ink: "#16171B",
        muted: "#5A5C66",
        accent: palette.accentLight,
      };
    }
    if (cardTheme === "chroma") {
      return {
        bg: palette.dockBg,
        bg2: palette.dockSurface,
        card: palette.dockSurface,
        ink: "#F7F5F0",
        muted: "#C4C7D0",
        accent: palette.accentDark,
      };
    }
    return {
      bg: "#0F1218",
      bg2: "#181D27",
      card: "#161A23",
      ink: "#F6F4EF",
      muted: "#A6AAB7",
      accent: palette.accentDark,
    };
  }, [cardTheme, palette]);

  // Core Canvas Frame Renderer (Musical Beat Sync, Genuine Song Timestamps, Zero Slop)
  const renderVideoFrame = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      w: number,
      h: number,
      elapsedSec: number,
      totalSec: number,
    ) => {
      // 1. Smooth Musical DJ Beat Pulse (~124 BPM) without erratic screen jitter
      const bpm = 124;
      const beatCycle = (elapsedSec * (bpm / 60)) % 1;
      const kick = Math.pow(Math.max(0, 1 - beatCycle * 2.8), 2.2);
      const subWave = 0.5 + 0.5 * Math.sin(elapsedSec * 2.5);
      const energy = 0.25 + kick * 0.75;

      // Tactile scale bump on the beat downbeat (clean musical punch, no screen displacement)
      const pulseScale = grooveDJ ? (1 + kick * 0.022) : 1;

      ctx.save();
      ctx.fillStyle = themeColors.bg;
      ctx.fillRect(0, 0, w, h);

      // Dynamic Cover-Chroma Atmospheric Gradient
      const cx = w * 0.5;
      const cy = aspect === "9:16" ? h * 0.37 : h * 0.38;
      const glow = ctx.createRadialGradient(cx, cy, w * 0.06, cx, cy, w * 0.78);
      glow.addColorStop(0, `${themeColors.accent}${cardTheme === "paper" ? "2C" : "44"}`);
      glow.addColorStop(0.55, `${themeColors.bg2}88`);
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // Blurred cover backdrop on dark/chroma modes
      const img = artworkImgRef.current;
      if (img && cardTheme !== "paper") {
        ctx.save();
        ctx.globalAlpha = 0.16 + kick * 0.04;
        const coverScale = Math.max(w / img.width, h / img.height) * 1.12;
        const bw = img.width * coverScale;
        const bh = img.height * coverScale;
        ctx.drawImage(img, (w - bw) / 2, (h - bh) / 2, bw, bh);
        ctx.restore();

        const scrim = ctx.createLinearGradient(0, 0, 0, h);
        scrim.addColorStop(0, `${themeColors.bg}B5`);
        scrim.addColorStop(0.5, `${themeColors.bg}8C`);
        scrim.addColorStop(1, `${themeColors.bg}EE`);
        ctx.fillStyle = scrim;
        ctx.fillRect(0, 0, w, h);
      }

      // Apply tactile musical pulse transform to stage
      ctx.translate(cx, cy);
      ctx.scale(pulseScale, pulseScale);
      ctx.translate(-cx, -cy);

      // Top Track Badge
      const topY = aspect === "9:16" ? h * 0.08 : h * 0.075;
      ctx.textAlign = "center";
      ctx.fillStyle = themeColors.accent;
      ctx.font = `700 ${Math.round(w * 0.024)}px "JetBrains Mono", monospace`;
      ctx.fillText("NOW PLAYING · MELD STUDIO", cx, topY);

      ctx.fillStyle = themeColors.ink;
      ctx.font = `700 ${Math.round(w * 0.044)}px "Bricolage Grotesque", sans-serif`;
      const safeTitle = track.title.length > 28 ? `${track.title.slice(0, 27)}…` : track.title;
      ctx.fillText(safeTitle, cx, topY + w * 0.058);

      ctx.fillStyle = themeColors.muted;
      ctx.font = `500 ${Math.round(w * 0.03)}px "Plus Jakarta Sans", sans-serif`;
      const safeArtist = track.artist.length > 34 ? `${track.artist.slice(0, 33)}…` : track.artist;
      ctx.fillText(safeArtist, cx, topY + w * 0.098);

      // 2. Spinning Vinyl / CD Disc
      const discRadius = aspect === "9:16" ? w * 0.255 : w * 0.21;

      // Radial Audio Visualizer Bars
      if (showVisualizer) {
        const barCount = 52;
        ctx.save();
        ctx.translate(cx, cy);
        for (let i = 0; i < barCount; i++) {
          const angle = (i / barCount) * Math.PI * 2 + elapsedSec * 0.22;
          const isBassBar = i % 4 === 0;
          const wave =
            Math.abs(Math.sin(i * 0.45 + elapsedSec * 3.8)) * 0.55 +
            Math.abs(Math.cos(i * 0.22 - elapsedSec * 2.2)) * 0.45;
          const amp = isBassBar ? (wave * 0.4 + kick * 0.6) : wave;
          const barLen = 10 + amp * energy * (w * 0.092);
          const innerR = discRadius + 14;
          const x1 = Math.cos(angle) * innerR;
          const y1 = Math.sin(angle) * innerR;
          const x2 = Math.cos(angle) * (innerR + barLen);
          const y2 = Math.sin(angle) * (innerR + barLen);

          ctx.strokeStyle = themeColors.accent;
          ctx.globalAlpha = 0.42 + amp * 0.54;
          ctx.lineWidth = Math.max(3, w * 0.0068);
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Disc Outer Shadow & Smooth Vinyl Inertia
      ctx.save();
      ctx.translate(cx, cy);
      if (spinDisc) {
        ctx.rotate(elapsedSec * 0.82);
      }

      // Outer vinyl rim
      ctx.beginPath();
      ctx.arc(0, 0, discRadius + 6, 0, Math.PI * 2);
      ctx.fillStyle = cardTheme === "paper" ? "#181A20" : "#0A0C10";
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = 32;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Artwork clipped inside disc
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, discRadius, 0, Math.PI * 2);
      ctx.clip();
      if (img) {
        ctx.drawImage(img, -discRadius, -discRadius, discRadius * 2, discRadius * 2);
      } else {
        ctx.fillStyle = themeColors.accent;
        ctx.fillRect(-discRadius, -discRadius, discRadius * 2, discRadius * 2);
      }
      ctx.restore();

      // Vinyl grooves
      for (let g = 0.52; g <= 0.92; g += 0.14) {
        ctx.beginPath();
        ctx.arc(0, 0, discRadius * g, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.09)";
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      const sheen = ctx.createLinearGradient(-discRadius, -discRadius, discRadius, discRadius);
      sheen.addColorStop(0, "rgba(255,255,255,0.22)");
      sheen.addColorStop(0.45, "rgba(255,255,255,0)");
      sheen.addColorStop(0.55, "rgba(255,255,255,0)");
      sheen.addColorStop(1, "rgba(255,255,255,0.16)");
      ctx.beginPath();
      ctx.arc(0, 0, discRadius, 0, Math.PI * 2);
      ctx.fillStyle = sheen;
      ctx.fill();

      // Metallic CD Center Spindle Ring
      ctx.beginPath();
      ctx.arc(0, 0, discRadius * 0.21, 0, Math.PI * 2);
      ctx.fillStyle = themeColors.bg;
      ctx.fill();
      ctx.strokeStyle = themeColors.accent;
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, discRadius * 0.085, 0, Math.PI * 2);
      ctx.fillStyle = themeColors.accent;
      ctx.fill();

      ctx.restore();

      // 3. Bottom Spectrum Waveform Bars
      if (showVisualizer) {
        const waveBars = 36;
        const waveW = w * 0.72;
        const startX = (w - waveW) / 2;
        const baseY = aspect === "9:16" ? h * 0.67 : h * 0.68;
        const step = waveW / waveBars;
        for (let i = 0; i < waveBars; i++) {
          const norm = i / waveBars;
          const envelope = Math.sin(norm * Math.PI);
          const isLow = i < 10;
          const dynamicAmp = isLow
            ? (0.35 + kick * 0.65) * envelope
            : (0.25 + 0.75 * Math.abs(Math.sin(i * 0.58 + elapsedSec * 4.2))) * envelope;
          const barH = Math.max(6, dynamicAmp * (w * 0.085));
          ctx.fillStyle = themeColors.accent;
          ctx.globalAlpha = 0.35 + dynamicAmp * 0.6;
          ctx.beginPath();
          ctx.roundRect(startX + i * step, baseY - barH / 2, step * 0.58, barH, 4);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // 4. Genuine Song Lyric Synchronization & Word Progression
      let activeText = selectedLines[0] || track.title;
      let nextText = selectedLines[1] || "";
      let lineProgress = 0;

      if (syncedLines && syncedLines.length > 0) {
        // Find anchor timestamp from selected lines
        const firstSelectedIdx = selectedIndices[0] ?? initialIndex ?? 0;
        const anchorLine = syncedLines[firstSelectedIdx] || syncedLines[0];
        const baseSongTime = anchorLine ? anchorLine.time : currentTime;
        const currentSongTime = baseSongTime + (elapsedSec % totalSec);

        // Find active synced line corresponding to the current virtual song time
        let activeSyncedIdx = 0;
        for (let i = 0; i < syncedLines.length; i++) {
          const cur = syncedLines[i];
          const nxt = syncedLines[i + 1];
          if (currentSongTime >= cur.time && (!nxt || currentSongTime < nxt.time)) {
            activeSyncedIdx = i;
            break;
          }
        }

        const curLine = syncedLines[activeSyncedIdx];
        const nxtLine = syncedLines[activeSyncedIdx + 1];
        activeText = curLine?.text || selectedLines[0] || track.title;
        nextText = nxtLine?.text || "";

        const lStart = curLine?.time ?? 0;
        const lEnd = nxtLine?.time ?? (lStart + Math.max(2.8, activeText.length * 0.14));
        const lDur = Math.max(0.6, lEnd - lStart);
        lineProgress = Math.max(0, Math.min(1, (currentSongTime - lStart) / lDur));
      } else {
        // Plain text fallback: smooth pacing across selected lines
        const totalLines = selectedLines.length;
        const segDur = totalSec / Math.max(1, totalLines);
        const lIdx = Math.min(totalLines - 1, Math.floor((elapsedSec % totalSec) / segDur));
        lineProgress = ((elapsedSec % totalSec) % segDur) / segDur;
        activeText = selectedLines[lIdx] || track.title;
        nextText = selectedLines[lIdx + 1] || "";
      }

      const fontSize = Math.round(w * (aspect === "9:16" ? 0.044 : 0.04));
      ctx.font = `700 ${fontSize}px "Bricolage Grotesque", sans-serif`;
      const wrapped = wrapCanvasText(ctx, activeText, w * 0.82);

      // Active word calculation by character length weighting
      const allWords = activeText.split(/\s+/).filter(Boolean);
      const weights = allWords.map((w) => Math.max(2, w.length));
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      let accum = 0;
      let activeWordGlobalIdx = 0;
      for (let w = 0; w < allWords.length; w++) {
        const startF = accum / totalWeight;
        accum += weights[w];
        const endF = accum / totalWeight;
        if (lineProgress >= startF && lineProgress <= endF) {
          activeWordGlobalIdx = w;
          break;
        }
        if (lineProgress > endF) activeWordGlobalIdx = w;
      }

      const lyricBaseY = aspect === "9:16" ? h * 0.785 : h * 0.79;
      const lineH = fontSize * 1.48;
      let wordCursor = 0;

      wrapped.slice(0, 2).forEach((rowText, rowIdx) => {
        const rowWords = rowText.split(/\s+/).filter(Boolean);
        const spaceW = ctx.measureText("  ").width;
        const wordWidths = rowWords.map((word) => ctx.measureText(word).width);
        const totalRowW =
          wordWidths.reduce((a, b) => a + b, 0) + Math.max(0, rowWords.length - 1) * spaceW;

        let cursorX = cx - totalRowW / 2;
        const y = lyricBaseY + rowIdx * lineH;

        rowWords.forEach((word, wIdx) => {
          const isActiveWord = wordCursor === activeWordGlobalIdx;
          const isPastWord = wordCursor < activeWordGlobalIdx;
          const ww = wordWidths[wIdx];

          if (isActiveWord) {
            // High-contrast accent color with clean underline (no clumsy box cutting words)
            ctx.fillStyle = themeColors.accent;
            ctx.fillText(word, cursorX, y);
            // Sleek subtle underline bar for active word
            ctx.fillStyle = `${themeColors.accent}C0`;
            ctx.beginPath();
            ctx.roundRect(cursorX, y + 6, ww, 3, 1.5);
            ctx.fill();
          } else {
            ctx.fillStyle = isPastWord ? themeColors.ink : themeColors.muted;
            ctx.fillText(word, cursorX, y);
          }

          cursorX += ww + spaceW;
          wordCursor += 1;
        });
      });

      // Preview of upcoming lyric line
      if (nextText) {
        ctx.textAlign = "center";
        ctx.font = `500 ${Math.round(w * 0.028)}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = themeColors.muted;
        ctx.globalAlpha = 0.62;
        const preview = nextText.length > 44 ? `${nextText.slice(0, 43)}…` : nextText;
        ctx.fillText(preview, cx, lyricBaseY + wrapped.slice(0, 2).length * lineH + 10);
        ctx.globalAlpha = 1;
      }

      // Progress Bar & Brand Watermark at Base
      const progY = h - Math.round(h * 0.055);
      const progW = w * 0.56;
      const progX = (w - progW) / 2;
      ctx.fillStyle = cardTheme === "paper" ? "rgba(22,23,27,0.14)" : "rgba(255,255,255,0.16)";
      ctx.beginPath();
      ctx.roundRect(progX, progY, progW, 5, 3);
      ctx.fill();

      const progressFrac = Math.min(1, Math.max(0, (elapsedSec % totalSec) / totalSec));
      ctx.fillStyle = themeColors.accent;
      ctx.beginPath();
      ctx.roundRect(progX, progY, Math.max(8, progW * progressFrac), 5, 3);
      ctx.fill();

      ctx.textAlign = "center";
      ctx.font = `600 ${Math.round(w * 0.022)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = themeColors.muted;
      ctx.fillText("MELD WEB · RHMT OFC", cx, h - Math.round(h * 0.024));

      ctx.restore();

      // 5. Atmospheric Particles
      if (particlesMode !== "off") {
        if (particlesRef.current.length === 0) {
          particlesRef.current = createParticles(46, w, h);
        }
        ctx.save();
        for (const p of particlesRef.current) {
          if (particlesMode === "snow") {
            p.x += p.vx + Math.sin(elapsedSec * 1.4 + p.phase) * 0.55;
            p.y += p.vy * 0.9;
            if (p.y > h + 8) {
              p.y = -8;
              p.x = Math.random() * w;
            }
            if (p.x < -8) p.x = w + 8;
            if (p.x > w + 8) p.x = -8;

            ctx.fillStyle = cardTheme === "paper" ? themeColors.accent : "#FFFFFF";
            ctx.globalAlpha = p.alpha * (0.6 + subWave * 0.25);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
          } else if (particlesMode === "embers") {
            p.x += Math.sin(elapsedSec * 2 + p.phase) * 0.85;
            p.y -= p.vy * 0.85;
            if (p.y < -8) {
              p.y = h + 8;
              p.x = Math.random() * w;
            }
            ctx.fillStyle = themeColors.accent;
            ctx.globalAlpha = p.alpha * (0.55 + kick * 0.45);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r * 1.15, 0, Math.PI * 2);
            ctx.fill();
          } else if (particlesMode === "rain") {
            p.x -= 1.2;
            p.y += p.vy * 6.5;
            if (p.y > h + 16) {
              p.y = -16;
              p.x = Math.random() * w;
            }
            ctx.strokeStyle = cardTheme === "paper" ? themeColors.accent : "#DCE7F5";
            ctx.globalAlpha = p.alpha * 0.5;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x - 4, p.y + 18);
            ctx.stroke();
          }
        }
        ctx.restore();
      }
    },
    [
      aspect,
      cardTheme,
      currentTime,
      grooveDJ,
      initialIndex,
      particlesMode,
      selectedIndices,
      selectedLines,
      showVisualizer,
      spinDisc,
      syncedLines,
      themeColors,
      track.artist,
      track.title,
    ],
  );

  // Live 60fps Canvas Preview Loop when Video mode is open
  useEffect(() => {
    if (!open || mode !== "video") return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const dims = VIDEO_DIMENSIONS[aspect];
    canvas.width = dims.w;
    canvas.height = dims.h;
    particlesRef.current = createParticles(46, dims.w, dims.h);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    const startStamp = performance.now();
    const tick = () => {
      const elapsedSec = (performance.now() - startStamp) / 1000;
      renderVideoFrame(ctx, dims.w, dims.h, elapsedSec, durationSec);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [open, mode, aspect, durationSec, renderVideoFrame]);

  if (!open) return null;

  const toggleIndex = (idx: number) => {
    setSelectedIndices((prev) => {
      if (prev.includes(idx)) {
        return prev.length > 1 ? prev.filter((x) => x !== idx) : prev;
      }
      if (prev.length >= 6) {
        return [...prev.slice(1), idx].sort((a, b) => a - b);
      }
      return [...prev, idx].sort((a, b) => a - b);
    });
  };

  const handleCopyQuote = () => {
    const quote = `"${selectedLines.join("\n")}"\n— ${track.title} (${track.artist})`;
    navigator.clipboard?.writeText(quote).then(() => {
      notify("Kutipan lirik disalin ke clipboard", "success");
    });
  };

  const handleExportPng = async () => {
    const dims = ASPECT_DIMENSIONS[aspect];
    const canvas = document.createElement("canvas");
    canvas.width = dims.w;
    canvas.height = dims.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = themeColors.bg;
    ctx.fillRect(0, 0, dims.w, dims.h);

    const grad = ctx.createRadialGradient(
      dims.w * 0.25,
      dims.h * 0.15,
      20,
      dims.w * 0.25,
      dims.h * 0.15,
      dims.w * 0.85,
    );
    grad.addColorStop(0, `${themeColors.accent}33`);
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, dims.w, dims.h);

    const pad = 76;
    const cardX = pad;
    const cardY = pad;
    const cardW = dims.w - pad * 2;
    const cardH = dims.h - pad * 2;
    ctx.fillStyle = themeColors.card;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 48);
    ctx.fill();

    const innerPad = 68;
    const artSize = 112;
    const artX = cardX + innerPad;
    const artY = cardY + innerPad;
    ctx.fillStyle = themeColors.accent;
    ctx.beginPath();
    ctx.roundRect(artX, artY, artSize, artSize, 22);
    ctx.fill();

    const img = artworkImgRef.current;
    if (img) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(artX, artY, artSize, artSize, 22);
      ctx.clip();
      ctx.drawImage(img, artX, artY, artSize, artSize);
      ctx.restore();
    }

    ctx.fillStyle = themeColors.ink;
    ctx.font = "700 36px sans-serif";
    ctx.fillText(track.title.slice(0, 32), artX + artSize + 28, artY + 46);

    ctx.fillStyle = themeColors.muted;
    ctx.font = "500 26px sans-serif";
    ctx.fillText(track.artist.slice(0, 38), artX + artSize + 28, artY + 88);

    ctx.fillStyle = themeColors.ink;
    const fontSize = aspect === "9:16" ? 54 : 46;
    ctx.font = `700 ${fontSize}px sans-serif`;
    const lineHeight = fontSize * 1.32;
    const maxW = cardW - innerPad * 2;
    const wrappedLines: string[] = [];
    for (const l of selectedLines) {
      wrappedLines.push(...wrapCanvasText(ctx, l, maxW));
    }

    const totalTextH = wrappedLines.length * lineHeight;
    let textY =
      cardY + Math.max(artSize + innerPad + 90, (cardH - totalTextH) / 2 + fontSize * 0.4);
    for (const line of wrappedLines) {
      ctx.fillText(line, cardX + innerPad, textY);
      textY += lineHeight;
    }

    ctx.fillStyle = themeColors.accent;
    ctx.font = "700 24px monospace";
    ctx.fillText("MELD WEB · RHMT OFC", cardX + innerPad, cardY + cardH - innerPad);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `meld-lyrics-${track.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify("Kartu lirik PNG berhasil diekspor", "success");
    }, "image/png");
  };

  const handleExportVideo = () => {
    if (recording) {
      stopRecording();
      notify("Perekaman video dibatalkan", "info");
      return;
    }

    const canvas = previewCanvasRef.current;
    if (!canvas || typeof canvas.captureStream !== "function" || typeof MediaRecorder === "undefined") {
      notify("Browser ini belum mendukung ekspor video Canvas MediaRecorder.", "error");
      return;
    }

    const mimeCandidates = [
      "video/mp4;codecs=avc1.42E01E",
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ];
    const mimeType = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || "";

    try {
      const stream = canvas.captureStream(30);
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: 4_500_000,
      });

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };

      recorder.onstop = () => {
        if (chunks.length > 0) {
          const ext = mimeType.includes("mp4") ? "mp4" : "webm";
          const blob = new Blob(chunks, { type: mimeType || "video/webm" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `meld-video-${track.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${durationSec}s.${ext}`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 2500);
          notify(`Video lirik ${durationSec} detik berhasil disimpan (.${ext})`, "success");
        }
        setRecording(false);
        setRecordProgress(0);
        setRecordElapsed(0);
      };

      recorderRef.current = recorder;
      recorder.start(250);
      setRecording(true);
      setRecordProgress(0);
      setRecordElapsed(0);

      const startedAt = Date.now();
      recordStartTimestampRef.current = startedAt;
      const totalMs = durationSec * 1000;

      recordIntervalRef.current = window.setInterval(() => {
        const elapsedMs = Date.now() - startedAt;
        const elapsedS = elapsedMs / 1000;
        setRecordElapsed(Math.min(durationSec, Math.floor(elapsedS)));
        setRecordProgress(Math.min(100, (elapsedMs / totalMs) * 100));
      }, 120);

      recordStopTimerRef.current = window.setTimeout(() => {
        if (recordIntervalRef.current !== null) {
          clearInterval(recordIntervalRef.current);
          recordIntervalRef.current = null;
        }
        if (recorder.state !== "inactive") {
          recorder.stop();
        }
      }, totalMs);
    } catch {
      notify("Gagal memulai perekam video di perangkat ini.", "error");
      setRecording(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Studio Kartu & Video Lirik"
      onClick={(e) => {
        if (e.target === e.currentTarget && !recording) onClose();
      }}
    >
      <div className="modal-card lyrics-studio-modal" style={{ maxWidth: 680 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FilmStrip size={22} weight="bold" style={{ color: "var(--accent)" }} />
            <div>
              <h2 style={{ fontSize: "var(--text-h2)" }}>Studio Video &amp; Kartu Lirik</h2>
              <p style={{ fontSize: "var(--text-caption)", color: "var(--ink-muted)" }}>
                Buat video animasi piringan CD, visualizer, salju, &amp; lirik dinamis atau ekspor PNG.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            disabled={recording}
            aria-label="Tutup studio lirik"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Switcher: Studio Video Lirik | Kartu PNG */}
        <div className="drawer-tabs" style={{ gridTemplateColumns: "repeat(2, 1fr)", marginBottom: 0 }}>
          <button
            type="button"
            className={`drawer-tab${mode === "video" ? " is-active" : ""}`}
            onClick={() => !recording && setMode("video")}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            <VideoCamera size={16} weight="bold" />
            <span>Studio Video Lirik</span>
          </button>
          <button
            type="button"
            className={`drawer-tab${mode === "card" ? " is-active" : ""}`}
            onClick={() => !recording && setMode("card")}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            <ImageSquare size={16} weight="bold" />
            <span>Kartu Kutipan PNG</span>
          </button>
        </div>

        {/* Stage Preview */}
        {mode === "video" ? (
          <div className="video-studio-preview-stage">
            <canvas
              ref={previewCanvasRef}
              className={`video-studio-canvas aspect-${aspect.replace(":", "-")}`}
            />
            {recording && (
              <div className="video-rec-overlay">
                <div className="video-rec-pill">
                  <span className="video-rec-dot" />
                  <span>
                    Merekam {recordElapsed}d / {durationSec}d ({Math.round(recordProgress)}%)
                  </span>
                </div>
                <div className="video-rec-bar">
                  <div className="video-rec-bar-fill" style={{ width: `${recordProgress}%` }} />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              padding: 20,
              borderRadius: "var(--radius-lg)",
              background: themeColors.bg,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: aspect === "9:16" ? 240 : 320,
                minHeight: aspect === "1:1" ? 250 : aspect === "4:5" ? 290 : 340,
                padding: 20,
                borderRadius: 20,
                background: themeColors.card,
                color: themeColors.ink,
                boxShadow: "var(--shadow-card)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Artwork
                  src={track.artwork}
                  alt=""
                  style={{ width: 42, height: 42, borderRadius: 10, objectFit: "cover", flexShrink: 0 }}
                  size={120}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {track.title}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: themeColors.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {track.artist}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, margin: "auto 0" }}>
                {selectedLines.map((line, i) => (
                  <p
                    key={i}
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: "1.08rem",
                      lineHeight: 1.28,
                      color: themeColors.ink,
                    }}
                  >
                    {line}
                  </p>
                ))}
              </div>

              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", fontWeight: 600, color: themeColors.accent }}>
                MELD WEB · RHMT OFC
              </div>
            </div>
          </div>
        )}

        {/* Controls Grid */}
        <div className="video-controls-stack">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: "var(--text-caption)", color: "var(--ink-muted)", fontWeight: 600 }}>Rasio:</span>
              {(["9:16", "4:5", "1:1"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  disabled={recording}
                  className={`chip${aspect === r ? " is-active" : ""}`}
                  onClick={() => setAspect(r)}
                >
                  {r}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: "var(--text-caption)", color: "var(--ink-muted)", fontWeight: 600 }}>Tema:</span>
              {([
                { id: "obsidian", label: "Obsidian" },
                { id: "chroma", label: "Chroma" },
                { id: "paper", label: "Paper" },
              ] as const).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  disabled={recording}
                  className={`chip${cardTheme === t.id ? " is-active" : ""}`}
                  onClick={() => setCardTheme(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Video-Only FX & Duration Controls */}
          {mode === "video" && (
            <div className="video-fx-bar">
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <button
                  type="button"
                  disabled={recording}
                  className={`chip${spinDisc ? " is-active" : ""}`}
                  onClick={() => setSpinDisc((v) => !v)}
                >
                  <Disc size={14} weight="bold" />
                  <span>Piringan CD</span>
                </button>
                <button
                  type="button"
                  disabled={recording}
                  className={`chip${showVisualizer ? " is-active" : ""}`}
                  onClick={() => setShowVisualizer((v) => !v)}
                >
                  <Waveform size={14} weight="bold" />
                  <span>Visualizer</span>
                </button>
                <button
                  type="button"
                  disabled={recording}
                  className={`chip${grooveDJ ? " is-active" : ""}`}
                  onClick={() => setGrooveDJ((v) => !v)}
                >
                  <Sparkle size={14} weight="bold" />
                  <span>Groove DJ</span>
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--ink-muted)", fontWeight: 600 }}>Partikel:</span>
                {(
                  [
                    { id: "snow", label: "Salju", icon: <Snowflake size={13} /> },
                    { id: "embers", label: "Cahaya", icon: <Sparkle size={13} /> },
                    { id: "rain", label: "Hujan", icon: <CloudRain size={13} /> },
                    { id: "off", label: "Mati", icon: null },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={recording}
                    className={`chip${particlesMode === p.id ? " is-active" : ""}`}
                    onClick={() => setParticlesMode(p.id)}
                  >
                    {p.icon}
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>

              {/* Custom Duration: Preset Chips + Fine Range Slider (5s - 60s) */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", marginTop: 4, padding: "8px 10px", background: "var(--bg)", borderRadius: "var(--radius-sm)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontSize: "0.76rem", color: "var(--ink-muted)", fontWeight: 600 }}>Durasi Video:</span>
                    {[5, 10, 15, 20, 30, 60].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        disabled={recording}
                        className={`chip${durationSec === sec ? " is-active" : ""}`}
                        style={{ minHeight: 26, padding: "0 8px", fontSize: "0.72rem" }}
                        onClick={() => setDurationSec(sec)}
                      >
                        {sec}d
                      </button>
                    ))}
                  </div>

                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", fontWeight: 700, color: "var(--accent)" }}>
                    {durationSec} detik
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input
                    type="range"
                    min={5}
                    max={60}
                    step={1}
                    value={durationSec}
                    disabled={recording}
                    onChange={(e) => setDurationSec(Number(e.target.value))}
                    aria-label="Atur durasi video kustom"
                    style={{ flex: 1, accentColor: "var(--accent)", cursor: "pointer", height: 5 }}
                  />
                  <span style={{ fontSize: "0.72rem", color: "var(--ink-muted)" }}>5s - 60s</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Line Picker */}
        <div
          style={{
            maxHeight: 145,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            padding: 6,
            borderRadius: "var(--radius-md)",
            background: "var(--bg)",
          }}
        >
          {lines.length === 0 ? (
            <p style={{ fontSize: "0.82rem", color: "var(--ink-muted)", padding: 10, textAlign: "center" }}>
              Lirik tidak tersedia — judul lagu akan digunakan otomatis.
            </p>
          ) : (
            lines.map((line, idx) => {
              const active = selectedIndices.includes(idx);
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={recording}
                  onClick={() => toggleIndex(idx)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "7px 10px",
                    borderRadius: "var(--radius-xs)",
                    background: active ? "var(--surface-active)" : "transparent",
                    color: active ? "var(--accent)" : "var(--ink-secondary)",
                    fontWeight: active ? 600 : 500,
                    fontSize: "0.85rem",
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 6,
                      border: "1px solid var(--border-control)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      background: active ? "var(--accent)" : "transparent",
                      color: "var(--accent-ink)",
                    }}
                  >
                    {active && <Check size={12} weight="bold" />}
                  </span>
                  <span>{line}</span>
                </button>
              );
            })
          )}
        </div>

        {/* Export Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-secondary" onClick={handleCopyQuote} disabled={recording}>
            <Copy size={16} /> Salin Teks
          </button>

          <div style={{ display: "flex", gap: 8 }}>
            {mode === "card" ? (
              <button type="button" className="btn btn-primary" onClick={() => void handleExportPng()}>
                <DownloadSimple size={17} weight="bold" /> Ekspor PNG
              </button>
            ) : (
              <button
                type="button"
                className={recording ? "btn btn-secondary" : "btn btn-accent"}
                onClick={handleExportVideo}
              >
                {recording ? (
                  <>
                    <Stop size={17} weight="fill" /> Batal ({recordElapsed}d)
                  </>
                ) : (
                  <>
                    <FilmStrip size={17} weight="bold" /> Ekspor Video {durationSec}d
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
