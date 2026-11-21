import { useEffect, useState } from "react";
import { Check, Copy, DownloadSimple, X } from "@phosphor-icons/react";
import type { Track } from "../types/music";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { Artwork } from "./Artwork";

type CardAspect = "1:1" | "4:5" | "9:16";
type CardStyleTheme = "paper" | "obsidian" | "chroma";

interface LyricsShareModalProps {
  open: boolean;
  onClose: () => void;
  track: Track;
  lines: string[];
  initialIndex?: number;
}

const ASPECT_DIMENSIONS: Record<CardAspect, { w: number; h: number }> = {
  "1:1": { w: 1080, h: 1080 },
  "4:5": { w: 1080, h: 1350 },
  "9:16": { w: 1080, h: 1920 },
};

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/);
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

export function LyricsShareModal({
  open,
  onClose,
  track,
  lines,
  initialIndex = 0,
}: LyricsShareModalProps) {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [aspect, setAspect] = useState<CardAspect>("4:5");
  const [cardTheme, setCardTheme] = useState<CardStyleTheme>("paper");
  const { palette } = useTheme();
  const { notify } = useToast();

  useEffect(() => {
    if (!open) return;
    const start = Math.max(0, Math.min(lines.length - 1, initialIndex));
    const end = Math.min(lines.length, start + 2);
    const seed: number[] = [];
    for (let i = start; i < end; i++) seed.push(i);
    setSelectedIndices(seed);
  }, [open, lines.length, initialIndex]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const toggleIndex = (idx: number) => {
    setSelectedIndices((prev) => {
      if (prev.includes(idx)) {
        return prev.length > 1 ? prev.filter((x) => x !== idx) : prev;
      }
      if (prev.length >= 4) {
        return [...prev.slice(1), idx].sort((a, b) => a - b);
      }
      return [...prev, idx].sort((a, b) => a - b);
    });
  };

  const selectedLines = selectedIndices.map((i) => lines[i]).filter(Boolean);

  const themeColors =
    cardTheme === "paper"
      ? { bg: "#F6F4EF", card: "#FCFBF8", ink: "#16171B", muted: "#5A5C66", accent: palette.accentLight }
      : cardTheme === "obsidian"
        ? { bg: "#12151B", card: "#1A1E27", ink: "#F4F3EE", muted: "#A3A6B2", accent: palette.accentDark }
        : { bg: palette.dockBg, card: palette.dockSurface, ink: "#F7F5F0", muted: "#C2C5CE", accent: palette.accentDark };

  const handleCopyQuote = () => {
    const quote = `"${selectedLines.join("\n")}"\n— ${track.title} (${track.artist})`;
    navigator.clipboard?.writeText(quote).then(() => {
      notify("Lyrics quote copied to clipboard", "success");
    });
  };

  const handleExportPng = async () => {
    const dims = ASPECT_DIMENSIONS[aspect];
    const canvas = document.createElement("canvas");
    canvas.width = dims.w;
    canvas.height = dims.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background
    ctx.fillStyle = themeColors.bg;
    ctx.fillRect(0, 0, dims.w, dims.h);

    const grad = ctx.createRadialGradient(dims.w * 0.25, dims.h * 0.15, 20, dims.w * 0.25, dims.h * 0.15, dims.w * 0.85);
    grad.addColorStop(0, `${themeColors.accent}33`);
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, dims.w, dims.h);

    // Inner studio card
    const pad = 76;
    const cardX = pad;
    const cardY = pad;
    const cardW = dims.w - pad * 2;
    const cardH = dims.h - pad * 2;
    ctx.fillStyle = themeColors.card;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 48);
    ctx.fill();

    // Header: Artwork + Track Meta
    const innerPad = 68;
    const artSize = 112;
    const artX = cardX + innerPad;
    const artY = cardY + innerPad;
    ctx.fillStyle = themeColors.accent;
    ctx.beginPath();
    ctx.roundRect(artX, artY, artSize, artSize, 22);
    ctx.fill();

    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej();
        img.src = track.artwork;
      });
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(artX, artY, artSize, artSize, 22);
      ctx.clip();
      ctx.drawImage(img, artX, artY, artSize, artSize);
      ctx.restore();
    } catch {
      // fallback solid swatch already drawn
    }

    ctx.fillStyle = themeColors.ink;
    ctx.font = "700 36px sans-serif";
    ctx.fillText(track.title.slice(0, 32), artX + artSize + 28, artY + 46);

    ctx.fillStyle = themeColors.muted;
    ctx.font = "500 26px sans-serif";
    ctx.fillText(track.artist.slice(0, 38), artX + artSize + 28, artY + 88);

    // Lyrics body
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
    let textY = cardY + Math.max(artSize + innerPad + 90, (cardH - totalTextH) / 2 + fontSize * 0.4);
    for (const line of wrappedLines) {
      ctx.fillText(line, cardX + innerPad, textY);
      textY += lineHeight;
    }

    // Footer brand mark
    ctx.fillStyle = themeColors.accent;
    ctx.font = "700 24px monospace";
    ctx.fillText("MELD · OPEN MUSIC STUDIO", cardX + innerPad, cardY + cardH - innerPad);

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
      notify("Lyrics card exported as PNG", "success");
    }, "image/png");
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Share lyrics card studio"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card" style={{ maxWidth: 620 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: "var(--text-h2)" }}>Lyrics Card Studio</h2>
            <p style={{ fontSize: "var(--text-caption)", color: "var(--ink-muted)" }}>
              Pick 1 to 4 lyric lines, choose a studio finish, and export PNG.
            </p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close lyrics share studio">
            <X size={18} />
          </button>
        </div>

        {/* Live Card Preview */}
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
              maxWidth: aspect === "9:16" ? 260 : 340,
              minHeight: aspect === "1:1" ? 260 : aspect === "4:5" ? 310 : 360,
              padding: 22,
              borderRadius: 20,
              background: themeColors.card,
              color: themeColors.ink,
              boxShadow: "var(--shadow-card)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 18,
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
                    fontSize: "1.12rem",
                    lineHeight: 1.28,
                    color: themeColors.ink,
                  }}
                >
                  {line}
                </p>
              ))}
            </div>

            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", fontWeight: 600, color: themeColors.accent }}>
              MELD · OPEN MUSIC STUDIO
            </div>
          </div>
        </div>

        {/* Options */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: "var(--text-caption)", color: "var(--ink-muted)", fontWeight: 600 }}>Ratio:</span>
            {(["1:1", "4:5", "9:16"] as const).map((r) => (
              <button
                key={r}
                type="button"
                className={`mood-chip${aspect === r ? " is-active" : ""}`}
                style={{ minHeight: 34, padding: "0 12px", fontSize: "0.8rem" }}
                onClick={() => setAspect(r)}
              >
                {r}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: "var(--text-caption)", color: "var(--ink-muted)", fontWeight: 600 }}>Finish:</span>
            {([
              { id: "paper", label: "Paper" },
              { id: "obsidian", label: "Obsidian" },
              { id: "chroma", label: "Chroma" },
            ] as const).map((t) => (
              <button
                key={t.id}
                type="button"
                className={`mood-chip${cardTheme === t.id ? " is-active" : ""}`}
                style={{ minHeight: 34, padding: "0 12px", fontSize: "0.8rem" }}
                onClick={() => setCardTheme(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Line Picker */}
        <div style={{ maxHeight: 165, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4, padding: 6, borderRadius: "var(--radius-md)", background: "var(--bg)" }}>
          {lines.map((line, idx) => {
            const active = selectedIndices.includes(idx);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => toggleIndex(idx)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: "var(--radius-xs)",
                  background: active ? "var(--surface-active)" : "transparent",
                  color: active ? "var(--accent)" : "var(--ink-secondary)",
                  fontWeight: active ? 600 : 500,
                  fontSize: "0.88rem",
                  textAlign: "left",
                }}
              >
                <span style={{ width: 18, height: 18, borderRadius: 6, border: "1px solid var(--border-control)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: active ? "var(--accent)" : "transparent", color: "var(--accent-ink)" }}>
                  {active && <Check size={12} weight="bold" />}
                </span>
                <span>{line}</span>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button type="button" className="btn btn-secondary" onClick={handleCopyQuote}>
            <Copy size={17} /> Copy Quote
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void handleExportPng()}>
            <DownloadSimple size={17} weight="bold" /> Export PNG
          </button>
        </div>
      </div>
    </div>
  );
}
